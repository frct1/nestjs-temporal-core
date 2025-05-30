import 'reflect-metadata';
/**
 * NestJS Temporal Core - Complete Temporal.io Integration for NestJS
 */

// ==========================================
// Main Module and Service
// ==========================================
export { TemporalModule } from './temporal.module';
export { TemporalService } from './temporal.service';

// ==========================================
// Client Components
// ==========================================
export { TemporalClientModule } from './client';
export { TemporalClientService } from './client';
export { TemporalScheduleService } from './client';

// ==========================================
// Worker Components
// ==========================================
export { TemporalWorkerModule } from './worker';
export { WorkerManager } from './worker';
export { TemporalMetadataAccessor } from './worker';

// ==========================================
// Discovery Services
// ==========================================
export { WorkflowDiscoveryService } from './discovery';
export { ScheduleManagerService } from './discovery';

// ==========================================
// All Decorators
// ==========================================
export * from './decorators';

// ==========================================
// All Interfaces and Types
// ==========================================
export * from './interfaces';

// ==========================================
// Constants
// ==========================================
export {
    DEFAULT_NAMESPACE,
    DEFAULT_TASK_QUEUE,
    CRON_EXPRESSIONS,
    INTERVAL_EXPRESSIONS,
    WORKER_PRESETS,
    RETRY_POLICIES,
    TIMEOUTS,
    ERRORS,
} from './constants';

// ==========================================
// Re-export Temporal SDK Types
// ==========================================
export type { RetryPolicy, Duration, SearchAttributes } from '@temporalio/common';

export type { ScheduleOverlapPolicy, WorkflowHandle, Client } from '@temporalio/client';

export type { Worker } from '@temporalio/worker';
