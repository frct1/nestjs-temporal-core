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
    LOG_CATEGORIES,
} from '../constants';
import {
    WorkflowControllerInfo,
    WorkflowMethodInfo,
    SignalMethodInfo,
    QueryMethodInfo,
    ScheduledMethodInfo,
    DiscoveryStats,
    WorkflowMethodHandler,
    SignalMethodHandler,
    QueryMethodHandler,
} from '../interfaces';

/**
 * Enhanced service for discovering workflow controllers and their methods
 * Provides comprehensive discovery and management of Temporal workflow components
 */
@Injectable()
export class WorkflowDiscoveryService implements OnModuleInit {
    private readonly logger = new Logger(LOG_CATEGORIES.DISCOVERY);
    private readonly workflowControllers = new Map<string, WorkflowControllerInfo>();
    private readonly scheduledWorkflows = new Map<string, ScheduledMethodInfo>();
    private readonly workflowMethods = new Map<string, WorkflowMethodInfo>();

    constructor(
        private readonly discoveryService: DiscoveryService,
        private readonly metadataScanner: MetadataScanner,
    ) {}

    async onModuleInit() {
        await this.discoverWorkflowControllers();
        this.logDiscoveryResults();
    }

    /**
     * Discover all workflow controllers and their components
     */
    private async discoverWorkflowControllers(): Promise<void> {
        const allWrappers = [
            ...this.discoveryService.getProviders(),
            ...this.discoveryService.getControllers(),
        ];

        for (const wrapper of allWrappers) {
            const controllerInfo = await this.processWrapper(wrapper);
            if (controllerInfo) {
                this.workflowControllers.set(controllerInfo.metatype.name, controllerInfo);
                this.indexWorkflowMethods(controllerInfo);
                this.indexScheduledWorkflows(controllerInfo);
            }
        }
    }

    /**
     * Process a single wrapper to check if it's a workflow controller
     */
    private async processWrapper(wrapper: InstanceWrapper): Promise<WorkflowControllerInfo | null> {
        const { instance, metatype } = wrapper;

        if (!instance || !metatype) {
            return null;
        }

        const controllerOptions = Reflect.getMetadata(TEMPORAL_WORKFLOW_CONTROLLER, metatype);
        if (!controllerOptions) {
            return null;
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

        await this.discoverControllerMethods(controllerInfo);
        return controllerInfo;
    }

    /**
     * Discover all methods within a workflow controller
     */
    private async discoverControllerMethods(controllerInfo: WorkflowControllerInfo): Promise<void> {
        const { instance } = controllerInfo;
        const prototype = Object.getPrototypeOf(instance);

        const methodNames = this.metadataScanner
            .scanFromPrototype(instance, prototype, (methodName) =>
                methodName !== 'constructor' ? methodName : null,
            )
            .filter((methodName): methodName is string => Boolean(methodName));

        for (const methodName of methodNames) {
            const method = prototype[methodName];
            if (!method || typeof method !== 'function') {
                continue;
            }

            this.processMethod(controllerInfo, methodName, method);
        }
    }

    /**
     * Process individual method and categorize it
     */
    private processMethod(
        controllerInfo: WorkflowControllerInfo,
        methodName: string,
        method: WorkflowMethodHandler,
    ): void {
        const boundMethod = method.bind(controllerInfo.instance);

        // Check for workflow methods
        if (Reflect.getMetadata(TEMPORAL_WORKFLOW_METHOD, method)) {
            const methodInfo = this.createWorkflowMethodInfo(methodName, method, boundMethod);
            controllerInfo.methods.push(methodInfo);

            // Check if this method is also scheduled
            const scheduleOptions = Reflect.getMetadata(TEMPORAL_SCHEDULED_WORKFLOW, method);
            if (scheduleOptions) {
                const scheduledInfo = this.createScheduledMethodInfo(
                    methodInfo,
                    scheduleOptions,
                    controllerInfo,
                );
                controllerInfo.scheduledMethods.push(scheduledInfo);
            }
        }

        // Check for signal methods
        if (Reflect.getMetadata(TEMPORAL_SIGNAL_METHOD, method)) {
            const signalInfo = this.createSignalMethodInfo(methodName, method, boundMethod);
            controllerInfo.signals.push(signalInfo);
        }

        // Check for query methods
        if (Reflect.getMetadata(TEMPORAL_QUERY_METHOD, method)) {
            const queryInfo = this.createQueryMethodInfo(methodName, method, boundMethod);
            controllerInfo.queries.push(queryInfo);
        }
    }

    /**
     * Create workflow method info object
     */
    private createWorkflowMethodInfo(
        methodName: string,
        method: WorkflowMethodHandler,
        boundMethod: WorkflowMethodHandler,
    ): WorkflowMethodInfo {
        const options = Reflect.getMetadata(TEMPORAL_WORKFLOW_METHOD_OPTIONS, method) || {};
        return {
            methodName,
            workflowName: options.name || methodName,
            options,
            handler: boundMethod,
        };
    }

    /**
     * Create scheduled method info object
     */
    private createScheduledMethodInfo(
        methodInfo: WorkflowMethodInfo,
        scheduleOptions: any,
        controllerInfo: WorkflowControllerInfo,
    ): ScheduledMethodInfo {
        return {
            methodName: methodInfo.methodName,
            workflowName: methodInfo.workflowName,
            scheduleOptions,
            workflowOptions: methodInfo.options,
            handler: methodInfo.handler,
            controllerInfo,
        };
    }

    /**
     * Create signal method info object
     */
    private createSignalMethodInfo(
        methodName: string,
        method: SignalMethodHandler,
        boundMethod: SignalMethodHandler,
    ): SignalMethodInfo {
        const options = Reflect.getMetadata(TEMPORAL_SIGNAL_METHOD, method) || {};
        return {
            methodName,
            signalName: options.name || methodName,
            options,
            handler: boundMethod,
        };
    }

    /**
     * Create query method info object
     */
    private createQueryMethodInfo(
        methodName: string,
        method: QueryMethodHandler,
        boundMethod: QueryMethodHandler,
    ): QueryMethodInfo {
        const options = Reflect.getMetadata(TEMPORAL_QUERY_METHOD, method) || {};
        return {
            methodName,
            queryName: options.name || methodName,
            options,
            handler: boundMethod,
        };
    }

    /**
     * Index workflow methods for fast lookup
     */
    private indexWorkflowMethods(controllerInfo: WorkflowControllerInfo): void {
        for (const method of controllerInfo.methods) {
            this.workflowMethods.set(method.workflowName, method);
        }
    }

    /**
     * Index scheduled workflows for fast lookup
     */
    private indexScheduledWorkflows(controllerInfo: WorkflowControllerInfo): void {
        for (const scheduled of controllerInfo.scheduledMethods) {
            this.scheduledWorkflows.set(scheduled.scheduleOptions.scheduleId, scheduled);
        }
    }

    /**
     * Log comprehensive discovery results
     */
    private logDiscoveryResults(): void {
        const stats = this.getDiscoveryStats();

        this.logger.log(
            `Discovered ${stats.controllers} controllers with ${stats.methods} workflow methods`,
        );
        this.logger.log(
            `Found ${stats.scheduled} scheduled workflows, ${stats.signals} signals, ${stats.queries} queries`,
        );

        // Debug logging for each controller
        if (this.logger.localInstance) {
            this.workflowControllers.forEach((controller) => {
                this.logControllerDetails(controller);
            });
        }
    }

    /**
     * Log details for a specific controller
     */
    private logControllerDetails(controller: WorkflowControllerInfo): void {
        this.logger.debug(
            `Controller: ${controller.metatype.name} (taskQueue: ${controller.taskQueue || 'none'})`,
        );

        controller.methods.forEach((method) => {
            this.logger.debug(`  - Workflow: ${method.workflowName} (${method.methodName})`);
        });

        controller.scheduledMethods.forEach((scheduled) => {
            this.logger.debug(
                `  - Scheduled: ${scheduled.scheduleOptions.scheduleId} -> ${scheduled.workflowName}`,
            );
        });

        controller.signals.forEach((signal) => {
            this.logger.debug(`  - Signal: ${signal.signalName} (${signal.methodName})`);
        });

        controller.queries.forEach((query) => {
            this.logger.debug(`  - Query: ${query.queryName} (${query.methodName})`);
        });
    }

    /**
     * Get discovery statistics
     */
    private getDiscoveryStats(): DiscoveryStats {
        const controllers = this.workflowControllers.size;
        const methods = Array.from(this.workflowControllers.values()).reduce(
            (sum, controller) => sum + controller.methods.length,
            0,
        );
        const scheduled = this.scheduledWorkflows.size;
        const signals = Array.from(this.workflowControllers.values()).reduce(
            (sum, controller) => sum + controller.signals.length,
            0,
        );
        const queries = Array.from(this.workflowControllers.values()).reduce(
            (sum, controller) => sum + controller.queries.length,
            0,
        );

        return { controllers, methods, scheduled, signals, queries };
    }

    // ==========================================
    // Public API Methods
    // ==========================================

    /**
     * Get all discovered workflow controllers
     */
    getWorkflowControllers(): WorkflowControllerInfo[] {
        return Array.from(this.workflowControllers.values());
    }

    /**
     * Get all discovered scheduled workflows
     */
    getScheduledWorkflows(): ScheduledMethodInfo[] {
        return Array.from(this.scheduledWorkflows.values());
    }

    /**
     * Get workflow controller by name
     */
    getWorkflowController(name: string): WorkflowControllerInfo | undefined {
        return this.workflowControllers.get(name);
    }

    /**
     * Get workflow method by workflow name
     */
    getWorkflowMethod(workflowName: string): WorkflowMethodInfo | undefined {
        return this.workflowMethods.get(workflowName);
    }

    /**
     * Get scheduled workflow by schedule ID
     */
    getScheduledWorkflow(scheduleId: string): ScheduledMethodInfo | undefined {
        return this.scheduledWorkflows.get(scheduleId);
    }

    /**
     * Get all workflow names
     */
    getWorkflowNames(): string[] {
        return Array.from(this.workflowMethods.keys());
    }

    /**
     * Get all schedule IDs
     */
    getScheduleIds(): string[] {
        return Array.from(this.scheduledWorkflows.keys());
    }

    /**
     * Check if a workflow exists
     */
    hasWorkflow(workflowName: string): boolean {
        return this.workflowMethods.has(workflowName);
    }

    /**
     * Check if a schedule exists
     */
    hasSchedule(scheduleId: string): boolean {
        return this.scheduledWorkflows.has(scheduleId);
    }

    /**
     * Get discovery statistics
     */
    getStats(): DiscoveryStats {
        return this.getDiscoveryStats();
    }
}
