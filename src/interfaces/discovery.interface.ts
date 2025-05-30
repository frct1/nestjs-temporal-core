/**
 * Interfaces for workflow discovery service
 */

/**
 * Common function type definitions for Temporal methods
 */
export type WorkflowMethodHandler = (...args: any[]) => any;
export type SignalMethodHandler = (...args: any[]) => void | Promise<void>;
export type QueryMethodHandler = (...args: any[]) => any;
export type ActivityMethodHandler = (...args: any[]) => any | Promise<any>;

/**
 * Information about discovered workflow controller
 */
export interface WorkflowControllerInfo {
    instance: any;
    metatype: any;
    taskQueue?: string;
    methods: WorkflowMethodInfo[];
    signals: SignalMethodInfo[];
    queries: QueryMethodInfo[];
    scheduledMethods: ScheduledMethodInfo[];
}

/**
 * Information about discovered workflow method
 */
export interface WorkflowMethodInfo {
    methodName: string;
    workflowName: string;
    options: any;
    handler: WorkflowMethodHandler;
}

/**
 * Information about discovered signal method
 */
export interface SignalMethodInfo {
    methodName: string;
    signalName: string;
    options: any;
    handler: SignalMethodHandler;
}

/**
 * Information about discovered query method
 */
export interface QueryMethodInfo {
    methodName: string;
    queryName: string;
    options: any;
    handler: QueryMethodHandler;
}

/**
 * Information about discovered scheduled method
 */
export interface ScheduledMethodInfo {
    methodName: string;
    workflowName: string;
    scheduleOptions: any;
    workflowOptions: any;
    handler: WorkflowMethodHandler;
    controllerInfo: WorkflowControllerInfo;
}

/**
 * Discovery statistics
 */
export interface DiscoveryStats {
    controllers: number;
    methods: number;
    scheduled: number;
    signals: number;
    queries: number;
}

/**
 * Schedule status tracking
 */
export interface ScheduleStatus {
    scheduleId: string;
    workflowName: string;
    isManaged: boolean;
    isActive: boolean;
    lastError?: string;
    createdAt: Date;
    lastUpdatedAt: Date;
}

/**
 * Schedule statistics
 */
export interface ScheduleStats {
    total: number;
    active: number;
    inactive: number;
    errors: number;
}
