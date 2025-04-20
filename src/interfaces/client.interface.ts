import { ModuleMetadata, Type } from '@nestjs/common';
import { ConnectionOptions } from './base.interface';
import { RetryPolicy } from '@temporalio/client';
import {
    Duration,
    SearchAttributes,
    WorkflowIdConflictPolicy,
    WorkflowIdReusePolicy,
} from '@temporalio/common';

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

    /**
     * Auto-reconnect configuration
     */
    reconnect?: {
        /**
         * Whether to attempt reconnection if connection fails
         * @default true
         */
        enabled?: boolean;

        /**
         * Maximum number of reconnect attempts
         * @default 10
         */
        maxAttempts?: number;

        /**
         * Initial delay between reconnect attempts in ms
         * @default 1000
         */
        initialDelayMs?: number;

        /**
         * Maximum delay between reconnect attempts in ms
         * @default 10000
         */
        maxDelayMs?: number;

        /**
         * Backoff coefficient for reconnect attempts
         * @default 1.5
         */
        backoffCoefficient?: number;
    };
}

/**
 * Factory interface for creating client options
 */
export interface TemporalClientOptionsFactory {
    /**
     * Method to create client options
     */
    createClientOptions(): Promise<TemporalClientOptions> | TemporalClientOptions;
}

/**
 * Async client module configuration options
 */
export interface TemporalClientAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    /**
     * Existing provider to use
     */
    useExisting?: Type<TemporalClientOptionsFactory>;

    /**
     * Class to use as provider
     */
    useClass?: Type<TemporalClientOptionsFactory>;

    /**
     * Factory function to use
     */
    useFactory?: (...args: any[]) => Promise<TemporalClientOptions> | TemporalClientOptions;

    /**
     * Dependencies to inject into factory function
     */
    inject?: any[];
}

export interface StartWorkflowOptions {
    /**
     * Task queue to use for this workflow
     */
    taskQueue: string;

    /**
     * Custom workflow ID (optional)
     */
    workflowId?: string;

    /**
     * Signal to send to the workflow upon start (optional)
     */
    signal?: string;

    /**
     * Cron schedule for recurring workflows (optional)
     */
    cronSchedule?: string;

    /**
     * Retry policy for failed workflows
     */
    retry?: RetryPolicy;

    /**
     * Delay before starting the workflow (optional)
     */
    startDelay?: Duration;

    /**
     * Maximum workflow execution time
     */
    workflowExecutionTimeout?: Duration;

    /**
     * Maximum workflow task execution time
     */
    workflowTaskTimeout?: Duration;

    /**
     * Maximum workflow run time
     */
    workflowRunTimeout?: Duration;

    /**
     * Policy for workflow ID reuse
     */
    workflowIdReusePolicy?: WorkflowIdReusePolicy;

    /**
     * Policy for workflow ID conflicts
     */
    workflowIdConflictPolicy?: WorkflowIdConflictPolicy;

    /**
     * Search attributes for the workflow
     */
    searchAttributes?: SearchAttributes;

    /**
     * Whether to follow workflow runs
     */
    followRuns?: boolean;

    /**
     * Memo data for the workflow
     */
    memo?: Record<string, unknown>;
}
