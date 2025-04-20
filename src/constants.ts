/**
 * Constants used throughout the NestJS Temporal integration
 *
 * These constants are used for metadata keys, injection tokens,
 * and other values that need to be consistent across the module.
 */

// ==========================================
// Module configuration and injection tokens
// ==========================================
export const TEMPORAL_MODULE_OPTIONS = 'TEMPORAL_MODULE_OPTIONS';
export const TEMPORAL_CLIENT_MODULE_OPTIONS = 'TEMPORAL_CLIENT_MODULE_OPTIONS';
export const TEMPORAL_WORKER_MODULE_OPTIONS = 'TEMPORAL_WORKER_MODULE_OPTIONS';
export const TEMPORAL_CLIENT = 'TEMPORAL_CLIENT';
export const TEMPORAL_CONNECTION = 'TEMPORAL_CONNECTION';

// ==========================================
// Activity-related metadata keys
// ==========================================
export const TEMPORAL_ACTIVITY = 'TEMPORAL_ACTIVITY';
export const TEMPORAL_ACTIVITY_METHOD = 'TEMPORAL_ACTIVITY_METHOD';
export const TEMPORAL_ACTIVITY_METHOD_NAME = 'TEMPORAL_ACTIVITY_METHOD_NAME';
export const TEMPORAL_ACTIVITY_METHOD_OPTIONS = 'TEMPORAL_ACTIVITY_METHOD_OPTIONS';
export const TEMPORAL_ACTIVITY_OPTIONS = 'TEMPORAL_ACTIVITY_OPTIONS';

// ==========================================
// Workflow-related metadata keys
// ==========================================
export const TEMPORAL_WORKFLOW = 'TEMPORAL_WORKFLOW';
export const TEMPORAL_WORKFLOW_METHOD = 'TEMPORAL_WORKFLOW_METHOD';
export const TEMPORAL_WORKFLOW_METHOD_NAME = 'TEMPORAL_WORKFLOW_METHOD_NAME';
export const TEMPORAL_WORKFLOW_OPTIONS = 'TEMPORAL_WORKFLOW_OPTIONS';

// ==========================================
// Signal-related metadata keys
// ==========================================
export const TEMPORAL_SIGNAL_METHOD = 'TEMPORAL_SIGNAL_METHOD';
export const TEMPORAL_SIGNAL_NAME = 'TEMPORAL_SIGNAL_NAME';

// ==========================================
// Query-related metadata keys
// ==========================================
export const TEMPORAL_QUERY_METHOD = 'TEMPORAL_QUERY_METHOD';
export const TEMPORAL_QUERY_NAME = 'TEMPORAL_QUERY_NAME';

// ==========================================
// Default values
// ==========================================
export const DEFAULT_NAMESPACE = 'default';
export const DEFAULT_TASK_QUEUE = 'default-task-queue';
export const DEFAULT_ACTIVITY_RETRY_ATTEMPTS = 3;
export const DEFAULT_CONNECTION_TIMEOUT_MS = 5000;
export const DEFAULT_WORKFLOW_ID_REUSE_POLICY = 'WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE';
export const DEFAULT_WORKFLOW_ID_CONFLICT_POLICY = 'WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE';

// ==========================================
// Worker configuration
// ==========================================
export const DEFAULT_WORKER_SHUTDOWN_GRACE_PERIOD_MS = 5000;
export const DEFAULT_MAX_CONCURRENT_ACTIVITIES = 100;
export const DEFAULT_MAX_CONCURRENT_WORKFLOW_TASKS = 100;
export const DEFAULT_WORKER_MONITORING_INTERVAL_MS = 60000; // 1 minute

// ==========================================
// Error messages
// ==========================================
export const ERRORS = {
    CLIENT_INITIALIZATION: 'Failed to initialize Temporal client',
    WORKER_INITIALIZATION: 'Failed to initialize Temporal worker',
    CLIENT_NOT_INITIALIZED: 'Temporal client not initialized',
    WORKER_NOT_INITIALIZED: 'Temporal worker not initialized',
    INVALID_OPTIONS: 'Invalid Temporal module options',
    MISSING_TASK_QUEUE: 'Task queue is required',
    MISSING_WORKFLOW_TYPE: 'Workflow type is required',
    MISSING_ACTIVITY_TYPE: 'Activity type is required',
    ACTIVITY_NOT_FOUND: 'Activity not found',
    WORKFLOW_NOT_FOUND: 'Workflow not found',
    INVALID_DECORATOR_USAGE: 'Invalid decorator usage',
    SCHEDULE_CLIENT_NOT_INITIALIZED: 'Temporal schedule client not initialized',
};
