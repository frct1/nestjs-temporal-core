import { WorkflowIdReusePolicy, WorkflowIdConflictPolicy } from '../constants';

/**
 * Traditional workflow class configuration options
 */
export interface WorkflowOptions {
    /**
     * Workflow type name
     * If not provided, the class name will be used
     */
    name?: string;

    /**
     * Task queue for the workflow
     * Required
     */
    taskQueue: string;

    /**
     * Workflow timeout in milliseconds or formatted string (e.g. '30m')
     */
    timeout?: string | number;

    /**
     * Retry policy for workflow execution
     */
    retry?: {
        /**
         * Maximum number of retry attempts
         */
        maximumAttempts?: number;

        /**
         * Initial interval between retries
         */
        initialInterval?: string | number;
    };

    /**
     * Policy for workflow ID reuse
     */
    workflowIdReusePolicy?: WorkflowIdReusePolicy;

    /**
     * Policy for workflow ID conflicts
     */
    workflowIdConflictPolicy?: WorkflowIdConflictPolicy;
}

/**
 * Workflow method configuration options
 */
export interface WorkflowMethodOptions {
    /**
     * Name for the workflow method
     */
    name?: string;
}

/**
 * Workflow controller configuration options
 */
export interface WorkflowControllerOptions {
    /**
     * Task queue for workflows in this controller
     */
    taskQueue?: string;
}

/**
 * Enhanced workflow method options for controllers
 */
export interface EnhancedWorkflowMethodOptions {
    /**
     * Workflow name (defaults to method name)
     */
    name?: string;

    /**
     * Custom workflow ID generator
     */
    workflowId?: string | ((args: any[]) => string);

    /**
     * Workflow timeout
     */
    timeout?: string | number;

    /**
     * Retry policy
     */
    retry?: {
        maximumAttempts?: number;
        initialInterval?: string | number;
    };

    /**
     * Search attributes
     */
    searchAttributes?: Record<string, unknown>;

    /**
     * Workflow ID reuse policy
     */
    workflowIdReusePolicy?: 'ALLOW_DUPLICATE' | 'ALLOW_DUPLICATE_FAILED_ONLY' | 'REJECT_DUPLICATE';
}

/**
 * Signal method configuration options
 */
export interface SignalOptions {
    /**
     * Signal name (defaults to method name)
     */
    name?: string;
}

/**
 * Query method configuration options
 */
export interface QueryOptions {
    /**
     * Query name (defaults to method name)
     */
    name?: string;
}

/**
 * Workflow execution context information
 */
export interface WorkflowExecutionContext {
    /**
     * Workflow ID
     */
    workflowId: string;

    /**
     * Run ID
     */
    runId: string;

    /**
     * Workflow type
     */
    workflowType: string;

    /**
     * Task queue
     */
    taskQueue: string;

    /**
     * Namespace
     */
    namespace: string;
}

/**
 * Workflow starter configuration
 */
export interface WorkflowStarterOptions {
    /**
     * Workflow type to start
     */
    workflowType: string;

    /**
     * Task queue for the workflow
     */
    taskQueue: string;

    /**
     * Optional workflow ID generator
     */
    workflowId?: string | ((args: any[]) => string);

    /**
     * Default workflow options
     */
    defaultOptions?: {
        timeout?: string | number;
        retry?: {
            maximumAttempts?: number;
            initialInterval?: string | number;
        };
        searchAttributes?: Record<string, unknown>;
    };
}
