/**
 * Main entry point for nestjs-temporal-core
 * This file re-exports all public APIs from the package
 */

// Export unified Temporal module
export * from './temporal.module';
export * from './temporal.service';

// Export client module components
export * from './client/temporal-client.module';
export * from './client/temporal-client.service';
export * from './client/temporal-schedule.service';

// Export worker module components
export * from './worker/temporal-worker.module';
export * from './worker/worker-manager.service';

// Export discovery services
export * from './discovery';

// Export all decorators
export * from './decorators';

// Export constants
export {
    // Default values
    DEFAULT_NAMESPACE,
    DEFAULT_TASK_QUEUE,

    // Cron expressions
    CRON_EXPRESSIONS,

    // Error constants
    ERRORS,
} from './constants';
