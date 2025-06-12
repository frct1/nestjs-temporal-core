# 📖 API Reference

Complete API documentation for NestJS Temporal Core.

## Table of Contents

- [Modules](#modules)
- [Core Services](#core-services)
- [Decorators](#decorators)
- [Interfaces](#interfaces)
- [Constants & Presets](#constants--presets)
- [Discovery Services](#discovery-services)
- [Error Handling](#error-handling)

## Modules

### TemporalModule

Main module providing unified Temporal integration.

#### Static Methods

##### `register(options: TemporalOptions): DynamicModule`

Synchronous module registration with both client and worker capabilities.

```typescript
import { TemporalModule } from 'nestjs-temporal-core';

@Module({
    imports: [
        TemporalModule.register({
            connection: {
                address: 'localhost:7233',
                namespace: 'default',
            },
            taskQueue: 'my-queue',
            worker: {
                workflowsPath: './dist/workflows',
                activityClasses: [MyActivities],
                autoStart: true,
            },
            isGlobal: true,
        }),
    ],
})
export class AppModule {}
```

**Options:**

- `connection`: Connection configuration
- `taskQueue`: Default task queue name
- `worker`: Worker configuration (optional)
- `isGlobal`: Register as global module (default: false)

##### `registerAsync(options: TemporalAsyncOptions): DynamicModule`

Asynchronous module registration with dependency injection.

```typescript
TemporalModule.registerAsync({
    imports: [ConfigModule],
    useFactory: (config: ConfigService) => ({
        connection: {
            address: config.get('TEMPORAL_ADDRESS'),
            namespace: config.get('TEMPORAL_NAMESPACE'),
        },
        taskQueue: config.get('TEMPORAL_TASK_QUEUE'),
        worker: {
            workflowBundle: require('./workflows-bundle'),
            activityClasses: [MyActivities],
        },
    }),
    inject: [ConfigService],
});
```

##### `forClient(options): DynamicModule`

Client-only module registration (no worker).

```typescript
TemporalModule.forClient({
    connection: {
        address: 'temporal.company.com:7233',
        namespace: 'production',
        tls: true,
        apiKey: process.env.TEMPORAL_API_KEY,
    },
    isGlobal: true,
});
```

##### `forWorker(options): DynamicModule`

Worker-only module registration.

```typescript
TemporalModule.forWorker({
    connection: {
        address: 'localhost:7233',
        namespace: 'default',
    },
    taskQueue: 'worker-queue',
    workflowsPath: './dist/workflows',
    activityClasses: [ProcessingActivities],
    isGlobal: true,
});
```

### TemporalClientModule

Client-only module for workflow operations.

```typescript
import { TemporalClientModule } from 'nestjs-temporal-core';

TemporalClientModule.register({
    connection: {
        address: 'localhost:7233',
        namespace: 'default',
    },
});
```

### TemporalWorkerModule

Worker-only module for activity execution.

```typescript
import { TemporalWorkerModule } from 'nestjs-temporal-core';

TemporalWorkerModule.register({
    connection: {
        address: 'localhost:7233',
        namespace: 'default',
    },
    taskQueue: 'worker-queue',
    workflowsPath: './dist/workflows',
    activityClasses: [MyActivities],
});
```

## Core Services

### TemporalService

Main service providing unified access to all Temporal functionality.

#### Workflow Operations

##### `startWorkflow<T, A>(type: string, args: A, options?: Partial<StartWorkflowOptions>): Promise<WorkflowStartResult<T>>`

Start a workflow with auto-discovery and enhanced options.

```typescript
const { workflowId, result } = await temporalService.startWorkflow(
    'processOrder',
    [orderId, customerId],
    {
        taskQueue: 'orders',
        workflowId: `order-${orderId}`,
        searchAttributes: { 'customer-id': customerId },
    },
);
```

**Returns:** Object with `workflowId`, `firstExecutionRunId`, `result`, and `handle`

##### `signalWorkflow(workflowId: string, signalName: string, args?: any[]): Promise<void>`

Send a signal to a running workflow.

```typescript
await temporalService.signalWorkflow('order-123', 'addItem', [item]);
```

##### `queryWorkflow<T>(workflowId: string, queryName: string, args?: any[]): Promise<T>`

Query a running workflow's state.

```typescript
const status = await temporalService.queryWorkflow<string>('order-123', 'getStatus');
```

##### `terminateWorkflow(workflowId: string, reason?: string): Promise<void>`

Terminate a workflow execution.

```typescript
await temporalService.terminateWorkflow('order-123', 'Order cancelled by user');
```

##### `cancelWorkflow(workflowId: string): Promise<void>`

Request cancellation of a workflow.

```typescript
await temporalService.cancelWorkflow('order-123');
```

#### Discovery Operations

##### `getAvailableWorkflows(): string[]`

Get all discovered workflow types.

```typescript
const workflows = temporalService.getAvailableWorkflows();
// ['processOrder', 'generateReport', 'sendEmail']
```

##### `getWorkflowInfo(name: string): WorkflowMethodInfo | undefined`

Get metadata for a specific workflow.

```typescript
const info = temporalService.getWorkflowInfo('processOrder');
if (info) {
    console.log(`Method: ${info.methodName}`);
    console.log(`Options:`, info.options);
}
```

##### `hasWorkflow(name: string): boolean`

Check if a workflow exists.

```typescript
if (temporalService.hasWorkflow('processOrder')) {
    // Start the workflow
}
```

#### Schedule Management

##### `triggerSchedule(scheduleId: string): Promise<void>`

Trigger a schedule immediately.

```typescript
await temporalService.triggerSchedule('daily-report');
```

##### `pauseSchedule(scheduleId: string, note?: string): Promise<void>`

Pause a managed schedule.

```typescript
await temporalService.pauseSchedule('daily-report', 'Maintenance mode');
```

##### `resumeSchedule(scheduleId: string, note?: string): Promise<void>`

Resume a paused schedule.

```typescript
await temporalService.resumeSchedule('daily-report');
```

##### `getManagedSchedules(): string[]`

Get all managed schedule IDs.

```typescript
const schedules = temporalService.getManagedSchedules();
// ['daily-report', 'weekly-cleanup', 'hourly-sync']
```

##### `getScheduleStats(): ScheduleStats`

Get schedule statistics.

```typescript
const stats = temporalService.getScheduleStats();
// {
//   total: 5,
//   active: 3,
//   inactive: 2,
//   errors: 0
// }
```

#### Worker Management

##### `hasWorker(): boolean`

Check if worker functionality is available.

```typescript
if (temporalService.hasWorker()) {
    const status = temporalService.getWorkerStatus();
}
```

##### `getWorkerStatus(): WorkerStatus | null`

Get comprehensive worker status.

```typescript
const status = temporalService.getWorkerStatus();
if (status) {
    console.log(`Running: ${status.isRunning}`);
    console.log(`Activities: ${status.activitiesCount}`);
    console.log(`Uptime: ${status.uptime}ms`);
}
```

##### `restartWorker(): Promise<void>`

Restart the worker without app restart.

```typescript
await temporalService.restartWorker();
```

##### `getWorkerHealth(): Promise<HealthStatus>`

Get worker health information.

```typescript
const health = await temporalService.getWorkerHealth();
console.log(`Status: ${health.status}`); // 'healthy' | 'unhealthy' | 'degraded' | 'not_available'
```

#### System Operations

##### `getSystemStatus(): Promise<SystemStatus>`

Get comprehensive system status.

```typescript
const status = await temporalService.getSystemStatus();
console.log(`Client available: ${status.client.available}`);
console.log(`Worker available: ${status.worker.available}`);
console.log(`Workflows discovered: ${status.discovery.methods}`);
console.log(`Active schedules: ${status.schedules.active}`);
```

##### `getClient(): TemporalClientService`

Access the underlying client service.

##### `getScheduleService(): TemporalScheduleService`

Access the schedule service.

##### `getWorkerManager(): WorkerManager | undefined`

Access the worker manager (if available).

### TemporalClientService

Low-level client service for advanced operations.

#### Methods

##### `startWorkflow<T, A>(type: string, args: A, options: StartWorkflowOptions): Promise<WorkflowStartResult<T>>`

Start a workflow with full control over options.

##### `getWorkflowHandle(workflowId: string, runId?: string): Promise<WorkflowHandle>`

Get a handle to manage a specific workflow execution.

##### `describeWorkflow(workflowId: string, runId?: string): Promise<WorkflowExecution>`

Get detailed workflow execution information.

##### `listWorkflows(query: string, pageSize?: number): AsyncIterable<WorkflowExecutionInfo>`

List workflows matching a query.

```typescript
const workflows = clientService.listWorkflows('WorkflowType="processOrder"');
for await (const workflow of workflows) {
    console.log(`Workflow: ${workflow.workflowId}`);
}
```

### TemporalScheduleService

Service for schedule management operations.

#### Methods

##### `createCronWorkflow(scheduleId: string, workflowType: string, cron: string, taskQueue: string, args?: any[], description?: string, timezone?: string): Promise<ScheduleHandle>`

Create a cron-based scheduled workflow.

```typescript
const handle = await scheduleService.createCronWorkflow(
    'daily-report',
    'generateReport',
    '0 8 * * *',
    'reports-queue',
    ['daily'],
    'Daily business report',
    'America/New_York',
);
```

##### `createIntervalWorkflow(scheduleId: string, workflowType: string, interval: string, taskQueue: string, args?: any[], description?: string): Promise<ScheduleHandle>`

Create an interval-based scheduled workflow.

```typescript
const handle = await scheduleService.createIntervalWorkflow(
    'health-check',
    'healthCheck',
    '5m',
    'health-queue',
);
```

##### `listSchedules(pageSize?: number): Promise<ScheduleListEntry[]>`

List all schedules.

##### `describeSchedule(scheduleId: string): Promise<ScheduleDescription>`

Get detailed schedule information.

##### `updateSchedule(scheduleId: string, updateFn: (schedule: any) => any): Promise<void>`

Update schedule configuration.

## Decorators

### Class Decorators

#### `@Activity(options?: ActivityOptions)`

Mark a class as containing Temporal activities.

```typescript
import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';

@Injectable()
@Activity()
export class EmailActivities {
    @ActivityMethod()
    async sendEmail(to: string, subject: string): Promise<boolean> {
        // Implementation
        return true;
    }
}
```

**Options:**

- `name?: string` - Custom activity class name

#### `@WorkflowController(options?: WorkflowControllerOptions)`

Mark a class as a workflow controller.

```typescript
import { WorkflowController, WorkflowMethod } from 'nestjs-temporal-core';

@WorkflowController({ taskQueue: 'orders' })
export class OrderController {
    @WorkflowMethod()
    async processOrder(orderId: string): Promise<string> {
        // Implementation
        return 'completed';
    }
}
```

**Options:**

- `taskQueue?: string` - Default task queue for workflows

#### `@Workflow(options: WorkflowOptions)` (Legacy)

Traditional workflow class decorator.

```typescript
import { Workflow, WorkflowMethod } from 'nestjs-temporal-core';

@Workflow({ name: 'processOrder', taskQueue: 'orders' })
export class OrderWorkflow {
    @WorkflowMethod()
    async execute(orderId: string): Promise<string> {
        // Implementation
        return 'completed';
    }
}
```

### Method Decorators

#### `@ActivityMethod(nameOrOptions?: string | ActivityMethodOptions)`

Mark a method as a Temporal activity.

```typescript
@Activity()
export class EmailActivities {
    @ActivityMethod() // Uses method name
    async sendEmail(to: string): Promise<void> {}

    @ActivityMethod('send-notification') // Custom name
    async sendNotification(message: string): Promise<void> {}

    @ActivityMethod({
        name: 'complex-operation',
        timeout: '30s',
        maxRetries: 3,
    })
    async complexOperation(): Promise<void> {}
}
```

**Options:**

- `name?: string` - Custom activity name
- `timeout?: string | number` - Activity timeout
- `maxRetries?: number` - Maximum retry attempts

#### `@WorkflowMethod(nameOrOptions?: string | WorkflowMethodOptions)`

Mark a method as a workflow entry point.

```typescript
@WorkflowController()
export class OrderController {
    @WorkflowMethod() // Uses method name
    async processOrder(orderId: string): Promise<string> {
        return 'completed';
    }

    @WorkflowMethod('cancel-order') // Custom name
    async cancelOrder(orderId: string): Promise<string> {
        return 'cancelled';
    }
}
```

#### `@Signal(nameOrOptions?: string | SignalOptions)`

Mark a method as a signal handler.

```typescript
@WorkflowController()
export class OrderController {
    @Signal('addItem')
    async addItem(item: any): Promise<void> {
        // Handle signal
    }

    @Signal() // Uses method name as signal name
    async cancel(): Promise<void> {
        // Handle cancel signal
    }
}
```

#### `@Query(nameOrOptions?: string | QueryOptions)`

Mark a method as a query handler.

```typescript
@WorkflowController()
export class OrderController {
    @Query('getStatus')
    getOrderStatus(): string {
        return this.status;
    }

    @Query() // Uses method name as query name
    getProgress(): number {
        return this.progress;
    }
}
```

#### `@Cron(expression: string, options: CronOptions)`

Schedule a workflow with cron expression.

```typescript
@WorkflowController()
export class ReportController {
    @Cron('0 8 * * *', {
        scheduleId: 'daily-report',
        description: 'Generate daily report',
        timezone: 'America/New_York',
    })
    @WorkflowMethod()
    async generateDailyReport(): Promise<void> {}
}
```

**Options:**

- `scheduleId: string` - Unique schedule identifier (required)
- `description?: string` - Human-readable description
- `timezone?: string` - Timezone for cron expression
- `startPaused?: boolean` - Start schedule in paused state
- `autoStart?: boolean` - Auto-start on application boot

#### `@Interval(duration: string, options: IntervalOptions)`

Schedule a workflow with fixed interval.

```typescript
@WorkflowController()
export class HealthController {
    @Interval('5m', {
        scheduleId: 'health-check',
        description: 'System health check',
    })
    @WorkflowMethod()
    async healthCheck(): Promise<void> {}
}
```

#### `@Scheduled(options: ScheduledOptions)`

General scheduling decorator.

```typescript
@WorkflowController()
export class MaintenanceController {
    @Scheduled({
        scheduleId: 'weekly-cleanup',
        cron: '0 2 * * 0',
        description: 'Weekly maintenance',
        startPaused: true,
    })
    @WorkflowMethod()
    async weeklyCleanup(): Promise<void> {}
}
```

### Advanced Decorators

#### `@WorkflowStarter(options: WorkflowStarterOptions)`

Auto-generate workflow starter methods.

```typescript
import { Injectable } from '@nestjs/common';
import { WorkflowStarter } from 'nestjs-temporal-core';

@Injectable()
export class OrderService {
    @WorkflowStarter({
        workflowType: 'processOrder',
        taskQueue: 'orders',
        workflowId: (orderId: string) => `order-${orderId}`,
    })
    async startOrderProcessing(orderId: string): Promise<WorkflowHandle> {
        // Auto-generated implementation
    }
}
```

### Parameter Decorators

#### `@WorkflowParam(index?: number)`

Extract workflow parameters.

```typescript
@WorkflowController()
export class OrderController {
    @WorkflowMethod()
    async processOrder(
        @WorkflowParam(0) orderId: string,
        @WorkflowParam(1) customerId: string,
    ): Promise<string> {
        // orderId = args[0], customerId = args[1]
    }
}
```

#### `@WorkflowContext()`

Access workflow execution context.

```typescript
@WorkflowController()
export class OrderController {
    @WorkflowMethod()
    async processOrder(
        @WorkflowParam() orderId: string,
        @WorkflowContext() context: WorkflowExecutionContext,
    ): Promise<string> {
        console.log('Workflow ID:', context.workflowId);
        console.log('Run ID:', context.runId);
    }
}
```

## Interfaces

### Configuration Interfaces

#### `TemporalOptions`

Main module configuration interface.

```typescript
interface TemporalOptions {
    connection: {
        address: string; // Temporal server address
        namespace?: string; // Temporal namespace
        tls?: boolean | TLSConfig; // TLS configuration
        apiKey?: string; // API key for Temporal Cloud
        metadata?: Record<string, string>; // Additional headers
    };
    taskQueue?: string; // Default task queue
    worker?: {
        workflowsPath?: string; // Path to compiled workflows
        workflowBundle?: any; // Pre-bundled workflows
        activityClasses?: any[]; // Activity classes
        autoStart?: boolean; // Auto-start worker
        workerOptions?: WorkerCreateOptions; // Advanced worker options
    };
    isGlobal?: boolean; // Register as global module
}
```

#### `WorkerCreateOptions`

Advanced worker configuration.

```typescript
interface WorkerCreateOptions {
    maxConcurrentActivityTaskExecutions?: number; // Default: 100
    maxConcurrentWorkflowTaskExecutions?: number; // Default: 40
    maxConcurrentLocalActivityExecutions?: number; // Default: 100
    maxActivitiesPerSecond?: number; // Rate limiting
    reuseV8Context?: boolean; // Default: true
    buildId?: string; // Build ID for versioning
    identity?: string; // Worker identity
    interceptors?: any[]; // Worker interceptors
}
```

#### `StartWorkflowOptions`

Options for starting a workflow.

```typescript
interface StartWorkflowOptions {
    taskQueue: string; // Required
    workflowId?: string; // Custom workflow ID
    searchAttributes?: Record<string, unknown>; // Search attributes
    signal?: {
        // Initial signal
        name: string;
        args?: any[];
    };
    retry?: {
        // Retry policy
        maximumAttempts?: number;
        initialInterval?: string | number;
    };
}
```

### Status Interfaces

#### `WorkerStatus`

Worker status information.

```typescript
interface WorkerStatus {
    isInitialized: boolean;
    isRunning: boolean;
    isHealthy: boolean;
    taskQueue: string;
    namespace: string;
    workflowSource: 'bundle' | 'filesystem' | 'none';
    activitiesCount: number;
    lastError?: string;
    startedAt?: Date;
    uptime?: number;
}
```

#### `ScheduleStats`

Schedule statistics.

```typescript
interface ScheduleStats {
    total: number; // Total managed schedules
    active: number; // Currently active schedules
    inactive: number; // Paused schedules
    errors: number; // Schedules with errors
}
```

#### `DiscoveryStats`

Discovery statistics.

```typescript
interface DiscoveryStats {
    controllers: number; // Workflow controllers discovered
    methods: number; // Workflow methods discovered
    scheduled: number; // Scheduled workflows discovered
    signals: number; // Signal methods discovered
    queries: number; // Query methods discovered
}
```

## Constants & Presets

### CRON_EXPRESSIONS

Predefined cron expressions.

```typescript
import { CRON_EXPRESSIONS } from 'nestjs-temporal-core';

@Cron(CRON_EXPRESSIONS.DAILY_8AM, { scheduleId: 'morning-report' })
```

**Available expressions:**

- `EVERY_MINUTE = '* * * * *'`
- `EVERY_5_MINUTES = '*/5 * * * *'`
- `HOURLY = '0 * * * *'`
- `DAILY_MIDNIGHT = '0 0 * * *'`
- `DAILY_8AM = '0 8 * * *'`
- `WEEKLY_SUNDAY = '0 0 * * 0'`
- `MONTHLY = '0 0 1 * *'`

### INTERVAL_EXPRESSIONS

Predefined interval durations.

```typescript
import { INTERVAL_EXPRESSIONS } from 'nestjs-temporal-core';

@Interval(INTERVAL_EXPRESSIONS.EVERY_5_MINUTES, { scheduleId: 'health-check' })
```

**Available intervals:**

- `EVERY_MINUTE = '1m'`
- `EVERY_5_MINUTES = '5m'`
- `EVERY_30_MINUTES = '30m'`
- `HOURLY = '1h'`
- `DAILY = '24h'`

### WORKER_PRESETS

Predefined worker configurations.

```typescript
import { WORKER_PRESETS } from 'nestjs-temporal-core';

workerOptions: WORKER_PRESETS.PRODUCTION_BALANCED;
```

**Available presets:**

- `DEVELOPMENT` - Development-optimized settings
- `PRODUCTION_BALANCED` - Balanced production settings
- `PRODUCTION_HIGH_THROUGHPUT` - High-throughput settings
- `PRODUCTION_MINIMAL` - Resource-constrained settings

### RETRY_POLICIES

Predefined retry policies.

```typescript
import { RETRY_POLICIES } from 'nestjs-temporal-core';

const activities = proxyActivities<MyActivities>({
    retry: RETRY_POLICIES.AGGRESSIVE,
});
```

**Available policies:**

- `QUICK` - Fast retry for transient failures
- `STANDARD` - Standard retry policy
- `AGGRESSIVE` - Maximum retry attempts
- `CONSERVATIVE` - Conservative retry for expensive operations

### TIMEOUTS

Common timeout values.

```typescript
import { TIMEOUTS } from 'nestjs-temporal-core';

const activities = proxyActivities<MyActivities>({
    startToCloseTimeout: TIMEOUTS.ACTIVITY_MEDIUM,
});
```

## Discovery Services

### WorkflowDiscoveryService

Service for discovering workflow controllers and methods.

#### Methods

##### `getWorkflowControllers(): WorkflowControllerInfo[]`

Get all discovered workflow controllers.

##### `getWorkflowNames(): string[]`

Get all workflow names.

##### `hasWorkflow(name: string): boolean`

Check if a workflow exists.

##### `getStats(): DiscoveryStats`

Get discovery statistics.

### ScheduleManagerService

Service for managing discovered scheduled workflows.

#### Methods

##### `getManagedSchedules(): string[]`

Get all managed schedule IDs.

##### `getScheduleStats(): ScheduleStats`

Get schedule statistics.

##### `isScheduleManaged(scheduleId: string): boolean`

Check if a schedule is managed.

##### `retryFailedSetups(): Promise<void>`

Retry failed schedule setups.

## Error Handling

### Error Classes

#### `TemporalError`

Base error class.

```typescript
class TemporalError extends Error {
    constructor(message: string, cause?: Error);
}
```

#### `WorkflowNotFoundError`

Thrown when a workflow is not found.

#### `WorkerNotAvailableError`

Thrown when worker operations are attempted without a worker.

#### `ScheduleNotFoundError`

Thrown when a schedule is not found.

#### `ConfigurationError`

Thrown for configuration issues.

### Error Constants

```typescript
import { ERRORS } from 'nestjs-temporal-core';

// Common error messages
ERRORS.CLIENT_NOT_INITIALIZED;
ERRORS.WORKER_NOT_INITIALIZED;
ERRORS.MISSING_TASK_QUEUE;
ERRORS.WORKFLOW_NOT_FOUND;
ERRORS.SCHEDULE_NOT_FOUND;
```

---

**[← Configuration](./configuration.md)** | **[Examples →](./examples.md)**
