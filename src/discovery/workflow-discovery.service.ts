import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
    TEMPORAL_WORKFLOW_CONTROLLER,
    TEMPORAL_WORKFLOW_METHOD,
    TEMPORAL_SCHEDULED_WORKFLOW,
    TEMPORAL_SIGNAL_METHOD,
    TEMPORAL_QUERY_METHOD,
    TEMPORAL_WORKFLOW_METHOD_OPTIONS,
} from '../constants';

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
    handler: (...args: any[]) => any;
}

/**
 * Information about discovered signal method
 */
export interface SignalMethodInfo {
    methodName: string;
    signalName: string;
    options: any;
    handler: (...args: any[]) => any;
}

/**
 * Information about discovered query method
 */
export interface QueryMethodInfo {
    methodName: string;
    queryName: string;
    options: any;
    handler: (...args: any[]) => any;
}

/**
 * Information about discovered scheduled method
 */
export interface ScheduledMethodInfo {
    methodName: string;
    workflowName: string;
    scheduleOptions: any;
    workflowOptions: any;
    handler: (...args: any[]) => any;
    controllerInfo: WorkflowControllerInfo;
}

/**
 * Service for discovering workflow controllers and their methods
 */
@Injectable()
export class WorkflowDiscoveryService implements OnModuleInit {
    private readonly logger = new Logger(WorkflowDiscoveryService.name);
    private workflowControllers: WorkflowControllerInfo[] = [];
    private scheduledWorkflows: ScheduledMethodInfo[] = [];

    constructor(
        private readonly discoveryService: DiscoveryService,
        private readonly metadataScanner: MetadataScanner,
    ) {}

    async onModuleInit() {
        await this.discoverWorkflowControllers();
        this.logDiscoveryResults();
    }

    /**
     * Discover all workflow controllers
     */
    private async discoverWorkflowControllers() {
        const providers = this.discoveryService.getProviders();
        const controllers = this.discoveryService.getControllers();

        // Check both providers and controllers
        const allWrappers = [...providers, ...controllers];

        for (const wrapper of allWrappers) {
            await this.processWrapper(wrapper);
        }
    }

    /**
     * Process a single wrapper to check if it's a workflow controller
     */
    private async processWrapper(wrapper: InstanceWrapper) {
        const { instance, metatype } = wrapper;

        if (!instance || !metatype) {
            return;
        }

        // Check if this is a workflow controller
        const controllerOptions = Reflect.getMetadata(TEMPORAL_WORKFLOW_CONTROLLER, metatype);
        if (!controllerOptions) {
            return;
        }

        this.logger.debug(`Discovered workflow controller: ${metatype.name}`);

        const controllerInfo: WorkflowControllerInfo = {
            instance,
            metatype,
            taskQueue: controllerOptions.taskQueue,
            methods: [],
            signals: [],
            queries: [],
            scheduledMethods: [],
        };

        // Discover methods
        await this.discoverControllerMethods(controllerInfo);

        this.workflowControllers.push(controllerInfo);
    }

    /**
     * Discover methods within a workflow controller
     */
    private async discoverControllerMethods(controllerInfo: WorkflowControllerInfo) {
        const { instance } = controllerInfo;

        const methodNames = this.metadataScanner.scanFromPrototype(
            instance,
            Object.getPrototypeOf(instance),
            (methodName) => methodName,
        );

        for (const methodName of methodNames) {
            const method = instance[methodName];
            if (!method || typeof method !== 'function') {
                continue;
            }

            // Check for workflow methods
            if (Reflect.getMetadata(TEMPORAL_WORKFLOW_METHOD, method)) {
                const options = Reflect.getMetadata(TEMPORAL_WORKFLOW_METHOD_OPTIONS, method) || {};
                const methodInfo: WorkflowMethodInfo = {
                    methodName,
                    workflowName: options.name || methodName,
                    options,
                    handler: method.bind(instance),
                };
                controllerInfo.methods.push(methodInfo);

                // Check if this method is also scheduled
                if (Reflect.getMetadata(TEMPORAL_SCHEDULED_WORKFLOW, method)) {
                    const scheduleOptions = Reflect.getMetadata(
                        TEMPORAL_SCHEDULED_WORKFLOW,
                        method,
                    );
                    const scheduledInfo: ScheduledMethodInfo = {
                        methodName,
                        workflowName: options.name || methodName,
                        scheduleOptions,
                        workflowOptions: options,
                        handler: method.bind(instance),
                        controllerInfo,
                    };
                    controllerInfo.scheduledMethods.push(scheduledInfo);
                    this.scheduledWorkflows.push(scheduledInfo);
                }
            }

            // Check for signal methods
            if (Reflect.getMetadata(TEMPORAL_SIGNAL_METHOD, method)) {
                const options = Reflect.getMetadata(TEMPORAL_SIGNAL_METHOD, method) || {};
                const signalInfo: SignalMethodInfo = {
                    methodName,
                    signalName: options.name || methodName,
                    options,
                    handler: method.bind(instance),
                };
                controllerInfo.signals.push(signalInfo);
            }

            // Check for query methods
            if (Reflect.getMetadata(TEMPORAL_QUERY_METHOD, method)) {
                const options = Reflect.getMetadata(TEMPORAL_QUERY_METHOD, method) || {};
                const queryInfo: QueryMethodInfo = {
                    methodName,
                    queryName: options.name || methodName,
                    options,
                    handler: method.bind(instance),
                };
                controllerInfo.queries.push(queryInfo);
            }
        }
    }

    /**
     * Log discovery results
     */
    private logDiscoveryResults() {
        const controllerCount = this.workflowControllers.length;
        const methodCount = this.workflowControllers.reduce(
            (sum, controller) => sum + controller.methods.length,
            0,
        );
        const scheduledCount = this.scheduledWorkflows.length;

        this.logger.log(
            `Discovered ${controllerCount} workflow controllers with ${methodCount} methods`,
        );
        this.logger.log(`Found ${scheduledCount} scheduled workflows`);

        // Debug logging
        for (const controller of this.workflowControllers) {
            this.logger.debug(`Controller: ${controller.metatype.name}`);
            for (const method of controller.methods) {
                this.logger.debug(`  - Workflow: ${method.workflowName} (${method.methodName})`);
            }
            for (const scheduled of controller.scheduledMethods) {
                this.logger.debug(
                    `  - Scheduled: ${scheduled.scheduleOptions.scheduleId} -> ${scheduled.workflowName}`,
                );
            }
        }
    }

    /**
     * Get all discovered workflow controllers
     */
    getWorkflowControllers(): WorkflowControllerInfo[] {
        return this.workflowControllers;
    }

    /**
     * Get all discovered scheduled workflows
     */
    getScheduledWorkflows(): ScheduledMethodInfo[] {
        return this.scheduledWorkflows;
    }

    /**
     * Get workflow controller by name
     */
    getWorkflowController(name: string): WorkflowControllerInfo | undefined {
        return this.workflowControllers.find((controller) => controller.metatype.name === name);
    }

    /**
     * Get workflow method by workflow name
     */
    getWorkflowMethod(workflowName: string): WorkflowMethodInfo | undefined {
        for (const controller of this.workflowControllers) {
            const method = controller.methods.find((m) => m.workflowName === workflowName);
            if (method) {
                return method;
            }
        }
        return undefined;
    }

    /**
     * Get all workflow names
     */
    getWorkflowNames(): string[] {
        const names: string[] = [];
        for (const controller of this.workflowControllers) {
            for (const method of controller.methods) {
                names.push(method.workflowName);
            }
        }
        return names;
    }
}
