import { ModuleMetadata, Type } from '@nestjs/common';
import { ConnectionOptions } from './base.interface';

/**
 * Enhanced worker configuration options that map to Temporal Worker.create options
 */
export interface WorkerCreateOptions {
    /**
     * Maximum number of Activity tasks that will be concurrently executed by this Worker
     * @default 100
     */
    maxConcurrentActivityTaskExecutions?: number;

    /**
     * Maximum number of Workflow tasks that will be concurrently executed by this Worker
     * @default 40
     */
    maxConcurrentWorkflowTaskExecutions?: number;

    /**
     * Maximum number of Local Activity tasks that will be concurrently executed by this Worker
     * @default 100
     */
    maxConcurrentLocalActivityExecutions?: number;

    /**
     * Time to wait for sticky queue schedule to start timeout
     * @default '10s'
     */
    stickyQueueScheduleToStartTimeout?: string | number;

    /**
     * Maximum heartbeat throttle interval
     * @default '60s'
     */
    maxHeartbeatThrottleInterval?: string | number;

    /**
     * Default heartbeat throttle interval
     * @default '30s'
     */
    defaultHeartbeatThrottleInterval?: string | number;

    /**
     * Rate limiting: max activities per second
     */
    maxActivitiesPerSecond?: number;

    /**
     * Rate limiting: max activities per second for this task queue
     */
    maxTaskQueueActivitiesPerSecond?: number;

    /**
     * Whether to reuse V8 context between workflow executions
     * @default true
     */
    reuseV8Context?: boolean;

    /**
     * Interceptors for the worker
     */
    interceptors?: any[];

    /**
     * Identity of the worker. Used for task routing
     */
    identity?: string;

    /**
     * Build ID for workflow bundles
     */
    buildId?: string;

    /**
     * Whether to use versioning for workflow definitions
     */
    useVersioning?: boolean;

    /**
     * Additional worker options that will be passed directly to Worker.create
     */
    [key: string]: any;
}

/**
 * Worker module configuration options
 */
export interface TemporalWorkerOptions {
    /**
     * Connection configuration for Temporal server
     * If not provided, will use the same connection as the client
     */
    connection?: ConnectionOptions;

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
     * Path to the workflow modules (for development)
     * This should be the path to the compiled JavaScript files
     * @example "./dist/workflows"
     *
     * Note: Either workflowsPath OR workflowBundle should be provided, not both
     */
    workflowsPath?: string;

    /**
     * Pre-bundled workflow code (for production)
     * This is the preferred approach for production deployments
     *
     * @example
     * ```typescript
     * import * as workflowBundle from './workflows-bundle.js';
     *
     * // In your module configuration:
     * workflowBundle: workflowBundle
     * ```
     *
     * Note: Either workflowsPath OR workflowBundle should be provided, not both
     */
    workflowBundle?: any;

    /**
     * Array of activity classes to register with the worker
     * These classes should be decorated with @Activity()
     * If not provided, will auto-discover activities
     */
    activityClasses?: Array<Type<any>>;

    /**
     * Whether to automatically start the worker on application bootstrap
     * @default true
     */
    autoStart?: boolean;

    /**
     * Whether to allow the application to start even if
     * the worker initialization fails
     * @default true
     */
    allowWorkerFailure?: boolean;

    /**
     * Advanced worker configuration options
     * These options are passed directly to Temporal's Worker.create()
     */
    workerOptions?: WorkerCreateOptions;
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
