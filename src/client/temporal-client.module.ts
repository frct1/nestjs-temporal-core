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
import {
    TEMPORAL_CLIENT,
    TEMPORAL_CLIENT_MODULE_OPTIONS,
    DEFAULT_NAMESPACE,
    ERRORS,
} from '../constants';
import { TemporalClientService } from './temporal-client.service';
import { TemporalScheduleService } from './temporal-schedule.service';

/**
 * Global module for Temporal client configuration
 * Provides a configured Temporal client throughout the application
 */
@Global()
@Module({})
export class TemporalClientModule {
    private static readonly logger = new Logger(TemporalClientModule.name);

    /**
     * Register module with synchronous options
     */
    static register(options: TemporalClientOptions): DynamicModule {
        return {
            module: TemporalClientModule,
            providers: [
                {
                    provide: TEMPORAL_CLIENT_MODULE_OPTIONS,
                    useValue: options,
                },
                this.createClientProvider(options),
                TemporalClientService,
                TemporalScheduleService,
            ],
            exports: [TemporalClientService, TemporalScheduleService],
        };
    }

    /**
     * Register module with asynchronous options
     */
    static registerAsync(options: TemporalClientAsyncOptions): DynamicModule {
        return {
            module: TemporalClientModule,
            imports: options.imports || [],
            providers: [
                ...this.createAsyncProviders(options),
                this.createAsyncClientProvider(),
                TemporalClientService,
                TemporalScheduleService,
            ],
            exports: [TemporalClientService, TemporalScheduleService],
        };
    }

    /**
     * Create client provider for sync registration
     */
    private static createClientProvider(options: TemporalClientOptions): Provider {
        return {
            provide: TEMPORAL_CLIENT,
            useFactory: async () => this.createClientInstance(options),
        };
    }

    /**
     * Create client provider for async registration
     */
    private static createAsyncClientProvider(): Provider {
        return {
            provide: TEMPORAL_CLIENT,
            useFactory: async (clientOptions: TemporalClientOptions) =>
                this.createClientInstance(clientOptions),
            inject: [TEMPORAL_CLIENT_MODULE_OPTIONS],
        };
    }

    /**
     * Create async providers based on configuration type
     */
    private static createAsyncProviders(options: TemporalClientAsyncOptions): Provider[] {
        if (options.useFactory) {
            return [
                {
                    provide: TEMPORAL_CLIENT_MODULE_OPTIONS,
                    useFactory: options.useFactory,
                    inject: options.inject || [],
                },
            ];
        }

        if (options.useClass) {
            return [
                {
                    provide: TEMPORAL_CLIENT_MODULE_OPTIONS,
                    useFactory: async (optionsFactory: TemporalClientOptionsFactory) =>
                        optionsFactory.createClientOptions(),
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
                    provide: TEMPORAL_CLIENT_MODULE_OPTIONS,
                    useFactory: async (optionsFactory: TemporalClientOptionsFactory) =>
                        optionsFactory.createClientOptions(),
                    inject: [options.useExisting],
                },
            ];
        }

        throw new Error(ERRORS.INVALID_OPTIONS);
    }

    /**
     * Create and configure Temporal client instance
     */
    private static async createClientInstance(
        options: TemporalClientOptions,
    ): Promise<Client | null> {
        let connection: Connection | null = null;

        try {
            this.logger.log(`Connecting to Temporal server at ${options.connection.address}`);

            // Create connection with proper configuration
            const connectionConfig: any = {
                address: options.connection.address,
                tls: options.connection.tls,
                metadata: options.connection.metadata,
            };

            // Add API key authentication if provided
            if (options.connection.apiKey) {
                connectionConfig.metadata = {
                    ...connectionConfig.metadata,
                    authorization: `Bearer ${options.connection.apiKey}`,
                };
            }

            connection = await Connection.connect(connectionConfig);

            const namespace = options.namespace || DEFAULT_NAMESPACE;
            this.logger.log(`Connected to Temporal server, using namespace "${namespace}"`);

            // Create client with shutdown capabilities
            const client = new Client({ connection, namespace });
            return this.enhanceClientWithShutdown(client);
        } catch (error) {
            // Cleanup connection on error
            if (connection) {
                await connection.close().catch((closeError) => {
                    this.logger.error(
                        'Failed to close connection during error cleanup',
                        closeError,
                    );
                });
            }

            const errorMsg = `${ERRORS.CLIENT_INITIALIZATION}: ${error.message}`;
            this.logger.error(errorMsg, error.stack);

            // Allow graceful failure if configured
            if (options.allowConnectionFailure !== false) {
                this.logger.warn('Continuing application startup without Temporal client');
                return null;
            }

            throw new Error(errorMsg);
        }
    }

    /**
     * Enhance client with application shutdown capabilities
     */
    private static enhanceClientWithShutdown(client: Client): Client & OnApplicationShutdown {
        const enhancedClient = client as Client & OnApplicationShutdown;

        enhancedClient.onApplicationShutdown = async (signal?: string) => {
            this.logger.log(`Closing Temporal client connection (signal: ${signal})`);

            try {
                if (client?.connection) {
                    await client.connection.close();
                    this.logger.log('Temporal connection closed successfully');
                }
            } catch (error) {
                this.logger.error('Failed to close Temporal connection', error);
            }
        };

        return enhancedClient;
    }
}
