import { DynamicModule, Module, OnApplicationShutdown, Provider, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Connection, WorkflowClient } from '@temporalio/client';
import { Runtime, Worker } from '@temporalio/worker';
import { TEMPORAL_CLIENT, TEMPORAL_WORKER, TEMPORAL_MODULE_OPTIONS } from './constants';
import {
  TemporalModuleOptions,
  TemporalModuleAsyncOptions,
  TemporalWorkerOptions,
  TemporalWorkerAsyncOptions,
  TemporalOptionsFactory,
} from './interfaces';

@Module({})
export class TemporalModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  static register(options: TemporalModuleOptions): DynamicModule {
    const providers = [
      {
        provide: TEMPORAL_MODULE_OPTIONS,
        useValue: options,
      },
      {
        provide: TEMPORAL_CLIENT,
        useFactory: async () => {
          const connection = await Connection.connect(options.connection);
          return new WorkflowClient({
            connection,
            namespace: options.namespace,
          });
        },
      },
    ];

    return {
      module: TemporalModule,
      providers,
      exports: [TEMPORAL_CLIENT],
      global: true,
    };
  }

  static registerAsync(options: TemporalModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [];

    if (!options.useExisting && !options.useFactory && !options.useClass) {
      throw new Error(
        'One of useFactory, useClass or useExisting must be provided when using registerAsync',
      );
    }

    providers.push(this.createAsyncOptionsProvider(options));

    if (options.useClass) {
      providers.push({
        provide: options.useClass,
        useClass: options.useClass,
      });
    }

    providers.push({
      provide: TEMPORAL_CLIENT,
      useFactory: async (temporalOptions: TemporalModuleOptions) => {
        const connection = await Connection.connect(temporalOptions.connection);
        return new WorkflowClient({
          connection,
          namespace: temporalOptions.namespace,
        });
      },
      inject: [TEMPORAL_MODULE_OPTIONS],
    });

    return {
      module: TemporalModule,
      imports: options.imports || [],
      providers,
      exports: [TEMPORAL_CLIENT],
      global: true,
    };
  }

  static registerWorker(options: TemporalWorkerOptions): DynamicModule {
    return {
      module: TemporalModule,
      providers: [
        {
          provide: TEMPORAL_WORKER,
          useFactory: async () => {
            if (options.runtimeOptions) {
              Runtime.install(options.runtimeOptions);
            }
            const worker = await Worker.create(options);
            await worker.run();
            return worker;
          },
        },
      ],
      exports: [TEMPORAL_WORKER],
    };
  }

  static registerWorkerAsync(options: TemporalWorkerAsyncOptions): DynamicModule {
    if (!options.useFactory) {
      throw new Error('useFactory must be provided when using registerWorkerAsync');
    }

    return {
      module: TemporalModule,
      imports: options.imports || [],
      providers: [
        {
          provide: TEMPORAL_WORKER,
          useFactory: async (...args: any[]) => {
            const workerOptions = await options.useFactory(...args);
            if (workerOptions.runtimeOptions) {
              Runtime.install(workerOptions.runtimeOptions);
            }
            const worker = await Worker.create(workerOptions);
            await worker.run();
            return worker;
          },
          inject: options.inject || [],
        },
      ],
      exports: [TEMPORAL_WORKER],
    };
  }

  private static createAsyncOptionsProvider(options: TemporalModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: TEMPORAL_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    if (options.useClass || options.useExisting) {
      return {
        provide: TEMPORAL_MODULE_OPTIONS,
        useFactory: async (optionsFactory: TemporalOptionsFactory) => {
          return await optionsFactory.createTemporalOptions();
        },
        inject: [options.useClass || options.useExisting],
      };
    }

    throw new Error(
      'One of useFactory, useClass or useExisting must be provided when using registerAsync',
    );
  }

  async onApplicationShutdown() {
    try {
      const client = this.moduleRef.get<WorkflowClient>(TEMPORAL_CLIENT);
      await client?.connection?.close();
    } catch (err) {
      console.error('Error closing Temporal client connection:', err);
    }

    try {
      const worker = this.moduleRef.get<Worker>(TEMPORAL_WORKER);
      await worker?.shutdown();
    } catch (err) {
      console.error('Error shutting down Temporal worker:', err);
    }
  }
}
