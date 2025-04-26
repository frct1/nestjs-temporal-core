/**
 * Interfaces for Temporal Workflow decorators
 */
import { RetryPolicy } from '@temporalio/common';

/**
 * Options for configuring Temporal Workflow classes
 */
export interface WorkflowOptions {
    /**
     * Workflow type name
     * If not provided, the class name will be used
     */
    name?: string;

    /**
     * Description of the workflow
     */
    description?: string;

    /**
     * Task queue for the workflow
     * Required
     */
    taskQueue: string;

    /**
     * Maximum workflow execution time
     * Format: string like '30m', '24h', '7d' or number in milliseconds
     */
    workflowExecutionTimeout?: string | number;

    /**
     * Workflow run timeout
     * Format: string like '30m', '24h' or number in milliseconds
     */
    workflowRunTimeout?: string | number;

    /**
     * Workflow task timeout
     * Format: string like '10s', '1m' or number in milliseconds
     */
    workflowTaskTimeout?: string | number;

    /**
     * Retry policy for workflow execution
     */
    retry?: RetryPolicy;

    /**
     * Cron schedule for recurring workflows (if applicable)
     * Format: standard cron expression
     */
    cronSchedule?: string;

    /**
     * Policy for workflow ID reuse
     * Controls what happens when trying to start a workflow with the same ID as a closed workflow
     */
    workflowIdReusePolicy?: 'ALLOW_DUPLICATE' | 'ALLOW_DUPLICATE_FAILED_ONLY' | 'REJECT_DUPLICATE';

    /**
     * Policy for workflow ID conflicts
     * Controls what happens when trying to start a workflow with the same ID as a running workflow
     */
    workflowIdConflictPolicy?: 'FAIL' | 'USE_EXISTING' | 'TERMINATE_EXISTING';
}

/**
 * Options for Workflow Method
 */
export interface WorkflowMethodOptions {
    /**
     * Name for the workflow method
     * If not provided, the method name will be used
     */
    name?: string;
}

/**
 * Options for Query Method
 */
export interface QueryMethodOptions {
    /**
     * Name for the query method
     * If not provided, the method name will be used
     */
    name?: string;
}

/**
 * Options for Signal Method
 */
export interface SignalMethodOptions {
    /**
     * Name for the signal method
     * If not provided, the method name will be used
     */
    name?: string;
}

/**
 * Options for Workflow Updates
 * Workflow updates are a way to invoke a workflow method while it's running
 * and receive a synchronous result.
 */
export interface UpdateMethodOptions {
    /**
     * Name for the update method
     * If not provided, the method name will be used
     */
    name?: string;

    /**
     * Validation function for update arguments
     */
    validator?: (...args: any[]) => void;
}
