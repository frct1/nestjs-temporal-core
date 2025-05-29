import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { TemporalClientModule } from './client/temporal-client.module';
import { TemporalWorkerModule } from './worker/temporal-worker.module';
import { TemporalOptions, TemporalAsyncOptions } from './interfaces/temporal.interface';
import { TemporalService } from './temporal.service';
import { WorkflowDiscoveryService } from './discovery/workflow-discovery.service';
import { ScheduleManagerService } from './discovery/schedule-manager.service';

/**
 * Enhanced unified module for Temporal integration with NestJS
 * Now includes automatic discovery of workflow controllers and scheduled workflows
 */
@Module({})
export class TemporalModule {
    /**
     * Register Temporal module with synchronous options
     *
     * @param options Configuration options for Temporal integration
     * @returns Configured dynamic module
     *
     * @example
     * ```typescript
     * @Module({
     *   imports: [
     *     TemporalModule.register({
     *       connection: {
     *         address: 'localhost:7233',
     *         namespace: 'default'
     *       },
     *       taskQueue: 'my-task-queue',
     *       worker: {
     *         workflowsPath: './dist/workflows',
     *         activityClasses: [EmailActivities]
     *       }
     *     })
     *   ],
     *   controllers: [OrderWorkflowController], // Discovered automatically
     * })
     * export class AppModule {}
     * ```
     */
    static register(options: TemporalOptions): DynamicModule {
        const clientOptions = {
            connection: options.connection,
            namespace: options.connection.namespace,
            allowConnectionFailure: true,
        };

        const imports = [TemporalClientModule.register(clientOptions)];

        // Only add worker module if worker options are provided
        if (options.worker) {
            const workerOptions = {
                connection: options.connection,
                namespace: options.connection.namespace,
                taskQueue: options.taskQueue || 'default-task-queue',
                workflowsPath: options.worker.workflowsPath,
                workflowBundle: options.worker.workflowBundle,
                activityClasses: options.worker.activityClasses,
                autoStart: options.worker.autoStart !== false,
                allowWorkerFailure: true,
                workerOptions: options.worker.workerOptions,
            };

            imports.push(TemporalWorkerModule.register(workerOptions));
        }

        return {
            module: TemporalModule,
            imports,
            providers: [
                // Core services
                TemporalService,

                // Discovery services (NEW)
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
     * @Module({
     *   imports: [
     *     ConfigModule.forRoot(),
     *     TemporalModule.registerAsync({
     *       imports: [ConfigModule],
     *       useFactory: (configService: ConfigService) => ({
     *         connection: {
     *           address: configService.get('TEMPORAL_ADDRESS'),
     *           namespace: configService.get('TEMPORAL_NAMESPACE')
     *         },
     *         taskQueue: configService.get('TEMPORAL_TASK_QUEUE'),
     *         worker: {
     *           workflowsPath: './dist/workflows',
     *           activityClasses: [EmailActivities]
     *         }
     *       }),
     *       inject: [ConfigService]
     *     })
     *   ],
     *   controllers: [OrderWorkflowController, ReportWorkflowController],
     * })
     * export class AppModule {}
     * ```
     */
    static registerAsync(options: TemporalAsyncOptions): DynamicModule {
        return {
            module: TemporalModule,
            imports: [
                ...(options.imports || []),
                TemporalClientModule.registerAsync({
                    imports: options.imports,
                    useFactory: async (...args: any[]) => {
                        if (!options.useFactory) {
                            throw new Error('useFactory is required');
                        }
                        const temporalOptions = await options.useFactory(...args);
                        return {
                            connection: temporalOptions.connection,
                            namespace: temporalOptions.connection.namespace,
                            allowConnectionFailure: true,
                        };
                    },
                    inject: options.inject,
                }),

                // Only add worker module if registerAsync includes worker config
                ...(options.useFactory
                    ? [
                          TemporalWorkerModule.registerAsync({
                              imports: options.imports,
                              useFactory: async (...args: any[]) => {
                                  if (!options.useFactory) {
                                      throw new Error('useFactory is required');
                                  }
                                  const temporalOptions = await options.useFactory(...args);
                                  if (!temporalOptions.worker) {
                                      throw new Error('Worker configuration is required');
                                  }

                                  return {
                                      connection: temporalOptions.connection,
                                      namespace: temporalOptions.connection.namespace,
                                      taskQueue: temporalOptions.taskQueue || 'default-task-queue',
                                      workflowsPath: temporalOptions.worker.workflowsPath,
                                      workflowBundle: temporalOptions.worker.workflowBundle,
                                      activityClasses: temporalOptions.worker.activityClasses,
                                      autoStart: temporalOptions.worker.autoStart !== false,
                                      allowWorkerFailure: true,
                                      workerOptions: temporalOptions.worker.workerOptions,
                                  };
                              },
                              inject: options.inject,
                          }),
                      ]
                    : []),
            ],
            providers: [
                // Core services
                TemporalService,

                // Discovery services (NEW)
                DiscoveryService,
                MetadataScanner,
                WorkflowDiscoveryService,
                ScheduleManagerService,
            ],
            exports: [TemporalService, WorkflowDiscoveryService, ScheduleManagerService],
            global: options.isGlobal,
        };
    }
}
