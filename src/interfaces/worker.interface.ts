import { ActivityMethodHandler } from './discovery.interface';

/**
 * Activity metadata information
 */
export interface ActivityMetadata {
    name?: string;
    options?: Record<string, any>;
}

/**
 * Activity method metadata information
 */
export interface ActivityMethodMetadata {
    name: string;
    originalName: string;
    options?: Record<string, any>;
    handler: ActivityMethodHandler;
}

/**
 * Worker status information for monitoring
 */
export interface WorkerStatus {
    isInitialized: boolean;
    isRunning: boolean;
    isHealthy: boolean;
    taskQueue: string;
    namespace: string;
    workflowSource: 'bundle' | 'filesystem' | 'none';
    activitiesCount: number;
    lastError?: string;
    startedAt?: Date;
    uptime?: number;
}
