import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, ScheduleClient, ScheduleHandle, ScheduleOverlapPolicy } from '@temporalio/client';
import { TEMPORAL_CLIENT, ERRORS } from '../constants';
import { StringValue } from 'ms';

@Injectable()
export class TemporalScheduleService implements OnModuleInit {
    private readonly logger = new Logger(TemporalScheduleService.name);
    private scheduleClient: ScheduleClient | null = null;

    constructor(
        @Inject(TEMPORAL_CLIENT)
        private readonly client: Client | null,
    ) {}

    async onModuleInit(): Promise<void> {
        if (!this.client) {
            this.logger.warn(
                'Temporal client not initialized - schedule features will be unavailable',
            );
            return;
        }

        try {
            if (typeof this.client.schedule === 'undefined') {
                this.logger.warn('Schedule client not available in this Temporal SDK version');
                return;
            }

            this.scheduleClient = this.client.schedule;
            this.logger.log('Temporal schedule client initialized');
        } catch (error) {
            this.logger.error('Failed to initialize schedule client', error);
        }
    }

    /**
     * Create a cron-based scheduled workflow
     */
    async createCronWorkflow(
        scheduleId: string,
        workflowType: string,
        cronExpression: string,
        taskQueue: string,
        args: any[] = [],
        description?: string,
        timezone?: string,
    ): Promise<ScheduleHandle> {
        this.ensureClientInitialized();

        try {
            const scheduleSpec: any = {
                cronExpressions: [cronExpression],
                ...(timezone && { timeZone: timezone }),
            };

            const handle = await this.scheduleClient!.create({
                scheduleId,
                spec: scheduleSpec,
                action: {
                    type: 'startWorkflow',
                    workflowType,
                    taskQueue,
                    args,
                    workflowId: this.generateScheduledWorkflowId(scheduleId),
                },
                ...(description && { memo: { description } }),
            });

            this.logger.log(
                `Created cron schedule: ${scheduleId} -> ${workflowType} (${cronExpression})${
                    timezone ? ` in ${timezone}` : ''
                }`,
            );

            return handle;
        } catch (error) {
            const errorMsg = `Failed to create cron schedule '${scheduleId}': ${error.message}`;
            this.logger.error(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Create an interval-based scheduled workflow
     */
    async createIntervalWorkflow(
        scheduleId: string,
        workflowType: string,
        interval: StringValue | number,
        taskQueue: string,
        args: any[] = [],
        description?: string,
    ): Promise<ScheduleHandle> {
        this.ensureClientInitialized();

        try {
            const handle = await this.scheduleClient!.create({
                scheduleId,
                spec: {
                    intervals: [{ every: interval }],
                },
                action: {
                    type: 'startWorkflow',
                    workflowType,
                    taskQueue,
                    args,
                    workflowId: this.generateScheduledWorkflowId(scheduleId),
                },
                ...(description && { memo: { description } }),
            });

            this.logger.log(
                `Created interval schedule: ${scheduleId} -> ${workflowType} (${interval})`,
            );
            return handle;
        } catch (error) {
            const errorMsg = `Failed to create interval schedule '${scheduleId}': ${error.message}`;
            this.logger.error(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Pause a running schedule
     */
    async pauseSchedule(scheduleId: string, note?: string): Promise<void> {
        await this.executeScheduleOperation(scheduleId, 'pause', (handle) =>
            handle.pause(note || 'Paused via NestJS Temporal integration'),
        );
    }

    /**
     * Resume a paused schedule
     */
    async resumeSchedule(scheduleId: string, note?: string): Promise<void> {
        await this.executeScheduleOperation(scheduleId, 'resume', (handle) =>
            handle.unpause(note || 'Resumed via NestJS Temporal integration'),
        );
    }

    /**
     * Delete a schedule
     */
    async deleteSchedule(scheduleId: string): Promise<void> {
        await this.executeScheduleOperation(scheduleId, 'delete', (handle) => handle.delete());
    }

    /**
     * Trigger an immediate run of a scheduled workflow
     */
    async triggerNow(
        scheduleId: string,
        overlap: ScheduleOverlapPolicy = 'ALLOW_ALL',
    ): Promise<void> {
        await this.executeScheduleOperation(scheduleId, 'trigger', (handle) =>
            handle.trigger(overlap),
        );
    }

    /**
     * List all schedules with pagination
     */
    async listSchedules(pageSize = 100): Promise<any[]> {
        this.ensureClientInitialized();

        try {
            const schedules: any[] = [];
            for await (const schedule of this.scheduleClient!.list({ pageSize })) {
                schedules.push(schedule);
            }
            return schedules;
        } catch (error) {
            const errorMsg = `Failed to list schedules: ${error.message}`;
            this.logger.error(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Get detailed information about a specific schedule
     */
    async describeSchedule(scheduleId: string): Promise<any> {
        this.ensureClientInitialized();

        try {
            const handle = await this.scheduleClient!.getHandle(scheduleId);
            return await handle.describe();
        } catch (error) {
            const errorMsg = `Failed to describe schedule '${scheduleId}': ${error.message}`;
            this.logger.error(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Update a schedule's configuration
     */
    async updateSchedule(scheduleId: string, updateFn: (schedule: any) => any): Promise<void> {
        await this.executeScheduleOperation(scheduleId, 'update', (handle) =>
            handle.update(updateFn),
        );
    }

    /**
     * Get the Temporal Schedule client
     */
    getScheduleClient(): ScheduleClient | null {
        return this.scheduleClient;
    }

    /**
     * Execute a schedule operation with consistent error handling
     */
    private async executeScheduleOperation(
        scheduleId: string,
        operation: string,
        action: (handle: ScheduleHandle) => Promise<any>,
    ): Promise<void> {
        this.ensureClientInitialized();

        try {
            const handle = await this.scheduleClient!.getHandle(scheduleId);
            await action(handle);
            this.logger.log(`Successfully ${operation}d schedule: ${scheduleId}`);
        } catch (error) {
            const errorMsg = `Failed to ${operation} schedule '${scheduleId}': ${error.message}`;
            this.logger.error(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Ensure schedule client is initialized
     */
    private ensureClientInitialized(): void {
        if (!this.scheduleClient) {
            throw new Error(ERRORS.SCHEDULE_CLIENT_NOT_INITIALIZED);
        }
    }

    /**
     * Generate a unique workflow ID for scheduled workflows
     */
    private generateScheduledWorkflowId(scheduleId: string): string {
        return `${scheduleId}-${Date.now()}`;
    }
}
