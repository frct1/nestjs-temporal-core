# NestJS Temporal Core

A NestJS integration for [Temporal.io](https://temporal.io/) that provides seamless worker and client support for building reliable distributed applications.

## Features

- 🚀 Easy integration with NestJS modules
- 🔄 Automatic worker initialization and shutdown
- 🎯 Declarative activity decorators
- 🔌 Built-in connection management
- 🛡️ Type-safe workflow execution
- 📡 Simplified client operations
- 🔒 TLS support for secure connections
- 🎛️ Configurable runtime options
- 🔄 Enhanced worker options customization
- 📊 Worker status monitoring

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
      // New: Optional runtime configuration
      runtimeOptions: {
        // Add your runtime options here
      },
      // New: Optional worker configuration
      workerOptions: {
        // Add your worker options here
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

@Activity()
export class PaymentActivity {
  @ActivityMethod()
  async processPayment(amount: number): Promise<string> {
    // Implementation
    return 'payment-id';
  }
}
```

### 4. Define Workflows

```typescript
import { proxyActivities } from '@temporalio/workflow';
import type { PaymentActivity } from './payment.activity';

const { processPayment } = proxyActivities<PaymentActivity>({
  startToCloseTimeout: '30 seconds',
});

export async function paymentWorkflow(amount: number): Promise<string> {
  return await processPayment(amount);
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
    const { result, handle } = await this.temporalClient.startWorkflow<string, [number]>(
      'paymentWorkflow',
      [amount],
      {
        taskQueue: 'my-task-queue',
      },
    );
    return result;
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
    },
    namespace: configService.get('TEMPORAL_NAMESPACE'),
    taskQueue: configService.get('TEMPORAL_TASK_QUEUE'),
    workflowsPath: require.resolve('./workflows'),
    activityClasses: [MyActivity],
    runtimeOptions: {
      // Add runtime options
    },
    workerOptions: {
      // Add worker options
    },
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
      },
    },
  },
  namespace: 'production',
});
```

## API Reference

### Decorators

- `@Activity()`: Marks a class as a Temporal activity
- `@ActivityMethod(name?: string)`: Marks a method as a Temporal activity implementation with optional custom name
- `@Workflow(options?: WorkflowOptions)`: Marks a class as a Temporal workflow with optional configuration

### Services

#### TemporalClientService

- `startWorkflow<T, A>()`: Start a new workflow execution
- `signalWorkflow()`: Send a signal to a running workflow
- `terminateWorkflow()`: Terminate a running workflow
- `getWorkflowHandle()`: Get a handle to manage a workflow
- `getWorkflowClient()`: Get the underlying workflow client instance

#### WorkerManager

- `getStatus()`: Get the current status of the worker including:
  - isRunning: boolean
  - taskQueue: string
  - namespace: string

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
}
```

#### TemporalClientOptions

```typescript
interface TemporalClientOptions {
  connection: ConnectionOptions;
  namespace?: string;
}
```

## Error Handling

The module includes comprehensive error handling:

- Worker initialization errors are logged and can prevent application startup if critical
- Client operations include detailed error messages and proper error propagation
- Activity and workflow errors are properly captured and logged
- Connection errors are handled gracefully with automatic cleanup

## Best Practices

1. Always define activity interfaces for type safety
2. Use meaningful workflow IDs for tracking
3. Implement proper error handling in activities
4. Set appropriate timeouts for activities and workflows
5. Use signals for long-running workflow coordination
6. Monitor worker status using the WorkerManager service
7. Configure appropriate runtime and worker options for production deployments
8. Implement proper TLS security for production environments

## Contributing

Contributions are welcome! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## License

MIT

## Author

Harsh M
