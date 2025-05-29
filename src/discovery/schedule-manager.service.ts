import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { TemporalScheduleService } from '../client/temporal-schedule.service';
import { WorkflowDiscoveryService, ScheduledMethodInfo } from './workflow-discovery.service';

/**
 * Manages scheduled workflows discovered through decorators
 */
@Injectable()
export class ScheduleManagerService implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(ScheduleManagerService.name);
    private managedSchedules = new Set<string>();

    constructor(
        private readonly workflowDiscovery: WorkflowDiscoveryService,
        private readonly scheduleService: TemporalScheduleService,
    ) {}

    async onApplicationBootstrap() {
        await this.setupScheduledWorkflows();
    }

    async onModuleDestroy() {
        // Usually you don't want to delete schedules on shutdown
        // In production, schedules should persist across deployments
        this.logger.log('Schedule manager shutting down');
    }

    /**
     * Set up all discovered scheduled workflows
     */
    private async setupScheduledWorkflows() {
        const scheduledWorkflows = this.workflowDiscovery.getScheduledWorkflows();

        if (scheduledWorkflows.length === 0) {
            this.logger.log('No scheduled workflows found');
            return;
        }

        this.logger.log(`Setting up ${scheduledWorkflows.length} scheduled workflows`);

        for (const scheduled of scheduledWorkflows) {
            await this.setupSchedule(scheduled);
        }
    }

    /**
     * Set up a single scheduled workflow
     */
    private async setupSchedule(scheduled: ScheduledMethodInfo) {
        const { scheduleOptions, workflowName } = scheduled;

        try {
            // Check if schedule already exists
            const existingSchedules = await this.scheduleService.listSchedules();
            const scheduleExists = existingSchedules.some(
                (s) => s.scheduleId === scheduleOptions.scheduleId,
            );

            if (scheduleExists) {
                this.logger.debug(
                    `Schedule ${scheduleOptions.scheduleId} already exists, skipping creation`,
                );
                this.managedSchedules.add(scheduleOptions.scheduleId);
                return;
            }

            // Skip if autoStart is disabled
            if (scheduleOptions.autoStart === false) {
                this.logger.debug(`Auto-start disabled for schedule ${scheduleOptions.scheduleId}`);
                return;
            }

            if (scheduleOptions.cron) {
                // Create cron-based schedule
                const taskQueue =
                    scheduleOptions.taskQueue || scheduled.controllerInfo.taskQueue || 'default';

                await this.scheduleService.createCronWorkflow(
                    scheduleOptions.scheduleId,
                    workflowName,
                    scheduleOptions.cron,
                    taskQueue,
                    [], // No args for now - could be enhanced
                    scheduleOptions.description,
                );

                this.managedSchedules.add(scheduleOptions.scheduleId);
                this.logger.log(
                    `Created cron schedule: ${scheduleOptions.scheduleId} -> ${workflowName} (${scheduleOptions.cron})`,
                );

                // Start paused if requested
                if (scheduleOptions.startPaused) {
                    await this.scheduleService.pauseSchedule(
                        scheduleOptions.scheduleId,
                        'Started in paused state',
                    );
                }
            } else if (scheduleOptions.interval) {
                // TODO: Create interval-based schedule
                // This would need to be implemented in TemporalScheduleService
                this.logger.warn(
                    `Interval-based schedules not yet implemented: ${scheduleOptions.scheduleId}`,
                );
            }
        } catch (error) {
            this.logger.error(`Failed to setup schedule ${scheduleOptions.scheduleId}:`, error);
        }
    }

    /**
     * Manually trigger a scheduled workflow
     */
    async triggerSchedule(scheduleId: string): Promise<void> {
        if (!this.managedSchedules.has(scheduleId)) {
            throw new Error(`Schedule ${scheduleId} is not managed by this service`);
        }

        await this.scheduleService.triggerNow(scheduleId);
        this.logger.log(`Triggered schedule: ${scheduleId}`);
    }

    /**
     * Pause a managed schedule
     */
    async pauseSchedule(scheduleId: string, note?: string): Promise<void> {
        if (!this.managedSchedules.has(scheduleId)) {
            throw new Error(`Schedule ${scheduleId} is not managed by this service`);
        }

        await this.scheduleService.pauseSchedule(scheduleId, note);
        this.logger.log(`Paused schedule: ${scheduleId}`);
    }

    /**
     * Resume a managed schedule
     */
    async resumeSchedule(scheduleId: string, note?: string): Promise<void> {
        if (!this.managedSchedules.has(scheduleId)) {
            throw new Error(`Schedule ${scheduleId} is not managed by this service`);
        }

        await this.scheduleService.resumeSchedule(scheduleId, note);
        this.logger.log(`Resumed schedule: ${scheduleId}`);
    }

    /**
     * Get all managed schedule IDs
     */
    getManagedSchedules(): string[] {
        return Array.from(this.managedSchedules);
    }

    /**
     * Check if a schedule is managed
     */
    isScheduleManaged(scheduleId: string): boolean {
        return this.managedSchedules.has(scheduleId);
    }
}
