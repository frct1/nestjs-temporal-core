import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { NativeConnection, Runtime, Worker } from '@temporalio/worker';
import { TEMPORAL_WORKER_MODULE_OPTIONS } from '../constants';
import { TemporalWorkerOptions } from '../interfaces';
import { TemporalMetadataAccessor } from './temporal-metadata.accessor';

@Injectable()
export class WorkerManager implements OnModuleInit, OnModuleDestroy, OnApplicationBootstrap {
  private readonly logger = new Logger(WorkerManager.name);
  private worker: Worker;
  private timerId: NodeJS.Timeout | null = null;

  constructor(
    @Inject(TEMPORAL_WORKER_MODULE_OPTIONS)
    private readonly options: TemporalWorkerOptions,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataAccessor: TemporalMetadataAccessor,
  ) {}

  async onModuleInit() {
    await this.explore();
  }

  onModuleDestroy() {
    if (this.worker) {
      this.worker.shutdown();
    }
    this.clearInterval();
  }

  onApplicationBootstrap() {
    this.timerId = setInterval(() => {
      if (this.worker) {
        this.worker.run().catch((error) => {
          this.logger.error('Error running worker', error);
        });
        this.clearInterval();
      }
    }, 1000);
  }

  private clearInterval() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private async explore() {
    try {
      if (!this.options.taskQueue) {
        this.logger.warn('No taskQueue configured, skipping worker initialization');
        return;
      }

      const activities = await this.handleActivities();

      if (this.options.runtimeOptions) {
        Runtime.install(this.options.runtimeOptions);
      }

      const connection = await NativeConnection.connect(this.options.connection);

      this.worker = await Worker.create({
        connection,
        namespace: this.options.namespace,
        taskQueue: this.options.taskQueue,
        workflowsPath: this.options.workflowsPath,
        activities,
        ...this.options.workerOptions,
      });

      this.logger.log(`Worker created for queue: ${this.options.taskQueue}`);
    } catch (error) {
      this.logger.error('Failed to initialize worker', error);
      throw error;
    }
  }

  private async handleActivities() {
    const activities: Record<string, (...args: any[]) => any> = {};
    const providers = this.discoveryService.getProviders();

    const activityProviders = providers.filter((wrapper) => {
      const { instance, metatype } = wrapper;
      const targetClass = instance?.constructor || metatype;
      return (
        targetClass &&
        this.options.activityClasses?.includes(targetClass) &&
        this.metadataAccessor.isActivity(targetClass)
      );
    });

    for (const wrapper of activityProviders) {
      const { instance } = wrapper;
      if (!instance) continue;

      const prototype = Object.getPrototypeOf(instance);
      const methods = Object.getOwnPropertyNames(prototype).filter(
        (prop) => prop !== 'constructor',
      );

      for (const methodName of methods) {
        const method = prototype[methodName];
        if (this.metadataAccessor.isActivityMethod(method)) {
          const activityName = this.metadataAccessor.getActivityMethodName(method) || methodName;
          activities[activityName] = method.bind(instance);
          this.logger.debug(`Registered activity method: ${activityName}`);
        }
      }
    }

    return activities;
  }

  async getStatus() {
    return {
      isRunning: !!this.worker,
      taskQueue: this.options.taskQueue,
      namespace: this.options.namespace,
    };
  }
}
