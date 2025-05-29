/**
 * Workflow Controller interfaces
 * Contains all interfaces related to workflow controllers and execution
 */

// ==========================================
// Workflow Controller Options
// ==========================================

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
 * Enhanced workflow method options
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

// ==========================================
// Signal and Query Options
// ==========================================

/**
 * Signal method options for workflow controllers
 */
export interface SignalOptions {
    /**
     * Signal name (defaults to method name)
     */
    name?: string;
}

/**
 * Query method options for workflow controllers
 */
export interface QueryOptions {
    /**
     * Query name (defaults to method name)
     */
    name?: string;
}

// ==========================================
// Workflow Execution Context
// ==========================================

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

// ==========================================
// Workflow Starter Options
// ==========================================

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
