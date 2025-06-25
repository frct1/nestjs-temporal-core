import 'reflect-metadata';
/**
 * NestJS Temporal Core - Complete Temporal.io Integration for NestJS
 *
 * Streamlined and simplified Temporal integration with:
 * - Auto-discovery of workflow controllers and activities
 * - Declarative scheduling with @Cron and @Interval decorators
 * - Comprehensive client and worker management
 * - Production-ready health monitoring and error handling
 */

// ==========================================
// Main Module and Service (to be created)
// ==========================================
// export { TemporalModule } from './temporal.module';
// export { TemporalService } from './temporal.service';

// ==========================================
// Client Components
// ==========================================
export { TemporalClientModule, TemporalClientService, TemporalScheduleService } from './client';

// ==========================================
// Worker Components
// ==========================================
export {
    TemporalWorkerModule,
    TemporalWorkerManagerService,
    TemporalMetadataAccessor,
} from './worker';

// ==========================================
// Discovery Services
// ==========================================
export { TemporalDiscoveryService, TemporalScheduleManagerService } from './discovery';

// ==========================================
// All Decorators
// ==========================================
export * from './decorators';

// ==========================================
// All Interfaces and Types
// ==========================================
export * from './interfaces';

// ==========================================
// Constants and Presets
// ==========================================
export {
    // Default values
    DEFAULT_NAMESPACE,
    DEFAULT_TASK_QUEUE,

    // Metadata keys
    TEMPORAL_ACTIVITY,
    TEMPORAL_ACTIVITY_METHOD,
    TEMPORAL_WORKFLOW_CONTROLLER,
    TEMPORAL_WORKFLOW_METHOD,
    TEMPORAL_SIGNAL_METHOD,
    TEMPORAL_QUERY_METHOD,
    TEMPORAL_SCHEDULED_WORKFLOW,

    // Injection tokens
    TEMPORAL_CLIENT,
    TEMPORAL_MODULE_OPTIONS,

    // Presets and expressions
    CRON_EXPRESSIONS,
    INTERVAL_EXPRESSIONS,
    WORKER_PRESETS,
    RETRY_POLICIES,
    TIMEOUTS,

    // Error messages
    ERRORS,
} from './constants';

// ==========================================
// Re-export Temporal SDK Types for Convenience
// ==========================================
export type { RetryPolicy, Duration, SearchAttributes } from '@temporalio/common';

export type { ScheduleOverlapPolicy, WorkflowHandle, Client } from '@temporalio/client';

export type { Worker } from '@temporalio/worker';
