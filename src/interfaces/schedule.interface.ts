/**
 * Interfaces for Temporal Schedule integration
 */
import { ModuleMetadata, Type } from '@nestjs/common';

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
