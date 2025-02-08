import { ModuleMetadata, Type } from '@nestjs/common';
import { NativeConnectionOptions, RuntimeOptions } from '@temporalio/worker';

/**
 * Worker module configuration options
 */
export interface TemporalWorkerOptions {
  connection: NativeConnectionOptions;
  namespace: string;
  taskQueue: string;
  workflowsPath: string;
  activityClasses?: Array<new (...args: any[]) => any>;
  runtimeOptions?: RuntimeOptions;
  workerOptions?: WorkerOptions;
}

export interface TemporalWorkerOptionsFactory {
  createWorkerOptions(): Promise<TemporalWorkerOptions> | TemporalWorkerOptions;
}

/**
 * Async worker module configuration options
 */
export interface TemporalWorkerAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<TemporalWorkerOptionsFactory>;
  useClass?: Type<TemporalWorkerOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<TemporalWorkerOptions> | TemporalWorkerOptions;
  inject?: any[];
}
