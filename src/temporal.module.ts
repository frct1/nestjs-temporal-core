import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { TemporalClientModule } from './client/temporal-client.module';
import { TemporalWorkerModule } from './worker/temporal-worker.module';
import { TemporalOptions, TemporalAsyncOptions, TemporalOptionsFactory } from './interfaces';
import { TemporalService } from './temporal.service';
import { WorkflowDiscoveryService } from './discovery/workflow-discovery.service';
import { ScheduleManagerService } from './discovery/schedule-manager.service';
import { DEFAULT_TASK_QUEUE, ERRORS } from './constants';

/**
 * Enhanced unified module for Temporal integration with NestJS
 *
 * Provides comprehensive Temporal functionality including:
 * - Client operations (workflows, signals, queries)
 * - Worker management (activities, workflow execution)
 * - Auto-discovery (workflow controllers, scheduled workflows)
 * - Schedule management (cron, interval-based scheduling)
 *
 * @example
 * ```typescript
 * // Simple setup with client and worker
 * @Module({
 *   imports: [
 *     TemporalModule.register({
 *       connection: {
 *         address: 'localhost:7233',
 *         namespace: 'production'
 *       },
 *       taskQueue: 'main-queue',
 *       worker: {
 *         workflowsPath: './dist/workflows',
 *         activityClasses: [EmailActivities, PaymentActivities]
 *       }
 *     })
 *   ],
 *   controllers: [OrderWorkflowController], // Auto-discovered
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class TemporalModule {
    /**
     * Register Temporal module with synchronous options
     *
     * @param options Configuration options for Temporal integration
     * @returns Configured dynamic module
     */
    static register(options: TemporalOptions): DynamicModule {
        const { clientOptions, workerOptions } = this.processOptions(options);
        const imports = [TemporalClientModule.register(clientOptions)];

        // Add worker module if worker configuration is provided
        if (workerOptions) {
            imports.push(TemporalWorkerModule.register(workerOptions));
        }

        return {
            module: TemporalModule,
            imports,
            providers: [
                TemporalService,
                DiscoveryService,
                MetadataScanner,
                WorkflowDiscoveryService,
                ScheduleManagerService,
            ],
            exports: [TemporalService, WorkflowDiscoveryService, ScheduleManagerService],
            global: options.isGlobal,
        };
    }

    /**
     * Register Temporal module with asynchronous options
     *
     * @param options Async configuration options for Temporal integration
     * @returns Configured dynamic module
     *
     * @example
     * ```typescript
     * // Async setup with ConfigService
     * @Module({
     *   imports: [
     *     ConfigModule.forRoot(),
     *     TemporalModule.registerAsync({
     *       imports: [ConfigModule],
     *       useFactory: (configService: ConfigService) => ({
     *         connection: {
     *           address: configService.get('TEMPORAL_ADDRESS'),
     *           namespace: configService.get('TEMPORAL_NAMESPACE'),
     *           apiKey: configService.get('TEMPORAL_API_KEY')
     *         },
     *         taskQueue: configService.get('TEMPORAL_TASK_QUEUE'),
     *         worker: {
     *           workflowBundle: require('./workflows-bundle'),
     *           activityClasses: [EmailActivities, PaymentActivities]
     *         }
     *       }),
     *       inject: [ConfigService]
     *     })
     *   ]
     * })
     * export class AppModule {}
     * ```
     */
    static registerAsync(options: TemporalAsyncOptions): DynamicModule {
        this.validateAsyncOptions(options);

        return {
            module: TemporalModule,
            imports: [
                ...(options.imports || []),

                // Client module (always required)
                TemporalClientModule.registerAsync({
                    imports: options.imports,
                    useFactory: async (...args: any[]) => {
                        const temporalOptions = await this.createOptionsFromFactory(options, args);
                        const { clientOptions } = this.processOptions(temporalOptions);
                        return clientOptions;
                    },
                    inject: options.inject,
                }),

                // Worker module (conditional)
                TemporalWorkerModule.registerAsync({
                    imports: options.imports,
                    useFactory: async (...args: any[]) => {
                        const temporalOptions = await this.createOptionsFromFactory(options, args);
                        const { workerOptions } = this.processOptions(temporalOptions);

                        if (!workerOptions) {
                            throw new Error(
                                'Worker configuration is required for async registration with worker',
                            );
                        }

                        return workerOptions;
                    },
                    inject: options.inject,
                }),
            ],
            providers: [
                TemporalService,
                DiscoveryService,
                MetadataScanner,
                WorkflowDiscoveryService,
                ScheduleManagerService,
            ],
            exports: [TemporalService, WorkflowDiscoveryService, ScheduleManagerService],
            global: options.isGlobal,
        };
    }

    /**
     * Register Temporal module for client-only usage (no worker)
     *
     * @param options Client-only configuration options
     * @returns Configured dynamic module
     *
     * @example
     * ```typescript
     * // Client-only setup (no worker)
     * @Module({
     *   imports: [
     *     TemporalModule.forClient({
     *       connection: {
     *         address: 'temporal.company.com:7233',
     *         namespace: 'production',
     *         tls: true
     *       }
     *     })
     *   ]
     * })
     * export class ClientOnlyModule {}
     * ```
     */
    static forClient(options: {
        connection: TemporalOptions['connection'];
        isGlobal?: boolean;
    }): DynamicModule {
        return this.register({
            connection: options.connection,
            isGlobal: options.isGlobal,
            // No worker configuration
        });
    }

    /**
     * Register Temporal module for worker-only usage
     *
     * @param options Worker-only configuration options
     * @returns Configured dynamic module
     *
     * @example
     * ```typescript
     * // Worker-only setup (separate from client)
     * @Module({
     *   imports: [
     *     TemporalModule.forWorker({
     *       connection: {
     *         address: 'localhost:7233',
     *         namespace: 'development'
     *       },
     *       taskQueue: 'worker-queue',
     *       workflowsPath: './dist/workflows',
     *       activityClasses: [ProcessingActivities]
     *     })
     *   ]
     * })
     * export class WorkerOnlyModule {}
     * ```
     */
    static forWorker(options: {
        connection: TemporalOptions['connection'];
        taskQueue: string;
        workflowsPath?: string;
        workflowBundle?: any;
        activityClasses?: any[];
        isGlobal?: boolean;
    }): DynamicModule {
        return this.register({
            connection: options.connection,
            taskQueue: options.taskQueue,
            worker: {
                workflowsPath: options.workflowsPath,
                workflowBundle: options.workflowBundle,
                activityClasses: options.activityClasses,
            },
            isGlobal: options.isGlobal,
        });
    }

    // ==========================================
    // Private Helper Methods
    // ==========================================

    /**
     * Process and validate Temporal options, converting to client and worker options
     */
    private static processOptions(options: TemporalOptions) {
        this.validateOptions(options);

        // Build client options (always required)
        const clientOptions = {
            connection: options.connection,
            namespace: options.connection.namespace,
            allowConnectionFailure: true,
        };

        // Build worker options (optional)
        let workerOptions = null;
        if (options.worker) {
            workerOptions = {
                connection: options.connection,
                namespace: options.connection.namespace,
                taskQueue: options.taskQueue || DEFAULT_TASK_QUEUE,
                workflowsPath: options.worker.workflowsPath,
                workflowBundle: options.worker.workflowBundle,
                activityClasses: options.worker.activityClasses,
                autoStart: options.worker.autoStart !== false,
                allowWorkerFailure: true,
                workerOptions: options.worker.workerOptions,
            };
        }

        return { clientOptions, workerOptions };
    }

    /**
     * Validate synchronous options
     */
    private static validateOptions(options: TemporalOptions): void {
        if (!options.connection) {
            throw new Error('Connection configuration is required');
        }

        if (!options.connection.address) {
            throw new Error('Connection address is required');
        }

        // Validate worker configuration if provided
        if (options.worker) {
            const hasWorkflowsPath = Boolean(options.worker.workflowsPath);
            const hasWorkflowBundle = Boolean(options.worker.workflowBundle);

            if (!hasWorkflowsPath && !hasWorkflowBundle) {
                throw new Error('Worker requires either workflowsPath or workflowBundle');
            }

            if (hasWorkflowsPath && hasWorkflowBundle) {
                throw new Error('Worker cannot have both workflowsPath and workflowBundle');
            }
        }
    }

    /**
     * Validate async options
     */
    private static validateAsyncOptions(options: TemporalAsyncOptions): void {
        const hasFactory = Boolean(options.useFactory);
        const hasClass = Boolean(options.useClass);
        const hasExisting = Boolean(options.useExisting);

        const configMethods = [hasFactory, hasClass, hasExisting].filter(Boolean).length;

        if (configMethods === 0) {
            throw new Error(
                ERRORS.INVALID_OPTIONS + ': Must provide useFactory, useClass, or useExisting',
            );
        }

        if (configMethods > 1) {
            throw new Error(
                ERRORS.INVALID_OPTIONS + ': Cannot provide multiple configuration methods',
            );
        }
    }

    /**
     * Create options from factory method
     */
    private static async createOptionsFromFactory(
        options: TemporalAsyncOptions,
        args: any[],
    ): Promise<TemporalOptions> {
        if (options.useFactory) {
            return await options.useFactory(...args);
        }

        if (options.useClass) {
            const optionsFactory = new options.useClass() as TemporalOptionsFactory;
            return await optionsFactory.createTemporalOptions();
        }

        if (options.useExisting) {
            // Note: useExisting should be handled by DI container
            throw new Error('useExisting should be handled by dependency injection');
        }

        throw new Error(ERRORS.INVALID_OPTIONS);
    }
}
