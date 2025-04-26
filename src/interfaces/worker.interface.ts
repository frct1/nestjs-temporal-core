/**
 * Interfaces for the Temporal Worker module
 */
import { ModuleMetadata, Type } from '@nestjs/common';
import { RuntimeOptions, DataConverter } from '@temporalio/worker';
import { ConnectionOptions } from './base.interface';

/**
 * Worker module configuration options
 */
export interface TemporalWorkerOptions {
    /**
     * Connection configuration for Temporal server
     */
    connection: ConnectionOptions;

    /**
     * Temporal namespace
     * @default "default"
     */
    namespace?: string;

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
    activityClasses?: Array<Type<any>>;

    /**
     * Runtime options for the worker
     */
    runtimeOptions?: RuntimeOptions;

    /**
     * Whether to reuse a single V8 context for workflow sandboxes
     * Significantly improves performance and reduces memory usage
     * @default true
     */
    reuseV8Context?: boolean;

    /**
     * Maximum number of workflow task executions the worker can process concurrently
     * @default 40
     */
    maxConcurrentWorkflowTaskExecutions?: number;

    /**
     * Maximum number of activity tasks the worker can process concurrently
     * @default 100
     */
    maxConcurrentActivityTaskExecutions?: number;

    /**
     * Maximum number of local activity tasks the worker can process concurrently
     * @default 100
     */
    maxConcurrentLocalActivityExecutions?: number;

    /**
     * Maximum number of workflow tasks to poll concurrently
     * @default min(10, maxConcurrentWorkflowTaskExecutions)
     */
    maxConcurrentWorkflowTaskPolls?: number;

    /**
     * Maximum number of activity tasks to poll concurrently
     * @default min(10, maxConcurrentActivityTaskExecutions)
     */
    maxConcurrentActivityTaskPolls?: number;

    /**
     * The number of workflow instances to keep cached in memory
     * Higher values improve performance but increase memory usage
     */
    maxCachedWorkflows?: number;

    /**
     * Number of threads for executing workflow tasks
     * @default 1 if reuseV8Context is true, 2 otherwise
     */
    workflowThreadPoolSize?: number;

    /**
     * Debug mode for attaching debuggers to workflow instances
     * @default false
     */
    debugMode?: boolean;

    /**
     * Whether to show source code in stack traces
     * @default false
     */
    showStackTraceSources?: boolean;

    /**
     * Opt into worker versioning feature
     * @default false
     */
    useVersioning?: boolean;

    /**
     * Unique identifier for this worker's code
     * Required if useVersioning is true
     */
    buildId?: string;

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
     * Limits the number of Activities per second that this Worker will process
     * The Worker will not poll for new Activities if doing so might exceed this limit
     */
    maxActivitiesPerSecond?: number;

    /**
     * Sets the maximum number of activities per second the task queue will dispatch
     * Controlled server-side
     */
    maxTaskQueueActivitiesPerSecond?: number;

    /**
     * Custom data converter for serializing/deserializing workflow data
     */
    dataConverter?: DataConverter;

    /**
     * Maximum execution time of a single workflow task in milliseconds
     * @format number of milliseconds or ms-formatted string
     */
    workflowTaskTimeout?: string | number;

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
