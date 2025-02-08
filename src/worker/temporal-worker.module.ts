import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, ModulesContainer } from '@nestjs/core';
import {
  TemporalWorkerOptions,
  TemporalWorkerAsyncOptions,
  TemporalWorkerOptionsFactory,
} from '../interfaces';
import { TEMPORAL_MODULE_OPTIONS } from '../constants';
import { TemporalMetadataAccessor } from './temporal-metadata.accessor';
import { WorkerManager } from './worker-manager.service';

@Module({})
export class TemporalWorkerModule {
  static register(options: TemporalWorkerOptions): DynamicModule {
    const providers = [
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
    ];

    return {
      global: true,
      module: TemporalWorkerModule,
      providers,
      exports: [WorkerManager],
    };
  }

  static registerAsync(options: TemporalWorkerAsyncOptions): DynamicModule {
    const providers = [
      ...this.createAsyncProviders(options),
      TemporalMetadataAccessor,
      MetadataScanner,
      ModulesContainer,
      DiscoveryService,
      WorkerManager,
    ];

    return {
      global: true,
      module: TemporalWorkerModule,
      imports: options.imports || [],
      providers,
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

    throw new Error('Invalid TemporalWorkerAsyncOptions configuration');
  }
}
