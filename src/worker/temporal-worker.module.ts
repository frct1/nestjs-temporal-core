import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { TEMPORAL_WORKER_MODULE_OPTIONS } from '../constants';
import {
  TemporalWorkerAsyncOptions,
  TemporalWorkerOptions,
  TemporalWorkerOptionsFactory,
} from 'src/interfaces';
import { TemporalMetadataAccessor } from './temporal-metadata.accessor';
import { WorkerManager } from './worker-manager.service';

@Module({})
export class TemporalWorkerModule {
  static register(options: TemporalWorkerOptions): DynamicModule {
    return {
      module: TemporalWorkerModule,
      global: true,
      providers: [
        {
          provide: TEMPORAL_WORKER_MODULE_OPTIONS,
          useValue: options,
        },
        ...(options.activityClasses || []).map((activity) => ({
          provide: activity,
          useClass: activity,
        })),
        TemporalMetadataAccessor,
        DiscoveryService,
        WorkerManager,
      ],
      exports: [WorkerManager],
    };
  }

  static registerAsync(options: TemporalWorkerAsyncOptions): DynamicModule {
    return {
      module: TemporalWorkerModule,
      global: true,
      imports: options.imports || [],
      providers: [
        ...this.createAsyncProviders(options),
        TemporalMetadataAccessor,
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
          provide: TEMPORAL_WORKER_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    if (options.useClass) {
      return [
        {
          provide: TEMPORAL_WORKER_MODULE_OPTIONS,
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
          provide: TEMPORAL_WORKER_MODULE_OPTIONS,
          useFactory: async (optionsFactory: TemporalWorkerOptionsFactory) =>
            await optionsFactory.createWorkerOptions(),
          inject: [options.useExisting],
        },
      ];
    }

    throw new Error('Invalid TemporalWorkerAsyncOptions configuration');
  }
}
