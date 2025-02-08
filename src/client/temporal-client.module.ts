import {
  DynamicModule,
  Global,
  Module,
  Provider,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import { Client, Connection } from '@temporalio/client';
import {
  TemporalClientOptions,
  TemporalClientAsyncOptions,
  TemporalClientOptionsFactory,
} from '../interfaces';
import { TEMPORAL_CLIENT, TEMPORAL_MODULE_OPTIONS } from '../constants';
import { TemporalClientService } from './temporal-client.service';

@Global()
@Module({})
export class TemporalClientModule {
  private static readonly logger = new Logger(TemporalClientModule.name);

  private static async createClient(options: TemporalClientOptions): Promise<Client> {
    let connection: Connection | null = null;
    try {
      connection = await Connection.connect({
        address: options.connection.address,
        tls: options.connection.tls,
      });

      return new Client({
        connection,
        namespace: options.namespace || 'default',
      });
    } catch (error) {
      if (connection) {
        await connection.close().catch(() => {
          // Intentionally ignore close errors during initialization
        });
      }
      throw new Error(`Temporal client initialization failed: ${error.message}`);
    }
  }

  static register(options: TemporalClientOptions): DynamicModule {
    const clientProvider = {
      provide: TEMPORAL_CLIENT,
      useFactory: async () => {
        try {
          const client = await this.createClient(options);
          return this.addShutdownHook(client);
        } catch (error) {
          this.logger.error('Failed to initialize Temporal client', { error: error.message });
          // Allow server to start even if Temporal client fails
          return null;
        }
      },
    };

    return {
      module: TemporalClientModule,
      providers: [
        {
          provide: TEMPORAL_MODULE_OPTIONS,
          useValue: options,
        },
        clientProvider,
        TemporalClientService,
      ],
      exports: [TemporalClientService],
    };
  }

  static registerAsync(options: TemporalClientAsyncOptions): DynamicModule {
    const clientProvider = {
      provide: TEMPORAL_CLIENT,
      useFactory: async (clientOptions: TemporalClientOptions) => {
        try {
          const client = await this.createClient(clientOptions);
          return this.addShutdownHook(client);
        } catch (error) {
          this.logger.error('Failed to initialize Temporal client', { error: error.message });
          // Allow server to start even if Temporal client fails
          return null;
        }
      },
      inject: [TEMPORAL_MODULE_OPTIONS],
    };

    return {
      module: TemporalClientModule,
      imports: options.imports || [],
      providers: [...this.createAsyncProviders(options), clientProvider, TemporalClientService],
      exports: [TemporalClientService],
    };
  }

  private static createAsyncProviders(options: TemporalClientAsyncOptions): Provider[] {
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
          useFactory: async (optionsFactory: TemporalClientOptionsFactory) =>
            await optionsFactory.createClientOptions(),
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
          useFactory: async (optionsFactory: TemporalClientOptionsFactory) =>
            await optionsFactory.createClientOptions(),
          inject: [options.useExisting],
        },
      ];
    }

    throw new Error('Invalid TemporalClientAsyncOptions configuration');
  }

  private static addShutdownHook(client: Client): Client & OnApplicationShutdown {
    const enhancedClient = client as Client & OnApplicationShutdown;
    enhancedClient.onApplicationShutdown = async () => {
      if (client?.connection) {
        await client.connection.close().catch((error) => {
          this.logger.error('Failed to close Temporal connection', { error: error.message });
        });
      }
    };
    return enhancedClient;
  }
}
