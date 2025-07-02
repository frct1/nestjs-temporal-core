import { Module, Injectable } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
    // Core modules
    TemporalModule,
    TemporalClientModule,
    TemporalWorkerModule,
    TemporalActivityModule,
    TemporalSchedulesModule,

    // Services
    TemporalService,
    TemporalClientService,
    TemporalActivityService,

    // Decorators
    Activity,
    ActivityMethod,
    Scheduled,
    Cron,
    Interval,

    // Constants
    CRON_EXPRESSIONS,
    INTERVAL_EXPRESSIONS,
    WORKER_PRESETS,
} from '../src';

// ==========================================
// Example 1: Complete Integration (Recommended)
// ==========================================

/**
 * Complete integration with client, worker, activities, and schedules
 * Best for applications that need full Temporal functionality
 */
@Module({
    imports: [
        TemporalModule.register({
            connection: {
                address: 'localhost:7233',
                namespace: 'production',
            },
            taskQueue: 'main-queue',
            worker: {
                workflowsPath: './dist/workflows',
                activityClasses: [EmailActivities, PaymentActivities],
                autoStart: true,
            },
        }),
    ],
    providers: [EmailActivities, PaymentActivities, OrderService],
})
export class CompleteIntegrationModule {}

// ==========================================
// Example 2: Client-Only Integration
// ==========================================

/**
 * Client-only integration for applications that only start workflows
 * Good for web APIs that trigger workflows but don't execute them
 */
@Module({
    imports: [
        TemporalClientModule.forRoot({
            connection: {
                address: 'localhost:7233',
                namespace: 'production',
            },
        }),
    ],
    providers: [ApiService],
})
export class ClientOnlyModule {}

// ==========================================
// Example 3: Worker-Only Integration
// ==========================================

/**
 * Worker-only integration for dedicated worker processes
 * Good for microservices that only execute workflows/activities
 */
@Module({
    imports: [
        TemporalWorkerModule.forRoot({
            connection: {
                address: 'localhost:7233',
                namespace: 'production',
            },
            taskQueue: 'worker-queue',
            workflowsPath: './dist/workflows',
            activityClasses: [ProcessingActivities],
            workerOptions: WORKER_PRESETS.PRODUCTION_HIGH_THROUGHPUT,
        }),
    ],
    providers: [ProcessingActivities],
})
export class WorkerOnlyModule {}

// ==========================================
// Example 4: Modular Integration
// ==========================================

/**
 * Modular integration using individual modules
 * Good for complex applications with separated concerns
 */
@Module({
    imports: [
        // Client module for workflow operations
        TemporalClientModule.forRoot({
            connection: {
                address: 'localhost:7233',
                namespace: 'production',
            },
        }),

        // Activity module for activity management
        TemporalActivityModule.forRoot({
            activityClasses: [EmailActivities, PaymentActivities],
        }),

        // Schedules module for scheduled workflows
        TemporalSchedulesModule.forRoot({
            autoStart: true,
            defaultTimezone: 'UTC',
        }),
    ],
    providers: [EmailActivities, PaymentActivities, ScheduledReportsService],
})
export class ModularIntegrationModule {}

// ==========================================
// Example 5: Async Configuration
// ==========================================

/**
 * Async configuration using ConfigService
 * Good for production environments with external configuration
 */
@Module({
    imports: [
        ConfigModule.forRoot(),
        TemporalModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => ({
                connection: {
                    address: config.get('TEMPORAL_ADDRESS'),
                    namespace: config.get('TEMPORAL_NAMESPACE'),
                    tls: config.get('TEMPORAL_TLS_ENABLED') === 'true',
                    apiKey: config.get('TEMPORAL_API_KEY'),
                },
                taskQueue: config.get('TEMPORAL_TASK_QUEUE'),
                worker: {
                    workflowsPath: config.get('WORKFLOWS_PATH'),
                    activityClasses: [EmailActivities, PaymentActivities],
                    autoStart: config.get('WORKER_AUTO_START') !== 'false',
                    workerOptions: {
                        maxConcurrentActivityTaskExecutions: config.get(
                            'MAX_CONCURRENT_ACTIVITIES',
                            100,
                        ),
                        maxConcurrentWorkflowTaskExecutions: config.get(
                            'MAX_CONCURRENT_WORKFLOWS',
                            40,
                        ),
                    },
                },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [EmailActivities, PaymentActivities],
})
export class AsyncConfigurationModule {}

// ==========================================
// Example Activity Classes
// ==========================================

@Activity()
@Injectable()
export class EmailActivities {
    @ActivityMethod({
        name: 'sendEmail',
        timeout: '30s',
        maxRetries: 3,
    })
    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        // Email sending logic
        console.log(`Sending email to ${to}: ${subject}`);
    }

    @ActivityMethod('sendNotification')
    async sendNotification(userId: string, message: string): Promise<void> {
        // Notification logic
        console.log(`Notifying user ${userId}: ${message}`);
    }
}

@Activity()
@Injectable()
export class PaymentActivities {
    @ActivityMethod({
        name: 'processPayment',
        timeout: '2m',
        maxRetries: 5,
    })
    async processPayment(
        orderId: string,
        amount: number,
    ): Promise<{ success: boolean; transactionId?: string }> {
        // Payment processing logic
        return {
            success: true,
            transactionId: `txn_${Date.now()}`,
        };
    }

    @ActivityMethod('refundPayment')
    async refundPayment(transactionId: string, amount: number): Promise<boolean> {
        // Refund logic
        return true;
    }
}

@Activity()
@Injectable()
export class ProcessingActivities {
    @ActivityMethod('processData')
    async processData(data: any[]): Promise<any[]> {
        // Data processing logic
        return data.map((item) => ({ ...item, processed: true }));
    }
}

// ==========================================
// Example Service with Scheduled Workflows
// ==========================================

@Injectable()
export class ScheduledReportsService {
    @Scheduled({
        scheduleId: 'daily-sales-report',
        cron: CRON_EXPRESSIONS.DAILY_8AM,
        description: 'Generate daily sales report',
        taskQueue: 'reports-queue',
    })
    async generateDailySalesReport(): Promise<void> {
        console.log('Generating daily sales report...');
        // Report generation logic
    }

    @Cron(CRON_EXPRESSIONS.WEEKLY_MONDAY_9AM, {
        scheduleId: 'weekly-analytics',
    })
    async generateWeeklyAnalytics(): Promise<void> {
        console.log('Generating weekly analytics...');
        // Analytics logic
    }

    @Interval(INTERVAL_EXPRESSIONS.EVERY_HOUR, {
        scheduleId: 'health-check',
    })
    async performHealthCheck(): Promise<void> {
        console.log('Performing health check...');
        // Health check logic
    }
}

// ==========================================
// Example Application Services
// ==========================================

@Injectable()
export class OrderService {
    constructor(private readonly temporal: TemporalService) {}

    async createOrder(orderData: any) {
        // Start order processing workflow
        const { workflowId } = await this.temporal.startWorkflow('processOrder', [orderData], {
            taskQueue: 'orders',
            workflowId: `order-${orderData.id}`,
            searchAttributes: {
                'customer-id': orderData.customerId,
                'order-total': orderData.total,
            },
        });

        return { workflowId };
    }

    async cancelOrder(orderId: string) {
        const workflowId = `order-${orderId}`;

        // Send cancel signal to workflow
        await this.temporal.signalWorkflow(workflowId, 'cancel', []);

        return { cancelled: true };
    }

    async getOrderStatus(orderId: string) {
        const workflowId = `order-${orderId}`;

        // Query workflow state
        const status = await this.temporal.queryWorkflow(workflowId, 'getStatus');

        return status;
    }
}

@Injectable()
export class ApiService {
    constructor(private readonly clientService: TemporalClientService) {}

    async triggerDataProcessing(data: any[]) {
        // Start workflow from API endpoint
        const { workflowId } = await this.clientService.startWorkflow(
            'processDataWorkflow',
            [data],
            {
                taskQueue: 'data-processing',
                workflowId: `data-${Date.now()}`,
            },
        );

        return { workflowId };
    }
}

// ==========================================
// Environment-Specific Configurations
// ==========================================

/**
 * Development configuration with debugging enabled
 */
export const developmentConfig = {
    connection: {
        address: 'localhost:7233',
        namespace: 'development',
    },
    taskQueue: 'dev-queue',
    worker: {
        workflowsPath: './dist/workflows',
        autoStart: true,
        workerOptions: WORKER_PRESETS.DEVELOPMENT,
    },
};

/**
 * Production configuration with optimized settings
 */
export const productionConfig = {
    connection: {
        address: process.env.TEMPORAL_ADDRESS!,
        namespace: process.env.TEMPORAL_NAMESPACE!,
        tls: true,
        apiKey: process.env.TEMPORAL_API_KEY,
    },
    taskQueue: process.env.TEMPORAL_TASK_QUEUE!,
    worker: {
        workflowBundle: require('../workflows/bundle'), // Pre-bundled workflows
        autoStart: true,
        workerOptions: WORKER_PRESETS.PRODUCTION_BALANCED,
    },
};

/**
 * Testing configuration for unit/integration tests
 */
export const testConfig = {
    connection: {
        address: 'localhost:7233',
        namespace: 'test',
    },
    taskQueue: 'test-queue',
    worker: {
        workflowsPath: './dist/test-workflows',
        autoStart: false, // Manual start in tests
        workerOptions: {
            maxConcurrentActivityTaskExecutions: 5,
            maxConcurrentWorkflowTaskExecutions: 3,
        },
    },
};
