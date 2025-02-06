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
} from './interfaces';
import { TEMPORAL_CLIENT, TEMPORAL_MODULE_OPTIONS } from './constants';
import { TemporalClientService } from './temporal-client.service';

@Global()
@Module({})
export class TemporalClientModule {
  private static readonly logger = new Logger(TemporalClientModule.name);

  private static async createClient(options: TemporalClientOptions): Promise<Client> {
    this.logger.log('Initializing Temporal client', {
      address: options.connection.address,
      namespace: options.namespace || 'default',
    });

    try {
      const connection = await Connection.connect({
        address: options.connection.address,
        tls: options.connection.tls,
      });

      const client = new Client({
        connection,
        namespace: options.namespace || 'default',
      });

      this.logger.log('Temporal client initialized successfully');
      return client;
    } catch (error) {
      this.logger.error('Failed to initialize Temporal client', {
        error: error.message,
        stack: error.stack,
        address: options.connection.address,
      });
      throw error;
    }
  }

  static register(options: TemporalClientOptions): DynamicModule {
    const clientProvider = {
      provide: TEMPORAL_CLIENT,
      useFactory: async () => {
        const client = await this.createClient(options);
        return this.addShutdownHook(client);
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
        const client = await this.createClient(clientOptions);
        return this.addShutdownHook(client);
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

    const error = new Error('Invalid TemporalClientAsyncOptions configuration');
    this.logger.error(error.message);
    throw error;
  }

  private static addShutdownHook(client: Client): Client & OnApplicationShutdown {
    const enhancedClient = client as Client & OnApplicationShutdown;
    enhancedClient.onApplicationShutdown = async () => {
      try {
        this.logger.log('Closing Temporal client connection');
        await client.connection?.close();
        this.logger.log('Temporal client connection closed successfully');
      } catch (error) {
        this.logger.error('Failed to close Temporal client connection', {
          error: error.message,
          stack: error.stack,
        });
      }
    };
    return enhancedClient;
  }
}
