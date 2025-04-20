import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, WorkflowClient, WorkflowHandle } from '@temporalio/client';
import { TEMPORAL_CLIENT } from '../constants';
import { StartWorkflowOptions } from 'src/interfaces';

@Injectable()
export class TemporalClientService implements OnModuleInit {
    private readonly logger = new Logger(TemporalClientService.name);
    private workflowClient: WorkflowClient | null = null;

    constructor(
        @Inject(TEMPORAL_CLIENT)
        private readonly client: Client | null,
    ) {
        if (this.client) {
            this.workflowClient = this.client.workflow;
        }
    }

    async onModuleInit() {
        if (!this.client) {
            this.logger.warn('Temporal client not initialized - some features may be unavailable');
        } else {
            this.logger.log('Temporal client initialized successfully');
        }
    }

    getWorkflowClient(): WorkflowClient | null {
        return this.workflowClient;
    }

    private ensureClientInitialized() {
        if (!this.workflowClient) {
            throw new Error('Temporal client not initialized');
        }
    }

    /**
     * Start a workflow execution
     *
     * @param workflowType Type of workflow to start
     * @param args Arguments to pass to the workflow
     * @param options Workflow configuration options
     */
    async startWorkflow<T, A extends any[]>(
        workflowType: string,
        args: A,
        options: StartWorkflowOptions,
    ): Promise<{
        result: Promise<T>;
        workflowId: string;
        firstExecutionRunId: string;
        handle: WorkflowHandle;
    }> {
        this.ensureClientInitialized();

        const {
            taskQueue,
            workflowId = `${workflowType}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            ...restOptions
        } = options;

        try {
            const handle = await this.workflowClient!.start(workflowType, {
                args,
                taskQueue,
                workflowId,
                ...restOptions,
            });

            return {
                result: handle.result() as Promise<T>,
                workflowId: handle.workflowId,
                firstExecutionRunId: handle.firstExecutionRunId,
                handle,
            };
        } catch (error) {
            this.logger.error(`Failed to start workflow '${workflowType}': ${error.message}`);
            throw new Error(`Failed to start workflow '${workflowType}': ${error.message}`);
        }
    }

    /**
     * Send a signal to a running workflow
     *
     * @param workflowId ID of the workflow to signal
     * @param signalName Name of the signal to send
     * @param args Arguments to pass with the signal
     */
    async signalWorkflow(workflowId: string, signalName: string, args: any[] = []): Promise<void> {
        this.ensureClientInitialized();

        try {
            const handle = await this.workflowClient!.getHandle(workflowId);
            await handle.signal(signalName, ...args);
        } catch (error) {
            this.logger.error(
                `Failed to send signal '${signalName}' to workflow ${workflowId}: ${error.message}`,
            );
            throw new Error(
                `Failed to send signal '${signalName}' to workflow ${workflowId}: ${error.message}`,
            );
        }
    }

    /**
     * Terminate a running workflow
     *
     * @param workflowId ID of the workflow to terminate
     * @param reason Reason for termination (optional)
     */
    async terminateWorkflow(workflowId: string, reason?: string): Promise<void> {
        this.ensureClientInitialized();

        try {
            const handle = await this.workflowClient!.getHandle(workflowId);
            await handle.terminate(reason);
        } catch (error) {
            this.logger.error(`Failed to terminate workflow ${workflowId}: ${error.message}`);
            throw new Error(`Failed to terminate workflow ${workflowId}: ${error.message}`);
        }
    }

    /**
     * Get a workflow handle for a running workflow
     *
     * @param workflowId ID of the workflow
     * @param runId Specific run ID (optional)
     */
    async getWorkflowHandle(workflowId: string, runId?: string): Promise<WorkflowHandle> {
        this.ensureClientInitialized();

        try {
            return await this.workflowClient!.getHandle(workflowId, runId);
        } catch (error) {
            this.logger.error(`Failed to get workflow handle for ${workflowId}: ${error.message}`);
            throw new Error(`Failed to get workflow handle for ${workflowId}: ${error.message}`);
        }
    }
}
