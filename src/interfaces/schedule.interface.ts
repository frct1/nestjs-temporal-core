/**
 * Interfaces for Temporal Schedule integration
 */
import { ModuleMetadata, Type } from '@nestjs/common';
import { ScheduleOverlapPolicy } from '@temporalio/client';

/**
 * Schedule module configuration options
 */
export interface TemporalScheduleOptions {
    /**
     * Namespace to use for schedules
     * @default "default"
     */
    namespace?: string;
}

/**
 * Factory interface for creating schedule options
 */
export interface TemporalScheduleOptionsFactory {
    /**
     * Method to create schedule options
     */
    createScheduleOptions(): Promise<TemporalScheduleOptions> | TemporalScheduleOptions;
}

/**
 * Async schedule module configuration options
 */
export interface TemporalScheduleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    /**
     * Existing provider to use
     */
    useExisting?: Type<TemporalScheduleOptionsFactory>;

    /**
     * Class to use as provider
     */
    useClass?: Type<TemporalScheduleOptionsFactory>;

    /**
     * Factory function to use
     */
    useFactory?: (...args: any[]) => Promise<TemporalScheduleOptions> | TemporalScheduleOptions;

    /**
     * Dependencies to inject into factory function
     */
    inject?: any[];
}

/**
 * Parameters to list schedules
 */
export interface ListSchedulesOptions {
    /**
     * Maximum number of results to return
     */
    pageSize?: number;

    /**
     * Filter schedules by a query string
     */
    query?: string;
}

/**
 * Schedule specification containing either cron expressions or intervals
 */
export interface ScheduleSpec {
    /**
     * Cron expressions defining when to run the workflow
     * @example ["0 0 * * *"] - Run daily at midnight
     */
    cronExpressions?: string[];

    /**
     * Time intervals defining when to run the workflow
     */
    intervals?: {
        /**
         * Every X time units
         */
        every: {
            /**
             * Number of seconds
             */
            seconds?: number;

            /**
             * Number of minutes
             */
            minutes?: number;

            /**
             * Number of hours
             */
            hours?: number;

            /**
             * Number of days
             */
            days?: number;
        };
    }[];
}

/**
 * Action to perform when a schedule triggers
 */
export interface ScheduleAction {
    /**
     * Type of workflow to start
     */
    workflowType: string;

    /**
     * Task queue for the workflow
     */
    taskQueue: string;

    /**
     * Arguments to pass to the workflow
     */
    args?: any[];

    /**
     * Optional memo for the schedule
     */
    memo?: Record<string, unknown>;
}

/**
 * Backfill options for schedules
 */
export interface BackfillOptions {
    /**
     * Start of the time range
     */
    startTime: Date;

    /**
     * End of the time range
     */
    endTime: Date;

    /**
     * How to handle overlapping executions
     * @default ScheduleOverlapPolicy.ALLOW_ALL
     */
    overlap?: ScheduleOverlapPolicy;
}
