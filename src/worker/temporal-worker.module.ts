import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { TemporalMetadataAccessor } from './temporal-metadata.accessor';
import { ERRORS, TEMPORAL_MODULE_OPTIONS } from '../constants';
import { TemporalAsyncOptions, TemporalOptions, TemporalOptionsFactory } from '../interfaces';
import { TemporalWorkerManagerService } from './temporal-worker-manager.service';

/**
 * Streamlined Temporal Worker Module
 * Provides comprehensive worker management for Temporal activities and workflows
 */
@Module({})
export class TemporalWorkerModule {
    // ==========================================
    // Synchronous Registration
    // ==========================================

    /**
     * Register the module with synchronous options
     *
     * @param options Worker configuration options
     * @returns Configured dynamic module
     *
     * @example
     * ```typescript
     * @Module({
     *   imports: [
     *     TemporalWorkerModule.register({
     *       connection: { address: 'localhost:7233' },
     *       taskQueue: 'my-task-queue',
     *       worker: {
     *         workflowsPath: './dist/workflows',
     *         activityClasses: [EmailActivities, PaymentActivities]
     *       }
     *     })
     *   ]
     * })
     * export class AppModule {}
     * ```
     */
    static register(options: TemporalOptions): DynamicModule {
        this.validateWorkerOptions(options);
        const workerOptions = this.extractWorkerOptions(options);

        return {
            module: TemporalWorkerModule,
            global: true,
            providers: [
                {
                    provide: TEMPORAL_MODULE_OPTIONS,
                    useValue: workerOptions,
                },
                ...this.createActivityProviders(options.worker?.activityClasses || []),
                TemporalMetadataAccessor,
                DiscoveryService,
                TemporalWorkerManagerService,
            ],
            exports: [TemporalWorkerManagerService, TEMPORAL_MODULE_OPTIONS],
        };
    }

    // ==========================================
    // Asynchronous Registration
    // ==========================================

    /**
     * Register the module with asynchronous options
     *
     * @param options Async worker configuration options
     * @returns Configured dynamic module
     *
     * @example
     * ```typescript
     * @Module({
     *   imports: [
     *     ConfigModule.forRoot(),
     *     TemporalWorkerModule.registerAsync({
     *       imports: [ConfigModule],
     *       useFactory: (configService: ConfigService) => ({
     *         connection: {
     *           address: configService.get('TEMPORAL_ADDRESS')
     *         },
     *         taskQueue: configService.get('TEMPORAL_TASK_QUEUE'),
     *         worker: {
     *           workflowsPath: './dist/workflows',
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
        return {
            module: TemporalWorkerModule,
            global: true,
            imports: options.imports || [],
            providers: [
                ...this.createAsyncProviders(options),
                TemporalMetadataAccessor,
                DiscoveryService,
                TemporalWorkerManagerService,
            ],
            exports: [TemporalWorkerManagerService, TEMPORAL_MODULE_OPTIONS],
        };
    }

    // ==========================================
    // Simplified Registration Methods
    // ==========================================

    /**
     * Register for worker-only usage
     *
     * @param options Worker-only configuration options
     * @returns Configured dynamic module
     *
     * @example
     * ```typescript
     * @Module({
     *   imports: [
     *     TemporalWorkerModule.forWorker({
     *       connection: { address: 'localhost:7233' },
     *       taskQueue: 'worker-queue',
     *       workflowsPath: './dist/workflows',
     *       activityClasses: [ProcessingActivities]
     *     })
     *   ]
     * })
     * export class WorkerModule {}
     * ```
     */
    static forWorker(options: {
        connection: TemporalOptions['connection'];
        taskQueue: string;
        workflowsPath?: string;
        workflowBundle?: any;
        activityClasses?: Array<Type<any>>;
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
    // Provider Creation Methods
    // ==========================================

    /**
     * Create providers for activity classes with proper DI setup
     */
    private static createActivityProviders(activityClasses: Array<Type<any>>): Provider[] {
        return activityClasses.map((ActivityClass) => ({
            provide: ActivityClass,
            useClass: ActivityClass,
        }));
    }

    /**
     * Create providers for async module configuration
     */
    private static createAsyncProviders(options: TemporalAsyncOptions): Provider[] {
        if (options.useFactory) {
            return [
                {
                    provide: TEMPORAL_MODULE_OPTIONS,
                    useFactory: async (...args: any[]) => {
                        const temporalOptions = await options.useFactory!(...args);
                        this.validateWorkerOptions(temporalOptions);
                        return this.extractWorkerOptions(temporalOptions);
                    },
                    inject: options.inject || [],
                },
            ];
        }

        if (options.useClass) {
            return [
                {
                    provide: TEMPORAL_MODULE_OPTIONS,
                    useFactory: async (optionsFactory: TemporalOptionsFactory) => {
                        const temporalOptions = await optionsFactory.createTemporalOptions();
                        this.validateWorkerOptions(temporalOptions);
                        return this.extractWorkerOptions(temporalOptions);
                    },
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
                    useFactory: async (optionsFactory: TemporalOptionsFactory) => {
                        const temporalOptions = await optionsFactory.createTemporalOptions();
                        this.validateWorkerOptions(temporalOptions);
                        return this.extractWorkerOptions(temporalOptions);
                    },
                    inject: [options.useExisting],
                },
            ];
        }

        throw new Error(ERRORS.INVALID_OPTIONS);
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    /**
     * Validate worker-specific options
     */
    private static validateWorkerOptions(options: TemporalOptions): void {
        if (!options.connection) {
            throw new Error('Connection configuration is required for worker');
        }

        if (!options.connection.address) {
            throw new Error('Connection address is required for worker');
        }

        if (!options.taskQueue) {
            throw new Error('Task queue is required for worker');
        }

        if (!options.worker) {
            throw new Error('Worker configuration is required');
        }

        // Validate workflow configuration
        const hasWorkflowsPath = Boolean(options.worker.workflowsPath);
        const hasWorkflowBundle = Boolean(options.worker.workflowBundle);

        if (!hasWorkflowsPath && !hasWorkflowBundle) {
            throw new Error('Worker requires either workflowsPath or workflowBundle');
        }

        if (hasWorkflowsPath && hasWorkflowBundle) {
            throw new Error('Worker cannot have both workflowsPath and workflowBundle');
        }
    }

    /**
     * Extract worker-specific options from full Temporal options
     */
    private static extractWorkerOptions(options: TemporalOptions): any {
        return {
            connection: {
                address: options.connection.address,
                namespace: options.connection.namespace,
                tls: options.connection.tls,
                apiKey: options.connection.apiKey,
                metadata: options.connection.metadata,
            },
            taskQueue: options.taskQueue,
            workflowsPath: options.worker?.workflowsPath,
            workflowBundle: options.worker?.workflowBundle,
            activityClasses: options.worker?.activityClasses || [],
            autoStart: options.worker?.autoStart !== false,
            allowWorkerFailure: options.allowConnectionFailure !== false,
            workerOptions: options.worker?.workerOptions || {},
        };
    }
}
