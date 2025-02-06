import {
  DynamicModule,
  Logger,
  Module,
  Provider,
  OnModuleInit,
  OnApplicationShutdown,
  Inject,
  Injectable,
  Type,
} from '@nestjs/common';
import { NativeConnection, Worker, Runtime } from '@temporalio/worker';
import { DiscoveryService, MetadataScanner, ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  TemporalWorkerOptions,
  TemporalWorkerAsyncOptions,
  TemporalWorkerOptionsFactory,
} from './interfaces';
import { TEMPORAL_MODULE_OPTIONS } from './constants';
import { TemporalMetadataAccessor } from './temporal-metadata.accessor';

@Injectable()
class WorkerManager implements OnModuleInit, OnApplicationShutdown {
  private worker: Worker;
  private connection: NativeConnection;
  private readonly logger = new Logger('TemporalWorker');
  private isRunning = false;
  private isInitializing = false;
  private initializationError: Error | null = null;

  constructor(
    @Inject(TEMPORAL_MODULE_OPTIONS)
    private readonly options: TemporalWorkerOptions,
    private readonly modulesContainer: ModulesContainer,
  ) {}

  async onModuleInit(): Promise<void> {
    // Start initialization in the background
    this.initializeWorker().catch((error) => {
      this.logger.error('Failed to initialize worker:', error);
      this.initializationError = error;
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.shutdown();
  }

  private async shutdown(): Promise<void> {
    try {
      if (this.isRunning) {
        this.isRunning = false;

        if (this.worker) {
          this.logger.log('Shutting down worker...');
          await this.worker.shutdown();
          this.logger.log('Worker shutdown complete');
        }

        if (this.connection) {
          this.logger.log('Closing connection...');
          await this.connection.close();
          this.logger.log('Connection closed');
        }
      }
    } catch (error) {
      this.logger.error('Error during worker shutdown', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  private findProviderByType<T>(type: Type<T>): InstanceWrapper | undefined {
    for (const [, module] of this.modulesContainer.entries()) {
      const provider = module.providers.get(type);
      if (provider) {
        return provider;
      }
    }
    return undefined;
  }

  private async handleActivities() {
    const activitiesMethod: { [key: string]: (...args: any[]) => any } = {};

    // Handle activity classes specified in options
    if (this.options.activityClasses?.length) {
      this.logger.log(`Processing ${this.options.activityClasses.length} activity classes`);

      for (const activityClass of this.options.activityClasses) {
        const provider = this.findProviderByType(activityClass);

        if (!provider) {
          // If provider not found, instantiate the class directly
          const instance = new activityClass();
          this.logger.debug(`Created new instance of activity class: ${activityClass.name}`);

          // Scan the instance for activity methods
          const prototype = Object.getPrototypeOf(instance);
          for (const methodName of Object.getOwnPropertyNames(prototype)) {
            if (methodName !== 'constructor') {
              const method = instance[methodName];
              if (typeof method === 'function') {
                const name = methodName;
                this.logger.debug(
                  `Registering activity method: ${name} from ${activityClass.name}`,
                );
                activitiesMethod[name] = method.bind(instance);
              }
            }
          }
        } else {
          const { instance } = provider;
          if (!instance) {
            this.logger.warn(`No instance found for activity class: ${activityClass.name}`);
            continue;
          }

          this.logger.debug(`Found provider instance for activity class: ${activityClass.name}`);
          const prototype = Object.getPrototypeOf(instance);
          for (const methodName of Object.getOwnPropertyNames(prototype)) {
            if (methodName !== 'constructor') {
              const method = instance[methodName];
              if (typeof method === 'function') {
                const name = methodName;
                this.logger.debug(
                  `Registering activity method: ${name} from ${activityClass.name}`,
                );
                activitiesMethod[name] = method.bind(instance);
              }
            }
          }
        }
      }
    }

    const registeredMethods = Object.keys(activitiesMethod);
    if (registeredMethods.length === 0) {
      this.logger.warn('No activity methods were registered');
    } else {
      this.logger.log(
        `Successfully registered ${registeredMethods.length} activities: ${registeredMethods.join(
          ', ',
        )}`,
      );
    }

    return activitiesMethod;
  }

  private async initializeWorker(): Promise<void> {
    if (this.isRunning || this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      this.logger.log('Initializing Temporal worker', {
        namespace: this.options.namespace,
        taskQueue: this.options.taskQueue,
      });

      // Install runtime options if provided
      if (this.options.runtimeOptions) {
        this.logger.verbose('Configuring Temporal runtime');
        Runtime.install(this.options.runtimeOptions);
      }

      // Initialize connection
      this.logger.debug('Establishing connection', { address: this.options.connection.address });
      this.connection = await NativeConnection.connect({
        address: this.options.connection.address,
        tls: this.options.connection.tls,
      });

      const activities = await this.handleActivities();

      this.worker = await Worker.create({
        connection: this.connection,
        namespace: this.options.namespace,
        taskQueue: this.options.taskQueue,
        workflowsPath: this.options.workflowsPath,
        activities,
      });

      // Start worker.run() in the background
      this.worker.run().catch((error) => {
        this.logger.error('Worker runtime error', { error: error.message, stack: error.stack });
        this.initializationError = error;
        this.isRunning = false;
      });

      this.isRunning = true;
      this.logger.log('Temporal worker initialized successfully', {
        taskQueue: this.options.taskQueue,
        namespace: this.options.namespace,
      });
    } catch (error) {
      this.logger.error('Worker initialization failed', {
        error: error.message,
        stack: error.stack,
      });
      this.initializationError = error;
      await this.shutdown();
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  // Public methods for health checks
  async getStatus(): Promise<{
    isRunning: boolean;
    isInitializing: boolean;
    error: Error | null;
  }> {
    return {
      isRunning: this.isRunning,
      isInitializing: this.isInitializing,
      error: this.initializationError,
    };
  }
}

@Module({})
export class TemporalWorkerModule {
  private static readonly logger = new Logger(TemporalWorkerModule.name);

  static register(options: TemporalWorkerOptions): DynamicModule {
    this.logger.log('Registering Temporal Worker Module');

    return {
      global: true,
      module: TemporalWorkerModule,
      providers: [
        {
          provide: TEMPORAL_MODULE_OPTIONS,
          useValue: options,
        },
        ...(options.activityClasses || []).map((activity) => ({
          provide: activity,
          useClass: activity,
        })),
        TemporalMetadataAccessor,
        MetadataScanner,
        ModulesContainer,
        DiscoveryService,
        WorkerManager,
      ],
      exports: [WorkerManager],
    };
  }

  static registerAsync(options: TemporalWorkerAsyncOptions): DynamicModule {
    this.logger.log('Registering Temporal Worker Module Asynchronously');

    return {
      global: true,
      module: TemporalWorkerModule,
      imports: [...(options.imports || [])],
      providers: [
        ...this.createAsyncProviders(options),
        TemporalMetadataAccessor,
        MetadataScanner,
        ModulesContainer,
        DiscoveryService,
        WorkerManager,
      ],
      exports: [WorkerManager],
    };
  }

  private static createAsyncProviders(options: TemporalWorkerAsyncOptions): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: TEMPORAL_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    if (options.useClass) {
      return [
        {
          provide: TEMPORAL_MODULE_OPTIONS,
          useFactory: async (optionsFactory: TemporalWorkerOptionsFactory) =>
            await optionsFactory.createWorkerOptions(),
          inject: [options.useClass],
        },
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    if (options.useExisting) {
      return [
        {
          provide: TEMPORAL_MODULE_OPTIONS,
          useFactory: async (optionsFactory: TemporalWorkerOptionsFactory) =>
            await optionsFactory.createWorkerOptions(),
          inject: [options.useExisting],
        },
      ];
    }

    const error = new Error('Invalid TemporalWorkerAsyncOptions configuration');
    this.logger.error(error.message);
    throw error;
  }
}
