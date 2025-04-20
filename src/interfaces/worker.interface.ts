import { ModuleMetadata, Type } from '@nestjs/common';
import {
    NativeConnectionOptions,
    RuntimeOptions,
    WorkerOptions as TemporalSdkWorkerOptions,
} from '@temporalio/worker';

/**
 * Worker module configuration options
 */
export interface TemporalWorkerOptions {
    /**
     * Connection configuration for Temporal server
     */
    connection: NativeConnectionOptions;

    /**
     * Temporal namespace
     * @default "default"
     */
    namespace: string;

    /**
     * Task queue to poll for workflow and activity tasks
     */
    taskQueue: string;

    /**
     * Path to the workflow modules
     * This should be the path to the compiled JavaScript files
     * @example "./dist/workflows"
     */
    workflowsPath: string;

    /**
     * Array of activity classes to register with the worker
     * These classes should be decorated with @Activity()
     */
    activityClasses?: Array<new (...args: any[]) => any>;

    /**
     * Runtime options for the worker
     */
    runtimeOptions?: RuntimeOptions;

    /**
     * Additional worker options
     */
    workerOptions?: TemporalSdkWorkerOptions;

    /**
     * Auto-start configuration
     */
    autoStart?: {
        /**
         * Whether to automatically start the worker on application bootstrap
         * @default true
         */
        enabled?: boolean;

        /**
         * Delay in milliseconds before starting the worker
         * @default 0
         */
        delayMs?: number;
    };

    /**
     * Whether to allow the application to start even if
     * the worker initialization fails
     * @default true
     */
    allowWorkerFailure?: boolean;

    /**
     * Worker monitoring configuration
     */
    monitoring?: {
        /**
         * How often to log worker statistics in milliseconds
         * Set to 0 to disable
         * @default 0
         */
        statsIntervalMs?: number;

        /**
         * Custom metrics configuration
         */
        metrics?: {
            /**
             * Whether to enable custom metrics
             * @default false
             */
            enabled?: boolean;

            /**
             * Prometheus exporter configuration
             */
            prometheus?: {
                /**
                 * Whether to use Prometheus
                 * @default false
                 */
                enabled?: boolean;

                /**
                 * Port to expose Prometheus metrics on
                 * @default 9464
                 */
                port?: number;
            };
        };
    };
}

/**
 * Factory interface for creating worker options
 */
export interface TemporalWorkerOptionsFactory {
    /**
     * Method to create worker options
     */
    createWorkerOptions(): Promise<TemporalWorkerOptions> | TemporalWorkerOptions;
}

/**
 * Async worker module configuration options
 */
export interface TemporalWorkerAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    /**
     * Existing provider to use
     */
    useExisting?: Type<TemporalWorkerOptionsFactory>;

    /**
     * Class to use as provider
     */
    useClass?: Type<TemporalWorkerOptionsFactory>;

    /**
     * Factory function to use
     */
    useFactory?: (...args: any[]) => Promise<TemporalWorkerOptions> | TemporalWorkerOptions;

    /**
     * Dependencies to inject into factory function
     */
    inject?: any[];
}
