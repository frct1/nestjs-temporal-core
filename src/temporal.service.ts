import { Injectable, OnModuleInit, Logger, Optional } from '@nestjs/common';
import { TemporalClientService } from './client/temporal-client.service';
import { TemporalScheduleService } from './client/temporal-schedule.service';
import { WorkerManager } from './worker/worker-manager.service';
import { WorkflowDiscoveryService } from './discovery/workflow-discovery.service';
import { ScheduleManagerService } from './discovery/schedule-manager.service';

/**
 * Enhanced unified service for interacting with Temporal
 * Now provides access to discovered workflow controllers and schedule management
 */
@Injectable()
export class TemporalService implements OnModuleInit {
    private readonly logger = new Logger(TemporalService.name);

    constructor(
        private readonly clientService: TemporalClientService,
        private readonly scheduleService: TemporalScheduleService,
        private readonly workflowDiscovery: WorkflowDiscoveryService,
        private readonly scheduleManager: ScheduleManagerService,
        @Optional() private readonly workerManager?: WorkerManager,
    ) {}

    async onModuleInit() {
        this.logger.log('Enhanced Temporal service initialized');

        const workflowControllers = this.workflowDiscovery.getWorkflowControllers();
        const scheduledWorkflows = this.workflowDiscovery.getScheduledWorkflows();

        this.logger.log(`Discovered ${workflowControllers.length} workflow controllers`);
        this.logger.log(`Found ${scheduledWorkflows.length} scheduled workflows`);

        if (this.workerManager) {
            this.logger.log('Worker manager is available');
        } else {
            this.logger.log('Worker manager is not available - running in client-only mode');
        }
    }

    /**
     * Get the Temporal client service
     * For starting workflows, signaling, querying, etc.
     */
    getClient(): TemporalClientService {
        return this.clientService;
    }

    /**
     * Get the Temporal schedule service
     * For managing scheduled workflows
     */
    getScheduleService(): TemporalScheduleService {
        return this.scheduleService;
    }

    /**
     * Get the schedule manager service
     * For managing discovered scheduled workflows
     */
    getScheduleManager(): ScheduleManagerService {
        return this.scheduleManager;
    }

    /**
     * Get the workflow discovery service
     * For accessing discovered workflow controllers
     */
    getWorkflowDiscovery(): WorkflowDiscoveryService {
        return this.workflowDiscovery;
    }

    /**
     * Get the worker manager if available
     * For controlling worker lifecycle
     */
    getWorkerManager(): WorkerManager | undefined {
        return this.workerManager;
    }

    /**
     * Check if worker functionality is available
     */
    hasWorker(): boolean {
        return !!this.workerManager;
    }

    /**
     * Start workflow with simplified options (type-safe with discovery)
     *
     * @param workflowType Name of the workflow type to start
     * @param args Arguments to pass to the workflow
     * @param taskQueue Task queue to use (optional, uses discovered default)
     * @param options Additional options (optional)
     * @returns Object containing workflow execution details
     *
     * @example
     * ```typescript
     * // Start a discovered workflow
     * const { workflowId, result } = await temporalService.startWorkflow(
     *   'processOrder', // Type-safe and validated against discovered workflows
     *   [orderId, customerId],
     *   'order-processing-queue', // Optional, uses controller's default
     *   { workflowId: `order-${orderId}` }
     * );
     * ```
     */
    async startWorkflow<T, A extends any[]>(
        workflowType: string,
        args: A,
        taskQueue?: string,
        options: {
            workflowId?: string;
            searchAttributes?: Record<string, unknown>;
            [key: string]: any;
        } = {},
    ) {
        // Get workflow method info for validation and defaults
        const workflowMethod = this.workflowDiscovery.getWorkflowMethod(workflowType);

        if (workflowMethod) {
            // Use discovered workflow configuration
            const mergedOptions = {
                ...workflowMethod.options,
                ...options,
            };

            // Use controller's task queue if not provided
            const workflowController = this.workflowDiscovery
                .getWorkflowControllers()
                .find((controller) =>
                    controller.methods.some((m) => m.workflowName === workflowType),
                );

            const finalTaskQueue =
                taskQueue || workflowController?.taskQueue || 'default-task-queue';

            return this.clientService.startWorkflow<T, A>(workflowType, args, {
                taskQueue: finalTaskQueue,
                ...mergedOptions,
            });
        }

        // Fallback to original behavior for non-discovered workflows
        return this.clientService.startWorkflow<T, A>(workflowType, args, {
            taskQueue: taskQueue || 'default-task-queue',
            ...options,
        });
    }

    /**
     * Get available workflow types from discovered controllers
     */
    getAvailableWorkflows(): string[] {
        return this.workflowDiscovery.getWorkflowNames();
    }

    /**
     * Get managed schedules
     */
    getManagedSchedules(): string[] {
        return this.scheduleManager.getManagedSchedules();
    }

    /**
     * Trigger a managed schedule
     */
    async triggerSchedule(scheduleId: string): Promise<void> {
        await this.scheduleManager.triggerSchedule(scheduleId);
    }

    /**
     * Pause a managed schedule
     */
    async pauseSchedule(scheduleId: string, note?: string): Promise<void> {
        await this.scheduleManager.pauseSchedule(scheduleId, note);
    }

    /**
     * Resume a managed schedule
     */
    async resumeSchedule(scheduleId: string, note?: string): Promise<void> {
        await this.scheduleManager.resumeSchedule(scheduleId, note);
    }
}
