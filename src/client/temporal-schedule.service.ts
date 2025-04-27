import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, ScheduleClient, ScheduleHandle, ScheduleOverlapPolicy } from '@temporalio/client';
import { TEMPORAL_CLIENT, ERRORS } from '../constants';

@Injectable()
export class TemporalScheduleService implements OnModuleInit {
    private readonly logger = new Logger(TemporalScheduleService.name);
    private scheduleClient: ScheduleClient | null = null;

    constructor(
        @Inject(TEMPORAL_CLIENT)
        private readonly client: Client | null,
    ) {
        if (this.client && this.client.schedule) {
            this.scheduleClient = this.client.schedule;
        }
    }

    async onModuleInit(): Promise<void> {
        if (this.client) {
            try {
                // Check if schedule client is available (might not be in older SDK versions)
                if (typeof this.client.schedule === 'undefined') {
                    this.logger.warn('Schedule client not available in this Temporal SDK version');
                    return;
                }

                this.scheduleClient = this.client.schedule;
                this.logger.log('Temporal schedule client initialized');
            } catch (error) {
                this.logger.error('Failed to initialize schedule client', error);
            }
        } else {
            this.logger.warn(
                'Temporal client not initialized - schedule features will be unavailable',
            );
        }
    }

    private ensureClientInitialized(): void {
        if (!this.scheduleClient) {
            throw new Error(ERRORS.SCHEDULE_CLIENT_NOT_INITIALIZED);
        }
    }

    /**
     * Create a workflow that runs on a cron schedule
     *
     * @param scheduleId Unique ID for the schedule
     * @param workflowType Type of workflow to run
     * @param cronExpression Cron expression (e.g. "0 0 * * *" for daily at midnight)
     * @param taskQueue Task queue for the workflow
     * @param args Arguments to pass to the workflow
     * @param description Optional description of the schedule
     * @returns Handle to the created schedule
     */
    async createCronWorkflow(
        scheduleId: string,
        workflowType: string,
        cronExpression: string,
        taskQueue: string,
        args: any[] = [],
        description?: string,
    ): Promise<ScheduleHandle> {
        this.ensureClientInitialized();

        try {
            const handle = await this.scheduleClient!.create({
                scheduleId,
                spec: {
                    cronExpressions: [cronExpression],
                },
                action: {
                    type: 'startWorkflow',
                    workflowType,
                    taskQueue,
                    args,
                    workflowId: `${scheduleId}-${Date.now()}`,
                },
                memo: description ? { description } : undefined,
            });

            this.logger.log(
                `Created cron workflow schedule: ${scheduleId} with expression: ${cronExpression}`,
            );
            return handle;
        } catch (error) {
            this.logger.error(`Failed to create schedule '${scheduleId}': ${error.message}`);
            throw new Error(`Failed to create schedule '${scheduleId}': ${error.message}`);
        }
    }

    /**
     * Create a workflow that runs at regular intervals
     *
     * @param scheduleId Unique ID for the schedule
     * @param workflowType Type of workflow to run
     * @param interval Interval specification (only one should be specified)
     * @param taskQueue Task queue for the workflow
     * @param args Arguments to pass to the workflow
     * @param description Optional description of the schedule
     * @returns Handle to the created schedule
     */
    async createIntervalWorkflow(
        scheduleId: string,
        workflowType: string,
        interval: { seconds?: number; minutes?: number; hours?: number; days?: number },
        taskQueue: string,
        args: any[] = [],
        description?: string,
    ): Promise<ScheduleHandle> {
        this.ensureClientInitialized();

        try {
            // Calculate total milliseconds
            const msPerSecond = 1000;
            const msPerMinute = 60 * msPerSecond;
            const msPerHour = 60 * msPerMinute;
            const msPerDay = 24 * msPerHour;

            let totalMs = 0;
            if (interval.days) totalMs += interval.days * msPerDay;
            if (interval.hours) totalMs += interval.hours * msPerHour;
            if (interval.minutes) totalMs += interval.minutes * msPerMinute;
            if (interval.seconds) totalMs += interval.seconds * msPerSecond;

            // Default to 1 minute if no interval specified
            if (totalMs === 0) totalMs = msPerMinute;

            const handle = await this.scheduleClient!.create({
                scheduleId,
                spec: {
                    intervals: [
                        {
                            every: totalMs,
                        },
                    ],
                },
                action: {
                    type: 'startWorkflow',
                    workflowType,
                    taskQueue,
                    args,
                    workflowId: `${scheduleId}-${Date.now()}`,
                },
                memo: description ? { description } : undefined,
            });

            this.logger.log(
                `Created interval workflow schedule: ${scheduleId} with interval: ${this.formatInterval(interval)}`,
            );
            return handle;
        } catch (error) {
            this.logger.error(`Failed to create schedule '${scheduleId}': ${error.message}`);
            throw new Error(`Failed to create schedule '${scheduleId}': ${error.message}`);
        }
    }

    /**
     * Get a handle to an existing schedule
     *
     * @param scheduleId ID of the schedule
     * @returns Schedule handle
     */
    async getSchedule(scheduleId: string): Promise<ScheduleHandle> {
        this.ensureClientInitialized();

        try {
            return this.scheduleClient!.getHandle(scheduleId);
        } catch (error) {
            this.logger.error(`Failed to get schedule '${scheduleId}': ${error.message}`);
            throw new Error(`Failed to get schedule '${scheduleId}': ${error.message}`);
        }
    }

    /**
     * Delete a schedule
     *
     * @param scheduleId ID of the schedule to delete
     */
    async deleteSchedule(scheduleId: string): Promise<void> {
        this.ensureClientInitialized();

        try {
            const handle = await this.scheduleClient!.getHandle(scheduleId);
            await handle.delete();
            this.logger.log(`Deleted schedule: ${scheduleId}`);
        } catch (error) {
            this.logger.error(`Failed to delete schedule '${scheduleId}': ${error.message}`);
            throw new Error(`Failed to delete schedule '${scheduleId}': ${error.message}`);
        }
    }

    /**
     * Pause a running schedule
     *
     * @param scheduleId ID of the schedule to pause
     * @param note Optional note explaining the pause reason
     */
    async pauseSchedule(scheduleId: string, note?: string): Promise<void> {
        this.ensureClientInitialized();

        try {
            const handle = await this.scheduleClient!.getHandle(scheduleId);
            await handle.pause(note || 'Paused via NestJS Temporal integration');
            this.logger.log(`Paused schedule: ${scheduleId}${note ? ` (${note})` : ''}`);
        } catch (error) {
            this.logger.error(`Failed to pause schedule '${scheduleId}': ${error.message}`);
            throw new Error(`Failed to pause schedule '${scheduleId}': ${error.message}`);
        }
    }

    /**
     * Unpause (resume) a paused schedule
     *
     * @param scheduleId ID of the schedule to unpause
     * @param note Optional note explaining why the schedule was resumed
     */
    async resumeSchedule(scheduleId: string, note?: string): Promise<void> {
        this.ensureClientInitialized();

        try {
            const handle = await this.scheduleClient!.getHandle(scheduleId);
            await handle.unpause(note || 'Resumed via NestJS Temporal integration');
            this.logger.log(`Resumed schedule: ${scheduleId}`);
        } catch (error) {
            this.logger.error(`Failed to resume schedule '${scheduleId}': ${error.message}`);
            throw new Error(`Failed to resume schedule '${scheduleId}': ${error.message}`);
        }
    }

    /**
     * Trigger an immediate run of a scheduled workflow
     *
     * @param scheduleId ID of the schedule to trigger
     * @param overlap How to handle overlapping executions (default: ALLOW_ALL)
     */
    async triggerNow(
        scheduleId: string,
        overlap: ScheduleOverlapPolicy = 'ALLOW_ALL',
    ): Promise<void> {
        this.ensureClientInitialized();

        try {
            const handle = await this.scheduleClient!.getHandle(scheduleId);
            await handle.trigger(overlap);
            this.logger.log(`Triggered immediate run of schedule: ${scheduleId}`);
        } catch (error) {
            this.logger.error(`Failed to trigger schedule '${scheduleId}': ${error.message}`);
            throw new Error(`Failed to trigger schedule '${scheduleId}': ${error.message}`);
        }
    }

    /**
     * List all schedules
     *
     * @param pageSize Maximum number of schedules to return (default: 100)
     * @returns Array of schedule summaries
     */
    async listSchedules(pageSize = 100): Promise<any[]> {
        this.ensureClientInitialized();

        try {
            // Collect all schedules in an array
            const schedules: any[] = [];
            for await (const schedule of this.scheduleClient!.list({ pageSize })) {
                schedules.push(schedule);
            }
            return schedules;
        } catch (error) {
            this.logger.error(`Failed to list schedules: ${error.message}`);
            throw new Error(`Failed to list schedules: ${error.message}`);
        }
    }

    /**
     * Search for schedules matching a query
     *
     * @param query Query string to filter schedules
     * @param pageSize Maximum number of schedules to return per page
     * @returns Array of matching schedule summaries
     */
    async searchSchedules(query: string, pageSize = 100): Promise<any[]> {
        this.ensureClientInitialized();

        try {
            const schedules: any[] = [];
            for await (const schedule of this.scheduleClient!.list({ query, pageSize })) {
                schedules.push(schedule);
            }
            return schedules;
        } catch (error) {
            this.logger.error(`Failed to search schedules with query '${query}': ${error.message}`);
            throw new Error(`Failed to search schedules with query '${query}': ${error.message}`);
        }
    }

    /**
     * Backfill a schedule by running it for past time periods
     *
     * @param scheduleId ID of the schedule to backfill
     * @param startTime Start of the time range for backfill
     * @param endTime End of the time range for backfill
     * @param overlap How to handle overlapping executions (default: ALLOW_ALL)
     */
    async backfillSchedule(
        scheduleId: string,
        startTime: Date,
        endTime: Date,
        overlap: ScheduleOverlapPolicy = 'ALLOW_ALL',
    ): Promise<void> {
        this.ensureClientInitialized();

        try {
            const handle = await this.scheduleClient!.getHandle(scheduleId);
            await handle.backfill({
                start: startTime,
                end: endTime,
                overlap,
            });
            this.logger.log(
                `Backfilled schedule ${scheduleId} from ${startTime.toISOString()} to ${endTime.toISOString()}`,
            );
        } catch (error) {
            this.logger.error(`Failed to backfill schedule '${scheduleId}': ${error.message}`);
            throw new Error(`Failed to backfill schedule '${scheduleId}': ${error.message}`);
        }
    }

    /**
     * Get the Temporal Schedule client
     * @returns The schedule client
     */
    getScheduleClient(): ScheduleClient | null {
        return this.scheduleClient;
    }

    /**
     * Helper method to format interval for logging
     * @private
     */
    private formatInterval(interval: {
        seconds?: number;
        minutes?: number;
        hours?: number;
        days?: number;
    }): string {
        const parts = [];
        if (interval.days) parts.push(`${interval.days} day(s)`);
        if (interval.hours) parts.push(`${interval.hours} hour(s)`);
        if (interval.minutes) parts.push(`${interval.minutes} minute(s)`);
        if (interval.seconds) parts.push(`${interval.seconds} second(s)`);
        return parts.length > 0 ? parts.join(', ') : '1 minute (default)';
    }
}
