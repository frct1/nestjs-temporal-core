import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
    TEMPORAL_QUERY_METHOD,
    TEMPORAL_SCHEDULED_WORKFLOW,
    TEMPORAL_SIGNAL_METHOD,
    TEMPORAL_WORKFLOW_CONTROLLER,
    TEMPORAL_WORKFLOW_METHOD,
} from 'src/constants';
import {
    DiscoveryStats,
    QueryMethodHandler,
    QueryMethodInfo,
    ScheduledMethodInfo,
    SignalMethodHandler,
    SignalMethodInfo,
    WorkflowControllerInfo,
    WorkflowMethodHandler,
    WorkflowMethodInfo,
} from 'src/interfaces';

/**
 * Streamlined Workflow Discovery Service
 * Auto-discovers workflow controllers and their methods using decorators
 */
@Injectable()
export class TemporalDiscoveryService implements OnModuleInit {
    private readonly logger = new Logger(TemporalDiscoveryService.name);

    // Efficient storage for discovered components
    private readonly controllers = new Map<string, WorkflowControllerInfo>();
    private readonly workflows = new Map<string, WorkflowMethodInfo>();
    private readonly scheduledWorkflows = new Map<string, ScheduledMethodInfo>();

    constructor(
        private readonly discoveryService: DiscoveryService,
        private readonly metadataScanner: MetadataScanner,
    ) {}

    async onModuleInit() {
        await this.discoverWorkflowControllers();
    }

    // ==========================================
    // Discovery Process
    // ==========================================

    /**
     * Main discovery process - finds all workflow controllers and their methods
     */
    private async discoverWorkflowControllers(): Promise<void> {
        const allWrappers = [
            ...this.discoveryService.getProviders(),
            ...this.discoveryService.getControllers(),
        ];

        for (const wrapper of allWrappers) {
            const controllerInfo = await this.processWrapper(wrapper);
            if (controllerInfo) {
                this.indexController(controllerInfo);
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

        // Check if it's a workflow controller
        const controllerOptions = Reflect.getMetadata(TEMPORAL_WORKFLOW_CONTROLLER, metatype);
        if (!controllerOptions) {
            return null;
        }

        this.logger.debug(`Discovered workflow controller: ${metatype.name}`);

        // Create controller info structure
        const controllerInfo: WorkflowControllerInfo = {
            instance,
            metatype,
            taskQueue: controllerOptions.taskQueue,
            methods: [],
            signals: [],
            queries: [],
            scheduledMethods: [],
        };

        // Discover all methods in the controller
        await this.discoverControllerMethods(controllerInfo);
        return controllerInfo;
    }

    /**
     * Discover all methods within a workflow controller
     */
    private async discoverControllerMethods(controllerInfo: WorkflowControllerInfo): Promise<void> {
        const { instance } = controllerInfo;
        const prototype = Object.getPrototypeOf(instance);

        // Get all method names
        const methodNames = this.metadataScanner
            .scanFromPrototype(instance, prototype, (methodName) =>
                methodName !== 'constructor' ? methodName : null,
            )
            .filter((methodName): methodName is string => Boolean(methodName));

        // Process each method
        for (const methodName of methodNames) {
            const method = prototype[methodName];
            if (!method || typeof method !== 'function') {
                continue;
            }

            this.categorizeMethod(controllerInfo, methodName, method);
        }
    }

    /**
     * Categorize a method based on its decorators
     */
    private categorizeMethod(
        controllerInfo: WorkflowControllerInfo,
        methodName: string,
        method: WorkflowMethodHandler,
    ): void {
        const boundMethod = method.bind(controllerInfo.instance);

        // Check for workflow methods
        const workflowMetadata = Reflect.getMetadata(TEMPORAL_WORKFLOW_METHOD, method);
        if (workflowMetadata) {
            const methodInfo = this.createWorkflowMethodInfo(
                methodName,
                workflowMetadata,
                boundMethod,
            );
            controllerInfo.methods.push(methodInfo);

            // Check if this method is also scheduled
            const scheduleMetadata = Reflect.getMetadata(TEMPORAL_SCHEDULED_WORKFLOW, method);
            if (scheduleMetadata) {
                const scheduledInfo = this.createScheduledMethodInfo(
                    methodInfo,
                    scheduleMetadata,
                    controllerInfo,
                );
                controllerInfo.scheduledMethods.push(scheduledInfo);
            }
        }

        // Check for signal methods
        const signalMetadata = Reflect.getMetadata(TEMPORAL_SIGNAL_METHOD, method);
        if (signalMetadata) {
            const signalInfo = this.createSignalMethodInfo(methodName, signalMetadata, boundMethod);
            controllerInfo.signals.push(signalInfo);
        }

        // Check for query methods
        const queryMetadata = Reflect.getMetadata(TEMPORAL_QUERY_METHOD, method);
        if (queryMetadata) {
            const queryInfo = this.createQueryMethodInfo(methodName, queryMetadata, boundMethod);
            controllerInfo.queries.push(queryInfo);
        }
    }

    // ==========================================
    // Method Info Creation
    // ==========================================

    /**
     * Create workflow method info object
     */
    private createWorkflowMethodInfo(
        methodName: string,
        metadata: any,
        boundMethod: WorkflowMethodHandler,
    ): WorkflowMethodInfo {
        return {
            methodName,
            workflowName: metadata.name || methodName,
            options: metadata,
            handler: boundMethod,
        };
    }

    /**
     * Create scheduled method info object
     */
    private createScheduledMethodInfo(
        methodInfo: WorkflowMethodInfo,
        scheduleMetadata: any,
        controllerInfo: WorkflowControllerInfo,
    ): ScheduledMethodInfo {
        return {
            methodName: methodInfo.methodName,
            workflowName: methodInfo.workflowName,
            scheduleOptions: scheduleMetadata,
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
        metadata: any,
        boundMethod: SignalMethodHandler,
    ): SignalMethodInfo {
        return {
            methodName,
            signalName: metadata.name || methodName,
            options: metadata,
            handler: boundMethod,
        };
    }

    /**
     * Create query method info object
     */
    private createQueryMethodInfo(
        methodName: string,
        metadata: any,
        boundMethod: QueryMethodHandler,
    ): QueryMethodInfo {
        return {
            methodName,
            queryName: metadata.name || methodName,
            options: metadata,
            handler: boundMethod,
        };
    }

    // ==========================================
    // Indexing and Storage
    // ==========================================

    /**
     * Index a controller and its methods for fast lookup
     */
    private indexController(controllerInfo: WorkflowControllerInfo): void {
        // Store controller by class name
        this.controllers.set(controllerInfo.metatype.name, controllerInfo);

        // Index workflow methods by workflow name
        for (const method of controllerInfo.methods) {
            this.workflows.set(method.workflowName, method);
        }

        // Index scheduled workflows by schedule ID
        for (const scheduled of controllerInfo.scheduledMethods) {
            this.scheduledWorkflows.set(scheduled.scheduleOptions.scheduleId, scheduled);
        }
    }

    /**
     * Log details for a specific controller
     */
    private logControllerDetails(controller: WorkflowControllerInfo): void {
        this.logger.debug(
            `Controller: ${controller.metatype.name} (taskQueue: ${controller.taskQueue || 'default'})`,
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

    // ==========================================
    // Public API Methods
    // ==========================================

    /**
     * Get all discovered workflow controllers
     */
    getWorkflowControllers(): WorkflowControllerInfo[] {
        return Array.from(this.controllers.values());
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
        return this.controllers.get(name);
    }

    /**
     * Get workflow method by workflow name
     */
    getWorkflowMethod(workflowName: string): WorkflowMethodInfo | undefined {
        return this.workflows.get(workflowName);
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
        return Array.from(this.workflows.keys());
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
        return this.workflows.has(workflowName);
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
        const controllers = this.controllers.size;
        const methods = Array.from(this.controllers.values()).reduce(
            (sum, controller) => sum + controller.methods.length,
            0,
        );
        const scheduled = this.scheduledWorkflows.size;
        const signals = Array.from(this.controllers.values()).reduce(
            (sum, controller) => sum + controller.signals.length,
            0,
        );
        const queries = Array.from(this.controllers.values()).reduce(
            (sum, controller) => sum + controller.queries.length,
            0,
        );

        return { controllers, methods, scheduled, signals, queries };
    }

    /**
     * Get health status for monitoring
     */
    getHealthStatus(): {
        status: 'healthy' | 'degraded';
        discoveredItems: DiscoveryStats;
        lastDiscovery: Date | null;
    } {
        const stats = this.getStats();
        const status = stats.controllers > 0 ? 'healthy' : 'degraded';

        return {
            status,
            discoveredItems: stats,
            lastDiscovery: new Date(), // In a real implementation, track when discovery was last run
        };
    }
}
