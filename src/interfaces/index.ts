import { ModuleMetadata, Type } from '@nestjs/common';
import {
  Connection,
  ConnectionOptions,
  WorkflowClient,
  WorkflowClientOptions,
} from '@temporalio/client';
import { Runtime, RuntimeOptions, Worker, WorkerOptions } from '@temporalio/worker';

export interface TemporalModuleOptions {
  connection?: ConnectionOptions;
  namespace?: string;
  taskQueue?: string;
  runtimeOptions?: RuntimeOptions;
  workflowOptions?: WorkflowClientOptions;
}

export interface TemporalWorkerOptions extends WorkerOptions {
  runtimeOptions?: RuntimeOptions;
}

export interface TemporalOptionsFactory {
  createTemporalOptions(): Promise<TemporalModuleOptions> | TemporalModuleOptions;
}

export interface TemporalWorkerFactory {
  createWorkerOptions(): Promise<TemporalWorkerOptions> | TemporalWorkerOptions;
}

// Base interface for async module options
interface TemporalModuleAsyncOptionsBase extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
}

// Interface for useFactory pattern
interface TemporalModuleAsyncOptionsFactory extends TemporalModuleAsyncOptionsBase {
  useFactory: (...args: any[]) => Promise<TemporalModuleOptions> | TemporalModuleOptions;
  useExisting?: never;
  useClass?: never;
}

// Interface for useClass pattern
interface TemporalModuleAsyncOptionsClass extends TemporalModuleAsyncOptionsBase {
  useClass: Type<TemporalOptionsFactory>;
  useFactory?: never;
  useExisting?: never;
}

// Interface for useExisting pattern
interface TemporalModuleAsyncOptionsExisting extends TemporalModuleAsyncOptionsBase {
  useExisting: Type<TemporalOptionsFactory>;
  useFactory?: never;
  useClass?: never;
}

// Combined type that ensures only one pattern can be used at a time
export type TemporalModuleAsyncOptions =
  | TemporalModuleAsyncOptionsFactory
  | TemporalModuleAsyncOptionsClass
  | TemporalModuleAsyncOptionsExisting;

// Worker async options (simplified to only support useFactory)
export interface TemporalWorkerAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<TemporalWorkerOptions> | TemporalWorkerOptions;
  inject?: any[];
}
