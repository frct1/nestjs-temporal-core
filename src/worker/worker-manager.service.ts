import {
    Inject,
    Injectable,
    Logger,
    OnApplicationBootstrap,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { NativeConnection, Worker } from '@temporalio/worker';
import { TEMPORAL_WORKER_MODULE_OPTIONS, ERRORS } from '../constants';
import { TemporalWorkerOptions } from '../interfaces';
import { TemporalMetadataAccessor } from './temporal-metadata.accessor';

/**
 * Service responsible for creating and managing Temporal workers
 */
@Injectable()
export class WorkerManager implements OnModuleInit, OnModuleDestroy, OnApplicationBootstrap {
    private readonly logger = new Logger(WorkerManager.name);
    private worker: Worker | null = null;
    private connection: NativeConnection | null = null;
    private timerId: NodeJS.Timeout | null = null;
    private isRunning = false;

    constructor(
        @Inject(TEMPORAL_WORKER_MODULE_OPTIONS)
        private readonly options: TemporalWorkerOptions,
        private readonly discoveryService: DiscoveryService,
        private readonly metadataAccessor: TemporalMetadataAccessor,
    ) {}

    /**
     * Initialize the worker on module init
     */
    async onModuleInit() {
        try {
            this.logger.log('Initializing Temporal worker...');
            await this.setupWorker();
        } catch (error) {
            this.logger.error('Error during worker initialization', error);

            // Allow the application to start even if worker initialization fails
            if (this.options.allowWorkerFailure !== false) {
                this.logger.warn('Continuing application startup without Temporal worker');
            } else {
                throw error;
            }
        }
    }

    /**
     * Properly shut down the worker when the module is destroyed
     */
    async onModuleDestroy() {
        await this.shutdown();
    }

    /**
     * Start the worker when the application is bootstrapped
     */
    onApplicationBootstrap() {
        // Skip if autoStart is explicitly disabled or if worker was not created
        if (this.options.autoStart?.enabled === false || !this.worker) {
            return;
        }

        const delayMs = this.options.autoStart?.delayMs || 0;

        if (delayMs > 0) {
            this.logger.log(`Worker will start in ${delayMs}ms`);
        }

        this.timerId = setTimeout(() => {
            this.startWorker();
        }, delayMs);
    }

    /**
     * Start the worker if it's not already running
     */
    async startWorker() {
        if (!this.worker) {
            this.logger.warn('Cannot start worker: Worker not initialized');
            return;
        }

        if (this.isRunning) {
            this.logger.warn('Worker is already running');
            return;
        }

        try {
            this.logger.log(`Starting worker for task queue: ${this.options.taskQueue}`);
            this.isRunning = true;

            await this.worker.run();
        } catch (error) {
            this.isRunning = false;
            this.logger.error('Error running worker', error);
            throw error;
        }
    }

    /**
     * Shutdown the worker and clean up resources
     */
    async shutdown(): Promise<void> {
        this.clearTimeout();

        if (this.worker) {
            try {
                this.logger.log('Shutting down Temporal worker...');
                await this.worker.shutdown();
                this.isRunning = false;
                this.logger.log('Temporal worker shut down successfully');
            } catch (error) {
                this.logger.error('Error during worker shutdown', error);
            } finally {
                this.worker = null;
            }
        }

        if (this.connection) {
            try {
                this.logger.log('Closing Temporal worker connection...');
                await this.connection.close();
                this.logger.log('Temporal worker connection closed successfully');
            } catch (error) {
                this.logger.error('Error during connection close', error);
            } finally {
                this.connection = null;
            }
        }
    }

    /**
     * Clear the startup timer if it exists
     */
    private clearTimeout() {
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    /**
     * Set up the worker, discover activities, and prepare workflows
     */
    private async setupWorker() {
        if (!this.options.taskQueue) {
            throw new Error(ERRORS.MISSING_TASK_QUEUE);
        }

        // Gather activity implementations
        const activities = await this.discoverActivities();

        // Convert ConnectionOptions to NativeConnectionOptions
        const connectionOptions = this.prepareConnectionOptions(this.options.connection);

        // Connect to Temporal server
        this.logger.debug(`Connecting to Temporal server at ${connectionOptions.address}`);
        this.connection = await NativeConnection.connect(connectionOptions);

        // Create worker options
        const workerOptions = {
            taskQueue: this.options.taskQueue,
            activities,
            workflowsPath: this.options.workflowsPath,
            // Apply default worker configuration options
            maxConcurrentActivityTaskExecutions:
                this.options.maxConcurrentActivityTaskExecutions ?? 100,
            maxConcurrentLocalActivityExecutions:
                this.options.maxConcurrentLocalActivityExecutions ?? 100,
            maxConcurrentWorkflowTaskExecutions:
                this.options.maxConcurrentWorkflowTaskExecutions ?? 40,
            reuseV8Context: this.options.reuseV8Context ?? true,
            // Apply additional options if provided
            ...(this.options.maxActivitiesPerSecond && {
                maxActivitiesPerSecond: this.options.maxActivitiesPerSecond,
            }),
            ...(this.options.maxTaskQueueActivitiesPerSecond && {
                maxTaskQueueActivitiesPerSecond: this.options.maxTaskQueueActivitiesPerSecond,
            }),
            ...(this.options.workflowThreadPoolSize && {
                workflowThreadPoolSize: this.options.workflowThreadPoolSize,
            }),
            ...(this.options.useVersioning && { useVersioning: this.options.useVersioning }),
            ...(this.options.buildId && { buildId: this.options.buildId }),
            ...(this.options.debugMode && { debugMode: this.options.debugMode }),
            ...(this.options.dataConverter && { dataConverter: this.options.dataConverter }),
        };

        // Create the worker
        this.worker = await Worker.create({
            connection: this.connection,
            namespace: this.options.namespace || 'default',
            ...workerOptions,
        });

        this.logger.log(
            `Worker created for queue: ${this.options.taskQueue} in namespace: ${this.options.namespace || 'default'}`,
        );
    }

    /**
     * Transform ConnectionOptions into NativeConnectionOptions
     * This handles the differences between our interface and Temporal's expected format
     * @param options Our connection options
     * @returns Temporal-compatible NativeConnectionOptions
     */
    private prepareConnectionOptions(options: any): any {
        const nativeOptions: any = {
            address: options.address,
        };

        // Handle TLS options
        if (options.tls) {
            nativeOptions.tls = options.tls;
        }

        // Handle metadata and API key
        if (options.metadata || options.apiKey) {
            nativeOptions.metadata = { ...(options.metadata || {}) };

            // Add API key to metadata if provided
            if (options.apiKey) {
                nativeOptions.metadata.authorization = `Bearer ${options.apiKey}`;
            }
        }

        // Handle proxy configuration - fix the incompatible format
        if (options.proxy) {
            nativeOptions.proxy = {
                type: 'http-connect', // Add required 'type' property
                targetHost: options.proxy.targetHost,
                ...(options.proxy.basicAuth && { basicAuth: options.proxy.basicAuth }),
            };
        }

        // Handle connection timeout
        if (options.connectionTimeout) {
            nativeOptions.connectionTimeout = options.connectionTimeout;
        }

        return nativeOptions;
    }

    /**
     * Discover and register activity implementations from providers
     */
    private async discoverActivities() {
        const activities: Record<string, (...args: any[]) => any> = {};
        const providers = this.discoveryService.getProviders();

        // If specific activity classes are provided, filter providers by those classes
        const activityProviders = providers.filter((wrapper) => {
            const { instance, metatype } = wrapper;
            const targetClass = instance?.constructor || metatype;

            // If no activity classes are specified, include all classes marked with @Activity()
            if (!this.options.activityClasses?.length) {
                return targetClass && this.metadataAccessor.isActivity(targetClass);
            }

            // Otherwise, only include specified activity classes
            return (
                targetClass &&
                this.options.activityClasses.includes(targetClass) &&
                this.metadataAccessor.isActivity(targetClass)
            );
        });

        this.logger.log(`Found ${activityProviders.length} activity providers`);

        // Extract activity methods
        for (const wrapper of activityProviders) {
            const { instance } = wrapper;
            if (!instance) continue;

            // Get class name for logging
            const className = instance.constructor.name;
            this.logger.debug(`Processing activity class: ${className}`);

            // Extract all activity methods using our metadata accessor
            const activityMethods = this.metadataAccessor.extractActivityMethods(instance);

            // Register each activity method
            for (const [activityName, method] of activityMethods.entries()) {
                activities[activityName] = method as (...args: any[]) => any;
                this.logger.debug(`Registered activity method: ${className}.${activityName}`);
            }
        }

        const activityCount = Object.keys(activities).length;
        this.logger.log(`Registered ${activityCount} activity methods in total`);

        return activities;
    }

    /**
     * Get the worker instance
     */
    getWorker(): Worker | null {
        return this.worker;
    }
}
