/**
 * Interfaces for the Temporal Client module
 */
import { ModuleMetadata, Type } from '@nestjs/common';
import { RetryPolicy, SearchAttributes } from '@temporalio/common';
import { Duration } from '@temporalio/common';
import { ConnectionOptions } from './base.interface';

/**
 * WorkflowId conflict policies for starting workflows
 */
export const WorkflowIdConflictPolicy = {
    /**
     * Do not start a new Workflow. Instead raise an error.
     */
    FAIL: 'FAIL',

    /**
     * Do not start a new Workflow. Instead return a Workflow Handle for the already Running Workflow.
     */
    USE_EXISTING: 'USE_EXISTING',

    /**
     * Start a new Workflow, terminating the current workflow if one is already running.
     */
    TERMINATE_EXISTING: 'TERMINATE_EXISTING',
};

export type WorkflowIdConflictPolicy =
    (typeof WorkflowIdConflictPolicy)[keyof typeof WorkflowIdConflictPolicy];

/**
 * WorkflowId reuse policies for starting workflows
 */
export const WorkflowIdReusePolicy = {
    /**
     * The Workflow can be started if the previous Workflow is in a Closed state.
     * @default
     */
    ALLOW_DUPLICATE: 'ALLOW_DUPLICATE',

    /**
     * The Workflow can be started if the previous Workflow is in a Closed state that is not Completed.
     */
    ALLOW_DUPLICATE_FAILED_ONLY: 'ALLOW_DUPLICATE_FAILED_ONLY',

    /**
     * The Workflow cannot be started.
     */
    REJECT_DUPLICATE: 'REJECT_DUPLICATE',
};

export type WorkflowIdReusePolicy =
    (typeof WorkflowIdReusePolicy)[keyof typeof WorkflowIdReusePolicy];

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
     * @deprecated Use typedSearchAttributes instead
     */
    searchAttributes?: SearchAttributes;

    /**
     * Typed search attributes for the workflow
     * This is a newer feature that may not be available in all SDK versions
     */
    typedSearchAttributes?: Record<string, unknown>;

    /**
     * Whether to follow workflow runs
     */
    followRuns?: boolean;

    /**
     * Memo data for the workflow
     */
    memo?: Record<string, unknown>;
}
