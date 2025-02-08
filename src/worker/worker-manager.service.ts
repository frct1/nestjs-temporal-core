import { Injectable, OnModuleInit, Inject, Type, Logger } from '@nestjs/common';
import { NativeConnection, Worker, Runtime } from '@temporalio/worker';
import { ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { TemporalWorkerOptions } from '../interfaces';
import { TEMPORAL_MODULE_OPTIONS } from '../constants';

@Injectable()
export class WorkerManager implements OnModuleInit {
  private worker: Worker | null = null;
  private connection: NativeConnection | null = null;
  private readonly logger = new Logger(WorkerManager.name);
  private isRunning = false;
  private isInitializing = false;
  private initializationError: Error | null = null;
  private shutdownPromise: Promise<void> | null = null;
  private workerRunPromise: Promise<void> | null = null;
  private isShuttingDown = false;

  constructor(
    @Inject(TEMPORAL_MODULE_OPTIONS)
    private readonly options: TemporalWorkerOptions,
    private readonly modulesContainer: ModulesContainer,
  ) {
    this.registerProcessShutdownHandlers();
  }

  private registerProcessShutdownHandlers(): void {
    ['SIGTERM', 'SIGINT'].forEach((signal) => {
      process.once(signal, async () => {
        this.logger.log(`Received ${signal} signal. Starting worker shutdown...`);
        await this.shutdown();
      });
    });

    // Handle process exit
    process.once('beforeExit', async () => {
      await this.shutdown();
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.initializeWorker();
    } catch (error) {
      this.logger.error('Worker initialization failed', { error: error.message });
      this.initializationError = error;
    }
  }

  private async shutdown(): Promise<void> {
    if (this.shutdownPromise || this.isShuttingDown) {
      return this.shutdownPromise || Promise.resolve();
    }

    this.isShuttingDown = true;
    this.shutdownPromise = this.doShutdown();

    try {
      await this.shutdownPromise;
    } finally {
      this.isShuttingDown = false;
      this.shutdownPromise = null;
    }
  }

  private async doShutdown(): Promise<void> {
    this.logger.log('Starting worker shutdown sequence');
    this.isRunning = false;

    try {
      if (this.worker) {
        this.logger.log('Shutting down worker...');
        await this.worker.shutdown();
        // Wait a brief moment to ensure worker has released connection
        await new Promise((resolve) => setTimeout(resolve, 100));
        this.worker = null;
      }

      // Only close connection after worker is fully shut down
      if (this.connection) {
        this.logger.log('Closing connection...');
        try {
          await this.connection.close();
        } catch (error) {
          // If connection is already closed or in process of closing, log and continue
          this.logger.warn('Connection close warning', { error: error.message });
        }
        this.connection = null;
      }

      this.logger.log('Shutdown sequence completed');
    } catch (error) {
      this.logger.error('Shutdown error', { error: error.message });
      // Even in case of error, null out references
      this.worker = null;
      this.connection = null;
      throw error;
    }
  }

  private findProviderByType<T>(type: Type<T>): InstanceWrapper | undefined {
    for (const [, module] of this.modulesContainer.entries()) {
      const provider = module.providers.get(type);
      if (provider) return provider;
    }
    return undefined;
  }

  private async handleActivities(): Promise<Record<string, (...args: any[]) => any>> {
    const activities: Record<string, (...args: any[]) => any> = {};

    if (!this.options.activityClasses?.length) {
      return activities;
    }

    for (const activityClass of this.options.activityClasses) {
      try {
        const provider = this.findProviderByType(activityClass);
        const instance = provider?.instance || new activityClass();

        if (!instance) {
          this.logger.warn(`Activity instance not found for class: ${activityClass.name}`);
          continue;
        }

        const prototype = Object.getPrototypeOf(instance);
        const methodNames = Object.getOwnPropertyNames(prototype).filter(
          (methodName) =>
            methodName !== 'constructor' && typeof instance[methodName] === 'function',
        );

        for (const methodName of methodNames) {
          activities[methodName] = instance[methodName].bind(instance);
        }

        this.logger.log(`Registered activities for ${activityClass.name}`);
      } catch (error) {
        this.logger.error(`Failed to register activities for ${activityClass.name}`, {
          error: error.message,
        });
      }
    }

    return activities;
  }

  private async initializeWorker(): Promise<void> {
    if (this.isRunning || this.isInitializing || this.isShuttingDown) {
      return;
    }

    this.isInitializing = true;
    let tempConnection: NativeConnection | null = null;

    try {
      if (this.options.runtimeOptions) {
        Runtime.install(this.options.runtimeOptions);
      }

      tempConnection = await NativeConnection.connect({
        address: this.options.connection.address,
        tls: this.options.connection.tls,
      });

      const activities = await this.handleActivities();

      const worker = await Worker.create({
        connection: tempConnection,
        namespace: this.options.namespace,
        taskQueue: this.options.taskQueue,
        workflowsPath: this.options.workflowsPath,
        activities,
        shutdownGraceTime: '10 seconds',
        ...(this.options.workerOptions || {}),
      });

      this.workerRunPromise = worker.run().catch((error) => {
        this.logger.error('Worker runtime error', { error: error.message });
        this.initializationError = error;
        this.isRunning = false;
      });

      this.connection = tempConnection;
      this.worker = worker;
      this.isRunning = true;

      this.logger.log('Worker initialized successfully');
    } catch (error) {
      if (tempConnection) {
        await tempConnection.close().catch((closeError) => {
          this.logger.error('Error closing temporary connection during initialization failure', {
            error: closeError.message,
          });
        });
      }
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async getStatus(): Promise<{
    isRunning: boolean;
    isInitializing: boolean;
    isShuttingDown: boolean;
    error: Error | null;
    taskQueue?: string;
    namespace?: string;
  }> {
    return {
      isRunning: this.isRunning,
      isInitializing: this.isInitializing,
      isShuttingDown: this.isShuttingDown,
      error: this.initializationError,
      taskQueue: this.options.taskQueue,
      namespace: this.options.namespace,
    };
  }
}
