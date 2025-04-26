/**
 * Re-export all interfaces for easier imports
 *
 * This file centralizes all interface exports to provide
 * a clean public API for interface types.
 */

// Base connection interfaces
export * from './base.interface';

// Client module interfaces
export * from './client.interface';

// Worker module interfaces
export * from './worker.interface';

// Workflow-related interfaces
export * from './workflow.interface';

// Activity-related interfaces
export * from './activity.interface';

// Schedule-related interfaces
export * from './schedule.interface';

// Re-export key types from Temporal SDK for convenience
export {
    RetryPolicy,
    Duration,
    SearchAttributes,
    VersioningIntent,
    LogLevel,
} from '@temporalio/common';

export {
    ScheduleOverlapPolicy,
    WorkflowExecution,
    WorkflowHandle,
    Client,
    Connection,
    WorkflowClient,
} from '@temporalio/client';

export {
    Worker,
    NativeConnection,
    Runtime,
    RuntimeOptions,
    WorkerOptions as TemporalWorkerSDKOptions,
} from '@temporalio/worker';

export {
    Workflow,
    WorkflowInfo,
    ContinueAsNewOptions,
    ParentClosePolicy,
    ChildWorkflowOptions,
} from '@temporalio/workflow';

export {
    ActivityInterface,
    Context as ActivityContext,
    Info as ActivityInfo,
} from '@temporalio/activity';
