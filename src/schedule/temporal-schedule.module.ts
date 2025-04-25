import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { TemporalClientModule } from '../client';
import { TEMPORAL_SCHEDULE_MODULE_OPTIONS, DEFAULT_NAMESPACE } from '../constants';
import {
    TemporalScheduleOptions,
    TemporalScheduleAsyncOptions,
    TemporalScheduleOptionsFactory,
} from '../interfaces';
import { TemporalScheduleService } from './temporal-schedule.service';

/**
 * Module for managing Temporal schedules and cron jobs
 */
@Global()
@Module({})
export class TemporalScheduleModule {
    /**
     * Register the schedule module with synchronous options
     *
     * @param options Schedule configuration options
     * @returns Configured dynamic module
     *
     * @example
     * ```typescript
     * @Module({
     *   imports: [
     *     TemporalClientModule.register({
     *       connection: { address: 'localhost:7233' },
     *       namespace: 'default',
     *     }),
     *     TemporalScheduleModule.register({
     *       namespace: 'default'
     *     })
     *   ]
     * })
     * export class AppModule {}
     * ```
     */
    static register(options: TemporalScheduleOptions = {}): DynamicModule {
        const scheduleOptions = {
            namespace: options.namespace || DEFAULT_NAMESPACE,
            ...options,
        };

        return {
            module: TemporalScheduleModule,
            imports: [TemporalClientModule],
            providers: [
                {
                    provide: TEMPORAL_SCHEDULE_MODULE_OPTIONS,
                    useValue: scheduleOptions,
                },
                TemporalScheduleService,
            ],
            exports: [TemporalScheduleService],
        };
    }

    /**
     * Register the schedule module with asynchronous options
     *
     * @param options Async schedule configuration options
     * @returns Configured dynamic module
     *
     * @example
     * ```typescript
     * @Module({
     *   imports: [
     *     TemporalClientModule.registerAsync({
     *       imports: [ConfigModule],
     *       useFactory: (configService: ConfigService) => ({
     *         connection: { address: configService.get('TEMPORAL_ADDRESS') },
     *         namespace: configService.get('TEMPORAL_NAMESPACE'),
     *       }),
     *       inject: [ConfigService],
     *     }),
     *     TemporalScheduleModule.registerAsync({
     *       imports: [ConfigModule],
     *       useFactory: (configService: ConfigService) => ({
     *         namespace: configService.get('TEMPORAL_NAMESPACE'),
     *       }),
     *       inject: [ConfigService],
     *     })
     *   ]
     * })
     * export class AppModule {}
     * ```
     */
    static registerAsync(options: TemporalScheduleAsyncOptions): DynamicModule {
        return {
            module: TemporalScheduleModule,
            imports: [TemporalClientModule, ...(options.imports || [])],
            providers: [...this.createAsyncProviders(options), TemporalScheduleService],
            exports: [TemporalScheduleService],
        };
    }

    /**
     * Create providers for async module configuration
     * @private
     */
    private static createAsyncProviders(options: TemporalScheduleAsyncOptions): Provider[] {
        if (options.useFactory) {
            return [
                {
                    provide: TEMPORAL_SCHEDULE_MODULE_OPTIONS,
                    useFactory: options.useFactory,
                    inject: options.inject || [],
                },
            ];
        }

        if (options.useClass) {
            return [
                {
                    provide: TEMPORAL_SCHEDULE_MODULE_OPTIONS,
                    useFactory: async (optionsFactory: TemporalScheduleOptionsFactory) => {
                        const options = await optionsFactory.createScheduleOptions();
                        return {
                            namespace: options.namespace || DEFAULT_NAMESPACE,
                            ...options,
                        };
                    },
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
                    provide: TEMPORAL_SCHEDULE_MODULE_OPTIONS,
                    useFactory: async (optionsFactory: TemporalScheduleOptionsFactory) => {
                        const options = await optionsFactory.createScheduleOptions();
                        return {
                            namespace: options.namespace || DEFAULT_NAMESPACE,
                            ...options,
                        };
                    },
                    inject: [options.useExisting],
                },
            ];
        }

        throw new Error(
            'Invalid module configuration. Please provide useFactory, useClass, or useExisting',
        );
    }
}
