import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { TemporalScheduleService } from '../client/temporal-schedule.service';
import { WorkflowDiscoveryService } from './workflow-discovery.service';
import { LOG_CATEGORIES } from '../constants';
import { ScheduledMethodInfo, ScheduleStatus, ScheduleStats } from '../interfaces';

/**
 * Enhanced service for managing scheduled workflows discovered through decorators
 * Provides comprehensive schedule lifecycle management with better error handling and monitoring
 */
@Injectable()
export class ScheduleManagerService implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(LOG_CATEGORIES.SCHEDULE);
    private readonly managedSchedules = new Map<string, ScheduleStatus>();
    private readonly setupPromises = new Map<string, Promise<void>>();

    constructor(
        private readonly workflowDiscovery: WorkflowDiscoveryService,
        private readonly scheduleService: TemporalScheduleService,
    ) {}

    async onApplicationBootstrap() {
        await this.setupScheduledWorkflows();
    }

    async onModuleDestroy() {
        this.logger.log('Schedule manager shutting down');
        // In production, schedules should persist across deployments
        // Only log the shutdown, don't delete schedules
    }

    /**
     * Set up all discovered scheduled workflows with enhanced error handling
     */
    private async setupScheduledWorkflows(): Promise<void> {
        const scheduledWorkflows = this.workflowDiscovery.getScheduledWorkflows();

        if (scheduledWorkflows.length === 0) {
            this.logger.log('No scheduled workflows found');
            return;
        }

        this.logger.log(`Setting up ${scheduledWorkflows.length} scheduled workflows`);

        // Process schedules concurrently with individual error handling
        const setupPromises = scheduledWorkflows.map((scheduled) =>
            this.setupScheduleWithErrorHandling(scheduled),
        );

        const results = await Promise.allSettled(setupPromises);
        this.logSetupResults(results, scheduledWorkflows);
    }

    /**
     * Set up a single scheduled workflow with comprehensive error handling
     */
    private async setupScheduleWithErrorHandling(scheduled: ScheduledMethodInfo): Promise<void> {
        const { scheduleOptions, workflowName } = scheduled;
        const scheduleId = scheduleOptions.scheduleId;

        // Prevent duplicate setup attempts
        if (this.setupPromises.has(scheduleId)) {
            await this.setupPromises.get(scheduleId);
            return;
        }

        const setupPromise = this.setupSchedule(scheduled);
        this.setupPromises.set(scheduleId, setupPromise);

        try {
            await setupPromise;
            this.updateScheduleStatus(scheduleId, workflowName, true, true);
        } catch (error) {
            this.updateScheduleStatus(scheduleId, workflowName, false, false, error.message);
            this.logger.error(`Failed to setup schedule ${scheduleId}: ${error.message}`);
        } finally {
            this.setupPromises.delete(scheduleId);
        }
    }

    /**
     * Set up a single scheduled workflow
     */
    private async setupSchedule(scheduled: ScheduledMethodInfo): Promise<void> {
        const { scheduleOptions, workflowName, controllerInfo } = scheduled;
        const scheduleId = scheduleOptions.scheduleId;

        // Check if auto-start is disabled
        if (scheduleOptions.autoStart === false) {
            this.logger.debug(`Auto-start disabled for schedule ${scheduleId}`);
            this.updateScheduleStatus(scheduleId, workflowName, true, false, 'Auto-start disabled');
            return;
        }

        // Check if schedule already exists
        if (await this.scheduleExists(scheduleId)) {
            this.logger.debug(`Schedule ${scheduleId} already exists, skipping creation`);
            this.updateScheduleStatus(scheduleId, workflowName, true, true, 'Already exists');
            return;
        }

        // Determine task queue
        const taskQueue = this.resolveTaskQueue(scheduleOptions, controllerInfo);

        // Create the appropriate schedule type
        if (scheduleOptions.cron) {
            await this.createCronSchedule(scheduled, taskQueue);
        } else if (scheduleOptions.interval) {
            await this.createIntervalSchedule(scheduled, taskQueue);
        } else {
            throw new Error('Schedule must have either cron or interval configuration');
        }

        // Handle initial pause state
        if (scheduleOptions.startPaused) {
            await this.scheduleService.pauseSchedule(scheduleId, 'Started in paused state');
            this.logger.debug(`Schedule ${scheduleId} created in paused state`);
        }
    }

    /**
     * Create a cron-based schedule
     */
    private async createCronSchedule(
        scheduled: ScheduledMethodInfo,
        taskQueue: string,
    ): Promise<void> {
        const { scheduleOptions, workflowName } = scheduled;

        await this.scheduleService.createCronWorkflow(
            scheduleOptions.scheduleId,
            workflowName,
            scheduleOptions.cron,
            taskQueue,
            [], // Arguments can be enhanced in future versions
            scheduleOptions.description,
            scheduleOptions.timezone,
        );

        this.logger.log(
            `Created cron schedule: ${scheduleOptions.scheduleId} -> ${workflowName} (${scheduleOptions.cron})`,
        );
    }

    /**
     * Create an interval-based schedule
     */
    private async createIntervalSchedule(
        scheduled: ScheduledMethodInfo,
        taskQueue: string,
    ): Promise<void> {
        const { scheduleOptions, workflowName } = scheduled;

        await this.scheduleService.createIntervalWorkflow(
            scheduleOptions.scheduleId,
            workflowName,
            scheduleOptions.interval,
            taskQueue,
            [], // Arguments can be enhanced in future versions
            scheduleOptions.description,
        );

        this.logger.log(
            `Created interval schedule: ${scheduleOptions.scheduleId} -> ${workflowName} (${scheduleOptions.interval})`,
        );
    }

    /**
     * Check if a schedule already exists
     */
    private async scheduleExists(scheduleId: string): Promise<boolean> {
        try {
            const existingSchedules = await this.scheduleService.listSchedules();
            return existingSchedules.some((s) => s.scheduleId === scheduleId);
        } catch (error) {
            this.logger.warn(`Failed to check existing schedules: ${error.message}`);
            return false;
        }
    }

    /**
     * Resolve the task queue for a schedule
     */
    private resolveTaskQueue(scheduleOptions: any, controllerInfo: any): string {
        return scheduleOptions.taskQueue || controllerInfo.taskQueue || 'default';
    }

    /**
     * Update schedule status tracking
     */
    private updateScheduleStatus(
        scheduleId: string,
        workflowName: string,
        isManaged: boolean,
        isActive: boolean,
        error?: string,
    ): void {
        const existing = this.managedSchedules.get(scheduleId);
        const now = new Date();

        this.managedSchedules.set(scheduleId, {
            scheduleId,
            workflowName,
            isManaged,
            isActive,
            lastError: error,
            createdAt: existing?.createdAt || now,
            lastUpdatedAt: now,
        });
    }

    /**
     * Log setup results with summary
     */
    private logSetupResults(
        results: PromiseSettledResult<void>[],
        scheduledWorkflows: ScheduledMethodInfo[],
    ): void {
        const successful = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;

        this.logger.log(
            `Schedule setup completed: ${successful} successful, ${failed} failed out of ${scheduledWorkflows.length} total`,
        );

        if (failed > 0) {
            this.logger.warn(`${failed} schedules failed to setup. Check logs for details.`);
        }
    }

    // ==========================================
    // Public API Methods
    // ==========================================

    /**
     * Manually trigger a scheduled workflow
     */
    async triggerSchedule(scheduleId: string): Promise<void> {
        this.ensureScheduleManaged(scheduleId);
        await this.scheduleService.triggerNow(scheduleId);
        this.logger.log(`Triggered schedule: ${scheduleId}`);
    }

    /**
     * Pause a managed schedule
     */
    async pauseSchedule(scheduleId: string, note?: string): Promise<void> {
        this.ensureScheduleManaged(scheduleId);
        await this.scheduleService.pauseSchedule(scheduleId, note);
        this.updateScheduleStatus(
            scheduleId,
            this.getScheduleWorkflowName(scheduleId),
            true,
            false,
        );
        this.logger.log(`Paused schedule: ${scheduleId}${note ? ` (${note})` : ''}`);
    }

    /**
     * Resume a managed schedule
     */
    async resumeSchedule(scheduleId: string, note?: string): Promise<void> {
        this.ensureScheduleManaged(scheduleId);
        await this.scheduleService.resumeSchedule(scheduleId, note);
        this.updateScheduleStatus(scheduleId, this.getScheduleWorkflowName(scheduleId), true, true);
        this.logger.log(`Resumed schedule: ${scheduleId}${note ? ` (${note})` : ''}`);
    }

    /**
     * Delete a managed schedule (use with caution)
     */
    async deleteSchedule(scheduleId: string): Promise<void> {
        this.ensureScheduleManaged(scheduleId);
        await this.scheduleService.deleteSchedule(scheduleId);
        this.managedSchedules.delete(scheduleId);
        this.logger.log(`Deleted schedule: ${scheduleId}`);
    }

    /**
     * Get all managed schedule IDs
     */
    getManagedSchedules(): string[] {
        return Array.from(this.managedSchedules.keys());
    }

    /**
     * Get detailed status of all managed schedules
     */
    getManagedScheduleStatuses(): ScheduleStatus[] {
        return Array.from(this.managedSchedules.values());
    }

    /**
     * Get status of a specific schedule
     */
    getScheduleStatus(scheduleId: string): ScheduleStatus | undefined {
        return this.managedSchedules.get(scheduleId);
    }

    /**
     * Check if a schedule is managed by this service
     */
    isScheduleManaged(scheduleId: string): boolean {
        return this.managedSchedules.has(scheduleId);
    }

    /**
     * Check if a managed schedule is currently active
     */
    isScheduleActive(scheduleId: string): boolean {
        const status = this.managedSchedules.get(scheduleId);
        return status?.isActive || false;
    }

    /**
     * Get count of managed schedules by status
     */
    getScheduleStats(): ScheduleStats {
        const statuses = Array.from(this.managedSchedules.values());
        return {
            total: statuses.length,
            active: statuses.filter((s) => s.isActive).length,
            inactive: statuses.filter((s) => !s.isActive).length,
            errors: statuses.filter((s) => s.lastError).length,
        };
    }

    /**
     * Retry failed schedule setups
     */
    async retryFailedSetups(): Promise<void> {
        const failedSchedules = this.workflowDiscovery
            .getScheduledWorkflows()
            .filter((scheduled) => {
                const status = this.managedSchedules.get(scheduled.scheduleOptions.scheduleId);
                return !status || !status.isManaged;
            });

        if (failedSchedules.length === 0) {
            this.logger.log('No failed schedules to retry');
            return;
        }

        this.logger.log(`Retrying ${failedSchedules.length} failed schedule setups`);

        for (const scheduled of failedSchedules) {
            await this.setupScheduleWithErrorHandling(scheduled);
        }
    }

    // ==========================================
    // Private Helper Methods
    // ==========================================

    /**
     * Ensure a schedule is managed by this service
     */
    private ensureScheduleManaged(scheduleId: string): void {
        if (!this.isScheduleManaged(scheduleId)) {
            throw new Error(`Schedule ${scheduleId} is not managed by this service`);
        }
    }

    /**
     * Get workflow name for a schedule ID
     */
    private getScheduleWorkflowName(scheduleId: string): string {
        const status = this.managedSchedules.get(scheduleId);
        return status?.workflowName || 'unknown';
    }
}
