import { ModuleMetadata, Type } from '@nestjs/common';
import { ConnectionOptions } from '@temporalio/client';

/**
 * Client module configuration options
 */
export interface TemporalClientOptions {
  connection: ConnectionOptions;
  namespace?: string;
}

export interface TemporalClientOptionsFactory {
  createClientOptions(): Promise<TemporalClientOptions> | TemporalClientOptions;
}

/**
 * Async client module configuration options
 */
export interface TemporalClientAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<TemporalClientOptionsFactory>;
  useClass?: Type<TemporalClientOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<TemporalClientOptions> | TemporalClientOptions;
  inject?: any[];
}
