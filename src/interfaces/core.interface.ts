import { ModuleMetadata, Type } from '@nestjs/common';

/**
 * Base connection configuration for Temporal server
 */
export interface ConnectionOptions {
    /**
     * Temporal server address
     * Format: "host:port"
     * @example "localhost:7233"
     */
    address: string;

    /**
     * TLS configuration (optional)
     * If true, use TLS with default settings
     * If object, use detailed TLS configuration
     */
    tls?:
        | boolean
        | {
              /**
               * Server name for SNI (optional)
               */
              serverName?: string;

              /**
               * Certificate and key files as Buffer (for client auth)
               */
              clientCertPair?: {
                  crt: Buffer;
                  key: Buffer;
                  ca?: Buffer;
              };
          };

    /**
     * API key for Temporal Cloud (if applicable)
     */
    apiKey?: string;

    /**
     * Optional HTTP headers to send with each request
     */
    metadata?: Record<string, string>;
}

/**
 * Client module configuration options
 */
export interface TemporalClientOptions {
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
     * Whether to allow the application to start even if
     * the Temporal connection fails
     * @default true
     */
    allowConnectionFailure?: boolean;
}

/**
 * Factory interface for creating client options
 */
export interface TemporalClientOptionsFactory {
    createClientOptions(): Promise<TemporalClientOptions> | TemporalClientOptions;
}

/**
 * Async client module configuration options
 */
export interface TemporalClientAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useExisting?: Type<TemporalClientOptionsFactory>;
    useClass?: Type<TemporalClientOptionsFactory>;
    useFactory?: (...args: any[]) => Promise<TemporalClientOptions> | TemporalClientOptions;
    inject?: any[];
}

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
    createWorkerOptions(): Promise<TemporalWorkerOptions> | TemporalWorkerOptions;
}

/**
 * Async worker module configuration options
 */
export interface TemporalWorkerAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useExisting?: Type<TemporalWorkerOptionsFactory>;
    useClass?: Type<TemporalWorkerOptionsFactory>;
    useFactory?: (...args: any[]) => Promise<TemporalWorkerOptions> | TemporalWorkerOptions;
    inject?: any[];
}

/**
 * Unified configuration options for Temporal integration
 */
export interface TemporalOptions {
    /**
     * Connection configuration
     */
    connection: {
        /**
         * Temporal server address
         * @example "localhost:7233"
         */
        address: string;

        /**
         * Temporal namespace
         * @default "default"
         */
        namespace?: string;

        /**
         * TLS configuration
         */
        tls?:
            | boolean
            | {
                  serverName?: string;
                  clientCertPair?: {
                      crt: Buffer;
                      key: Buffer;
                      ca?: Buffer;
                  };
              };

        /**
         * API key for Temporal Cloud
         */
        apiKey?: string;
    };

    /**
     * Task queue for workflows and activities
     * @default "default-task-queue"
     */
    taskQueue?: string;

    /**
     * Worker configuration (optional)
     * If not provided, only client functionality will be available
     */
    worker?: {
        /**
         * Path to workflow modules (for development)
         * @example "./dist/workflows"
         */
        workflowsPath?: string;

        /**
         * Pre-bundled workflow code (for production)
         */
        workflowBundle?: any;

        /**
         * Activity classes to register
         */
        activityClasses?: Array<Type<any>>;

        /**
         * Auto-start worker
         * @default true
         */
        autoStart?: boolean;

        /**
         * Advanced worker configuration options
         */
        workerOptions?: WorkerCreateOptions;
    };

    /**
     * Whether to register the module as global
     * @default false
     */
    isGlobal?: boolean;
}

/**
 * Factory interface for creating Temporal options
 */
export interface TemporalOptionsFactory {
    createTemporalOptions(): Promise<TemporalOptions> | TemporalOptions;
}

/**
 * Async configuration options for Temporal integration
 */
export interface TemporalAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useExisting?: Type<TemporalOptionsFactory>;
    useClass?: Type<TemporalOptionsFactory>;
    useFactory?: (...args: any[]) => Promise<TemporalOptions> | TemporalOptions;
    inject?: any[];
    isGlobal?: boolean;
}

/**
 * Options for starting a workflow
 */
export interface StartWorkflowOptions {
    /**
     * Task queue to use for this workflow
     */
    taskQueue: string;

    /**
     * Custom workflow ID (optional)
     * A unique ID will be generated if not provided
     */
    workflowId?: string;

    /**
     * Signal to send to the workflow upon start (optional)
     */
    signal?: {
        /**
         * Name of the signal to send
         */
        name: string;

        /**
         * Arguments to pass to the signal
         */
        args?: any[];
    };

    /**
     * Retry policy for failed workflows
     */
    retry?: {
        /**
         * Maximum number of retry attempts
         */
        maximumAttempts?: number;

        /**
         * Initial interval between retries in ms or formatted string (e.g. '1s')
         */
        initialInterval?: string | number;
    };

    /**
     * Search attributes for the workflow
     */
    searchAttributes?: Record<string, unknown>;

    /**
     * Additional workflow options passed directly to Temporal SDK
     */
    [key: string]: any;
}
