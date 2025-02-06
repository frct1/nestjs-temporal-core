import { Inject, Injectable, Logger } from '@nestjs/common';
import { Client, WorkflowClient, WorkflowHandle } from '@temporalio/client';
import { TEMPORAL_CLIENT } from './constants';

@Injectable()
export class TemporalClientService {
  private readonly logger = new Logger(TemporalClientService.name);
  private workflowClient: WorkflowClient;

  constructor(
    @Inject(TEMPORAL_CLIENT)
    private readonly client: Client,
  ) {
    this.workflowClient = this.client.workflow;
  }

  async onModuleInit() {
    this.logger.log('Temporal client service initialized');
  }

  getWorkflowClient(): WorkflowClient {
    return this.workflowClient;
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
    const {
      taskQueue,
      workflowId = `${workflowType}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    } = options;

    try {
      this.logger.log(`Starting workflow "${workflowType}" on task queue "${taskQueue}"`, {
        workflowId,
        taskQueue,
      });

      const handle = await this.workflowClient.start(workflowType, {
        args,
        taskQueue,
        workflowId,
      });

      this.logger.debug(`Workflow "${workflowType}" started successfully`, {
        workflowId: handle.workflowId,
        runId: handle.firstExecutionRunId,
      });

      return {
        result: handle.result() as Promise<T>,
        workflowId: handle.workflowId,
        firstExecutionRunId: handle.firstExecutionRunId,
        handle,
      };
    } catch (error) {
      this.logger.error(`Failed to start workflow "${workflowType}"`, {
        error: error.message,
        stack: error.stack,
        workflowId,
        taskQueue,
      });
      throw error;
    }
  }

  async signalWorkflow(workflowId: string, signalName: string, args: any[]): Promise<void> {
    try {
      this.logger.debug(`Sending signal "${signalName}" to workflow`, { workflowId });

      const handle = await this.workflowClient.getHandle(workflowId);
      await handle.signal(signalName, ...args);

      this.logger.debug(`Signal "${signalName}" sent successfully`, { workflowId });
    } catch (error) {
      this.logger.error(`Failed to send signal "${signalName}" to workflow`, {
        error: error.message,
        stack: error.stack,
        workflowId,
        args,
      });
      throw error;
    }
  }

  async terminateWorkflow(workflowId: string, reason?: string): Promise<void> {
    try {
      this.logger.log(`Terminating workflow`, { workflowId, reason });

      const handle = await this.workflowClient.getHandle(workflowId);
      await handle.terminate(reason);

      this.logger.debug(`Workflow terminated successfully`, { workflowId, reason });
    } catch (error) {
      this.logger.error(`Failed to terminate workflow`, {
        error: error.message,
        stack: error.stack,
        workflowId,
        reason,
      });
      throw error;
    }
  }

  async getWorkflowHandle(workflowId: string): Promise<WorkflowHandle> {
    try {
      return await this.workflowClient.getHandle(workflowId);
    } catch (error) {
      this.logger.error(`Failed to get workflow handle`, {
        error: error.message,
        stack: error.stack,
        workflowId,
      });
      throw error;
    }
  }
}
