/**
 * Constants used throughout the NestJS Temporal integration
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
// Activity-related metadata keys (existing)
// ==========================================
export const TEMPORAL_ACTIVITY = 'TEMPORAL_ACTIVITY';
export const TEMPORAL_ACTIVITY_METHOD = 'TEMPORAL_ACTIVITY_METHOD';
export const TEMPORAL_ACTIVITY_METHOD_NAME = 'TEMPORAL_ACTIVITY_METHOD_NAME';
export const TEMPORAL_ACTIVITY_METHOD_OPTIONS = 'TEMPORAL_ACTIVITY_METHOD_OPTIONS';

// ==========================================
// Traditional workflow metadata keys (existing)
// ==========================================
export const TEMPORAL_WORKFLOW = 'TEMPORAL_WORKFLOW';
export const TEMPORAL_WORKFLOW_METHOD = 'TEMPORAL_WORKFLOW_METHOD';
export const TEMPORAL_WORKFLOW_METHOD_NAME = 'TEMPORAL_WORKFLOW_METHOD_NAME';
export const TEMPORAL_WORKFLOW_OPTIONS = 'TEMPORAL_WORKFLOW_OPTIONS';
export const TEMPORAL_WORKFLOW_METHOD_OPTIONS = 'TEMPORAL_WORKFLOW_METHOD_OPTIONS';

// ==========================================
// Signal and Query metadata keys (existing)
// ==========================================
export const TEMPORAL_SIGNAL_METHOD = 'TEMPORAL_SIGNAL_METHOD';
export const TEMPORAL_SIGNAL_NAME = 'TEMPORAL_SIGNAL_NAME';
export const TEMPORAL_QUERY_METHOD = 'TEMPORAL_QUERY_METHOD';
export const TEMPORAL_QUERY_NAME = 'TEMPORAL_QUERY_NAME';

// ==========================================
// NEW: Workflow Controller metadata keys
// ==========================================
export const TEMPORAL_WORKFLOW_CONTROLLER = 'TEMPORAL_WORKFLOW_CONTROLLER';

// ==========================================
// NEW: Scheduled workflow metadata keys
// ==========================================
export const TEMPORAL_SCHEDULED_WORKFLOW = 'TEMPORAL_SCHEDULED_WORKFLOW';

// ==========================================
// NEW: Workflow Starter metadata keys
// ==========================================
export const TEMPORAL_WORKFLOW_STARTER = 'TEMPORAL_WORKFLOW_STARTER';

// ==========================================
// Default values
// ==========================================
export const DEFAULT_NAMESPACE = 'default';
export const DEFAULT_TASK_QUEUE = 'default-task-queue';
export const DEFAULT_CONNECTION_TIMEOUT_MS = 5000;

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
    ACTIVITY_NOT_FOUND: 'Activity not found',
    WORKFLOW_NOT_FOUND: 'Workflow not found',
    SCHEDULE_CLIENT_NOT_INITIALIZED: 'Temporal schedule client not initialized',
    WORKFLOW_CONTROLLER_NOT_FOUND: 'Workflow controller not found',
    INVALID_SCHEDULE_OPTIONS: 'Invalid schedule options',
    DUPLICATE_WORKFLOW_NAME: 'Duplicate workflow name found',
    MISSING_SCHEDULE_ID: 'Schedule ID is required',
    INVALID_CRON_EXPRESSION: 'Invalid cron expression',
};

// ==========================================
// Common cron expressions
// ==========================================
export const CRON_EXPRESSIONS = {
    EVERY_MINUTE: '* * * * *',
    EVERY_5_MINUTES: '*/5 * * * *',
    EVERY_15_MINUTES: '*/15 * * * *',
    EVERY_30_MINUTES: '*/30 * * * *',
    EVERY_HOUR: '0 * * * *',
    EVERY_6_HOURS: '0 */6 * * *',
    EVERY_12_HOURS: '0 */12 * * *',
    DAILY: '0 0 * * *',
    DAILY_6AM: '0 6 * * *',
    DAILY_8AM: '0 8 * * *',
    DAILY_NOON: '0 12 * * *',
    WEEKLY_MONDAY_9AM: '0 9 * * 1',
    MONTHLY: '0 0 1 * *',
    YEARLY: '0 0 1 1 *',
} as const;

export enum WorkflowIdReusePolicy {
    ALLOW_DUPLICATE = 0,
    ALLOW_DUPLICATE_FAILED_ONLY = 1,
    REJECT_DUPLICATE = 2,
    TERMINATE_IF_RUNNING = 3,
}

export enum WorkflowIdConflictPolicy {
    REJECT_DUPLICATE = 'REJECT_DUPLICATE',
    TERMINATE_IF_RUNNING = 'TERMINATE_IF_RUNNING',
    ALLOW_DUPLICATE = 'ALLOW_DUPLICATE',
}
