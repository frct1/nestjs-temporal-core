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
import { TEMPORAL_WORKER_MODULE_OPTIONS, ERRORS, DEFAULT_NAMESPACE } from '../constants';
import { TemporalWorkerOptions } from '../interfaces';
import { TemporalMetadataAccessor } from './temporal-metadata.accessor';

/**
 * Service responsible for creating and managing Temporal workers
 * Enhanced to support workflowBundle and advanced worker options
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
        if (this.options.autoStart === false || !this.worker) {
            return;
        }

        this.startWorker();
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

        // Validate workflow configuration
        this.validateWorkflowConfiguration();

        // Gather activity implementations
        const activities = await this.discoverActivities();

        // Convert ConnectionOptions to NativeConnectionOptions
        const connectionOptions: any = {
            address: this.options.connection?.address,
            tls: this.options.connection?.tls,
        };

        // Add API key to metadata if provided
        if (this.options.connection?.apiKey) {
            connectionOptions.metadata = {
                ...(this.options.connection.metadata || {}),
                authorization: `Bearer ${this.options.connection.apiKey}`,
            };
        }

        // Connect to Temporal server
        this.logger.debug(`Connecting to Temporal server at ${connectionOptions.address}`);
        this.connection = await NativeConnection.connect(connectionOptions);

        // Build worker options
        const workerOptions = this.buildWorkerOptions(activities);

        // Create the worker
        this.worker = await Worker.create({
            connection: this.connection,
            namespace: this.options.namespace || DEFAULT_NAMESPACE,
            ...workerOptions,
        });

        this.logger.log(
            `Worker created for queue: ${this.options.taskQueue} in namespace: ${this.options.namespace || DEFAULT_NAMESPACE}`,
        );

        // Log configuration details
        this.logWorkerConfiguration(workerOptions);
    }

    /**
     * Validate workflow configuration
     */
    private validateWorkflowConfiguration() {
        const hasWorkflowsPath = !!this.options.workflowsPath;
        const hasWorkflowBundle = !!this.options.workflowBundle;

        if (!hasWorkflowsPath && !hasWorkflowBundle) {
            throw new Error(
                'Either workflowsPath or workflowBundle must be provided in worker options',
            );
        }

        if (hasWorkflowsPath && hasWorkflowBundle) {
            throw new Error(
                'Cannot specify both workflowsPath and workflowBundle. Choose one based on your deployment strategy.',
            );
        }

        if (hasWorkflowBundle) {
            this.logger.log('Using pre-bundled workflows (recommended for production)');
        } else {
            this.logger.log('Using workflows from filesystem path (recommended for development)');
        }
    }

    /**
     * Build comprehensive worker options from configuration
     */
    private buildWorkerOptions(activities: Record<string, (...args: unknown[]) => unknown>) {
        // Start with base options
        const baseOptions: any = {
            taskQueue: this.options.taskQueue,
            activities,
        };

        // Add workflow configuration
        if (this.options.workflowBundle) {
            baseOptions.workflowBundle = this.options.workflowBundle;
        } else if (this.options.workflowsPath) {
            baseOptions.workflowsPath = this.options.workflowsPath;
        }

        // Apply default worker options
        const defaultWorkerOptions = {
            maxConcurrentActivityTaskExecutions: 100,
            maxConcurrentWorkflowTaskExecutions: 40,
            reuseV8Context: true,
        };

        // Merge with user-provided worker options
        const userWorkerOptions = this.options.workerOptions || {};

        // Combine all options
        const finalOptions = {
            ...baseOptions,
            ...defaultWorkerOptions,
            ...userWorkerOptions,
        };

        return finalOptions;
    }

    /**
     * Log worker configuration for debugging
     */
    private logWorkerConfiguration(workerOptions: any) {
        const configSummary = {
            taskQueue: workerOptions.taskQueue,
            maxConcurrentActivityTaskExecutions: workerOptions.maxConcurrentActivityTaskExecutions,
            maxConcurrentWorkflowTaskExecutions: workerOptions.maxConcurrentWorkflowTaskExecutions,
            reuseV8Context: workerOptions.reuseV8Context,
            workflowSource: workerOptions.workflowBundle ? 'bundle' : 'filesystem',
            activitiesCount: Object.keys(workerOptions.activities || {}).length,
        };

        this.logger.debug('Worker configuration summary:', JSON.stringify(configSummary, null, 2));

        // Log additional options if they exist
        const additionalOptions = Object.keys(workerOptions).filter(
            (key) => !['taskQueue', 'activities', 'workflowsPath', 'workflowBundle'].includes(key),
        );

        if (additionalOptions.length > 0) {
            this.logger.debug(`Additional worker options: ${additionalOptions.join(', ')}`);
        }
    }

    /**
     * Discover and register activity implementations
     */
    private async discoverActivities(): Promise<Record<string, (...args: unknown[]) => unknown>> {
        const activities: Record<string, (...args: unknown[]) => unknown> = {};
        const providers = this.discoveryService.getProviders();

        // Filter providers to find activities
        const activityProviders = providers.filter((wrapper) => {
            const { instance, metatype } = wrapper;
            const targetClass = instance?.constructor || metatype;

            // If specific activity classes are specified, only include those
            if (this.options.activityClasses?.length) {
                return (
                    targetClass &&
                    this.options.activityClasses.includes(targetClass) &&
                    this.metadataAccessor.isActivity(targetClass)
                );
            }

            // Otherwise, include all classes marked with @Activity()
            return targetClass && this.metadataAccessor.isActivity(targetClass);
        });

        this.logger.log(`Found ${activityProviders.length} activity providers`);

        // Extract activity methods
        for (const wrapper of activityProviders) {
            const { instance } = wrapper;
            if (!instance) continue;

            // Get class name for logging
            const className = instance.constructor.name;
            this.logger.debug(`Processing activity class: ${className}`);

            // Extract all activity methods using metadata accessor
            const activityMethods = this.metadataAccessor.extractActivityMethods(instance);

            // Register each activity method
            for (const [activityName, method] of activityMethods.entries()) {
                activities[activityName] = method as (...args: unknown[]) => unknown;
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

    /**
     * Check if worker is running
     */
    isWorkerRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Get worker configuration summary for monitoring
     */
    getWorkerInfo() {
        return {
            isRunning: this.isRunning,
            taskQueue: this.options.taskQueue,
            namespace: this.options.namespace || DEFAULT_NAMESPACE,
            hasWorker: !!this.worker,
            hasConnection: !!this.connection,
            workflowSource: this.options.workflowBundle ? 'bundle' : 'filesystem',
        };
    }
}
