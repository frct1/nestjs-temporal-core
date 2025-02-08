import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, WorkflowClient, WorkflowHandle } from '@temporalio/client';
import { TEMPORAL_CLIENT } from '../constants';

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

  async startWorkflow<T, A extends any[]>(
    workflowType: string,
    args: A,
    options: {
      taskQueue: string;
      workflowId?: string;
      signal?: string;
    },
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
    } = options;

    try {
      const handle = await this.workflowClient!.start(workflowType, {
        args,
        taskQueue,
        workflowId,
      });

      return {
        result: handle.result() as Promise<T>,
        workflowId: handle.workflowId,
        firstExecutionRunId: handle.firstExecutionRunId,
        handle,
      };
    } catch (error) {
      throw new Error(`Failed to start workflow '${workflowType}': ${error.message}`);
    }
  }

  async signalWorkflow(workflowId: string, signalName: string, args: any[]): Promise<void> {
    this.ensureClientInitialized();

    try {
      const handle = await this.workflowClient!.getHandle(workflowId);
      await handle.signal(signalName, ...args);
    } catch (error) {
      throw new Error(
        `Failed to send signal '${signalName}' to workflow ${workflowId}: ${error.message}`,
      );
    }
  }

  async terminateWorkflow(workflowId: string, reason?: string): Promise<void> {
    this.ensureClientInitialized();

    try {
      const handle = await this.workflowClient!.getHandle(workflowId);
      await handle.terminate(reason);
    } catch (error) {
      throw new Error(`Failed to terminate workflow ${workflowId}: ${error.message}`);
    }
  }

  async getWorkflowHandle(workflowId: string): Promise<WorkflowHandle> {
    this.ensureClientInitialized();

    try {
      return await this.workflowClient!.getHandle(workflowId);
    } catch (error) {
      throw new Error(`Failed to get workflow handle for ${workflowId}: ${error.message}`);
    }
  }
}
