# NestJS Temporal Core

A robust NestJS integration for [Temporal.io](https://temporal.io/) that provides seamless worker and client support for building reliable distributed applications.

## Features

- 🚀 Easy integration with NestJS modules
- 🔄 Automatic worker initialization and shutdown
- 🎯 Declarative activity and workflow decorators
- 🔌 Built-in connection management
- 🛡️ Type-safe workflow execution
- 📡 Simplified client operations
- 🔒 TLS support for secure connections
- 🎛️ Configurable runtime options
- 🔄 Enhanced worker options customization
- 📊 Worker status monitoring
- 📅 Cron workflow scheduling
- 🔍 Query handling support
- 📣 Signal handling
- 🚦 Workflow retry policies

## Installation

```bash
npm install nestjs-temporal-core @temporalio/client @temporalio/worker @temporalio/workflow
```

## Quick Start

### 1. Enable Shutdown Hooks

First, make sure to enable shutdown hooks in your `main.ts` file:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(3000);
}
bootstrap();
```

### 2. Register the Module

```typescript
import { Module } from '@nestjs/common';
import { TemporalWorkerModule, TemporalClientModule } from 'nestjs-temporal-core';

@Module({
  imports: [
    TemporalWorkerModule.register({
      connection: {
        address: 'localhost:7233',
      },
      namespace: 'default',
      taskQueue: 'my-task-queue',
      workflowsPath: require.resolve('./workflows'),
      activityClasses: [MyActivity],
      // Optional runtime configuration
      runtimeOptions: {
        // Add your runtime options here
      },
      // Optional worker configuration
      workerOptions: {
        // Add your worker options here
      },
      // Auto-start configuration
      autoStart: {
        enabled: true,
        delayMs: 1000, // Start worker after 1 second
      },
      // Optional monitoring configuration
      monitoring: {
        statsIntervalMs: 60000, // Log stats every minute
      },
    }),
    TemporalClientModule.register({
      connection: {
        address: 'localhost:7233',
      },
      namespace: 'default',
    }),
  ],
})
export class AppModule {}
```

### 3. Define Activities

```typescript
import { Activity, ActivityMethod } from 'nestjs-temporal-core';

@Activity({
  name: 'PaymentActivities', // Optional custom name
  description: 'Activities for payment processing',
})
export class PaymentActivity {
  @ActivityMethod({
    name: 'processPayment', // Optional custom name
    timeout: {
      startToClose: '30s',
    },
  })
  async processPayment(amount: number): Promise<string> {
    // Implementation
    return 'payment-id';
  }

  @ActivityMethod()
  async refundPayment(paymentId: string): Promise<boolean> {
    // Implementation
    return true;
  }
}
```

### 4. Define Workflows

```typescript
import { proxyActivities } from '@temporalio/workflow';
import type { PaymentActivity } from './payment.activity';

const { processPayment, refundPayment } = proxyActivities<PaymentActivity>({
  startToCloseTimeout: '30 seconds',
});

export async function paymentWorkflow(amount: number): Promise<string> {
  return await processPayment(amount);
}

export async function refundWorkflow(paymentId: string): Promise<boolean> {
  return await refundPayment(paymentId);
}
```

### 5. Use the Client Service

```typescript
import { Injectable } from '@nestjs/common';
import { TemporalClientService } from 'nestjs-temporal-core';

@Injectable()
export class PaymentService {
  constructor(private readonly temporalClient: TemporalClientService) {}

  async initiatePayment(amount: number) {
    const { result, workflowId } = await this.temporalClient.startWorkflow<string, [number]>(
      'paymentWorkflow',
      [amount],
      {
        taskQueue: 'my-task-queue',
        workflowExecutionTimeout: '1h',
        workflowTaskTimeout: '10s',
        retry: {
          maximumAttempts: 3,
        },
      },
    );

    // Wait for the workflow to complete
    const paymentId = await result;

    return { paymentId, workflowId };
  }

  async checkPaymentStatus(workflowId: string) {
    // Query a running workflow
    return await this.temporalClient.queryWorkflow<string>(workflowId, 'getPaymentStatus');
  }

  async cancelPayment(workflowId: string, reason: string) {
    // Signal a running workflow
    await this.temporalClient.signalWorkflow(workflowId, 'cancelPayment', [reason]);
  }
}
```

## Advanced Configuration

### Async Configuration

```typescript
TemporalWorkerModule.registerAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    connection: {
      address: configService.get('TEMPORAL_ADDRESS'),
      connectionTimeout: configService.get('TEMPORAL_CONNECTION_TIMEOUT', 5000),
    },
    namespace: configService.get('TEMPORAL_NAMESPACE'),
    taskQueue: configService.get('TEMPORAL_TASK_QUEUE'),
    workflowsPath: require.resolve('./workflows'),
    activityClasses: [MyActivity],
    autoStart: {
      enabled: configService.get('TEMPORAL_WORKER_AUTOSTART', true),
      delayMs: configService.get('TEMPORAL_WORKER_START_DELAY', 0),
    },
    allowWorkerFailure: configService.get('TEMPORAL_ALLOW_WORKER_FAILURE', true),
  }),
  inject: [ConfigService],
});
```

### TLS Configuration

```typescript
TemporalClientModule.register({
  connection: {
    address: 'temporal.example.com:7233',
    tls: {
      clientCertPair: {
        crt: Buffer.from('...'),
        key: Buffer.from('...'),
        ca: Buffer.from('...'), // Optional CA certificate
      },
      serverName: 'temporal.example.com', // Optional for SNI
      verifyServer: true, // Optional, defaults to true
    },
    connectionTimeout: 10000, // 10 seconds
  },
  namespace: 'production',
  allowConnectionFailure: true, // Allow application to start if Temporal connection fails
});
```

## API Reference

### Decorators

- `@Activity(options?)`: Marks a class as a Temporal activity with optional configuration
- `@ActivityMethod(options?)`: Marks a method as a Temporal activity implementation with optional configuration
- `@Workflow(options)`: Marks a class as a Temporal workflow with configuration

### Services

#### TemporalClientService

- `startWorkflow<T, A>()`: Start a new workflow execution
- `signalWorkflow()`: Send a signal to a running workflow
- `queryWorkflow<T>()`: Query a running workflow
- `terminateWorkflow()`: Terminate a running workflow
- `cancelWorkflow()`: Request cancellation of a workflow
- `getWorkflowHandle()`: Get a handle to manage a workflow
- `getWorkflowClient()`: Get the underlying workflow client instance

#### WorkerManager

- `startWorker()`: Manually start the worker if it's not running
- `shutdown()`: Gracefully shutdown the worker
- `getWorker()`: Get the underlying worker instance

### Module Options

#### TemporalWorkerOptions

```typescript
interface TemporalWorkerOptions {
  connection: NativeConnectionOptions;
  namespace: string;
  taskQueue: string;
  workflowsPath: string;
  activityClasses?: Array<new (...args: any[]) => any>;
  runtimeOptions?: RuntimeOptions;
  workerOptions?: WorkerOptions;
  autoStart?: {
    enabled?: boolean;
    delayMs?: number;
  };
  allowWorkerFailure?: boolean;
  monitoring?: {
    statsIntervalMs?: number;
    metrics?: {
      enabled?: boolean;
      prometheus?: {
        enabled?: boolean;
        port?: number;
      };
    };
  };
}
```

#### TemporalClientOptions

```typescript
interface TemporalClientOptions {
  connection: ConnectionOptions;
  namespace?: string;
  allowConnectionFailure?: boolean;
  reconnect?: {
    enabled?: boolean;
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffCoefficient?: number;
  };
}
```

### Activity Method Options

```typescript
interface ActivityMethodOptions {
  name?: string;
  description?: string;
  timeout?: {
    startToClose?: string | number;
    scheduleToStart?: string | number;
  };
}
```

### Workflow Options

```typescript
interface TemporalWorkflowDecoratorOptions {
  name?: string;
  description?: string;
  taskQueue: string;
  workflowIdPrefix?: string;
  executionTimeout?: string;
  workflowTaskTimeout?: string;
  retry?: {
    maximumAttempts?: number;
    initialInterval?: number;
    maximumInterval?: number;
    backoffCoefficient?: number;
  };
}
```

## Error Handling

The module includes comprehensive error handling:

- Worker initialization errors are logged and can prevent application startup if critical
- Client operations include detailed error messages and proper error propagation
- Activity and workflow errors are properly captured and logged
- Connection errors are handled gracefully with automatic cleanup
- Configurable failure modes for both client and worker connections

## Best Practices

1. Always define activity interfaces for type safety
2. Use meaningful workflow IDs for tracking
3. Implement proper error handling in activities
4. Set appropriate timeouts for activities and workflows
5. Use signals for long-running workflow coordination
6. Monitor worker status using the WorkerManager service
7. Configure appropriate runtime and worker options for production deployments
8. Implement proper TLS security for production environments
9. Use workflow queries for reading workflow state without side effects
10. Configure graceful shutdown for workers to prevent activity interruptions

## Contributing

Contributions are welcome! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## License

MIT

## Author

Harsh M
