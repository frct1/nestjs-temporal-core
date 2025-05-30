/**
 * Re-export all interfaces for easier imports
 */

// Core connection, client and worker interfaces
export * from './core.interface';

// Workflow-related interfaces
export * from './workflow.interface';

// Activity-related interfaces
export * from './activity.interface';

// Scheduling interfaces
export * from './scheduling.interface';

// Discovery interfaces
export * from './discovery.interface';

// Worker interfaces
export * from './worker.interface';

// Re-export key types from Temporal SDK for convenience
export { RetryPolicy, Duration, SearchAttributes } from '@temporalio/common';
export { ScheduleOverlapPolicy, WorkflowHandle, Client } from '@temporalio/client';
export { Worker } from '@temporalio/worker';
