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
