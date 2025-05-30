# 📖 API Reference

Complete API documentation for all modules, services, decorators, and interfaces in NestJS Temporal Core.

## Table of Contents

- [Modules](#modules)
- [Core Services](#core-services)
- [Decorators](#decorators)
- [Interfaces](#interfaces)
- [Constants & Presets](#constants--presets)
- [Types](#types)
- [Error Classes](#error-classes)

## Modules

### TemporalModule

Main module providing both client and worker functionality.

#### Static Methods

##### `register(options: TemporalModuleOptions): DynamicModule`

Synchronous module registration.

```typescript
TemporalModule.register({
    connection: {
        address: 'localhost:7233',
        namespace: 'default',
    },
    taskQueue: 'my-queue',
    worker: {
        workflowsPath: './dist/workflows',
        activityClasses: [MyActivities],
    },
    isGlobal: true,
})
```

##### `registerAsync(options: TemporalAsyncOptions): DynamicModule`

Asynchronous module registration with dependency injection.

```typescript
TemporalModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        // ... configuration
    }),
})
```

##### `forClient(options: TemporalClientOptions): DynamicModule`

Client-only module registration.

```typescript
TemporalModule.forClient({
    connection: {
        address: 'temporal.company.com:7233',
        namespace: 'production',
        tls: true,
    },
})
```

##### `forWorker(options: TemporalWorkerOptions): DynamicModule`

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
})
```

### TemporalClientModule

Client-only module for workflow operations.

##### `register(options: TemporalClientOptions): DynamicModule`
##### `registerAsync(options: TemporalClientAsyncOptions): DynamicModule`

### TemporalWorkerModule

Worker-only module for activity execution.

##### `register(options: TemporalWorkerOptions): DynamicModule`
##### `registerAsync(options: TemporalWorkerAsyncOptions): DynamicModule`

## Core Services

### TemporalService

Main service providing unified access to all Temporal functionality.

#### Workflow Operations

##### `startWorkflow<T = any>(type: string, args: any[], options?: StartWorkflowOptions): Promise<WorkflowStartResult<T>>`

Start a workflow with auto-discovery support.

```typescript
const { workflowId, result } = await temporalService.startWorkflow(
    'processOrder',
    [orderId, customerId],
    {
        workflowId: `order-${orderId}`,
        searchAttributes: { 'customer-id': customerId },
    }
);
```

##### `signalWorkflow(workflowId: string, signalName: string, args?: any[]): Promise<void>`

Send a signal to a running workflow.

```typescript
await temporalService.signalWorkflow('order-123', 'addItem', [item]);
```

##### `queryWorkflow<T = any>(workflowId: string, queryName: string, args?: any[]): Promise<T>`

Query a running workflow.

```typescript
const status = await temporalService.queryWorkflow('order-123', 'getStatus');
```

##### `terminateWorkflow(workflowId: string, reason?: string): Promise<void>`

Terminate a workflow execution.

```typescript
await temporalService.terminateWorkflow('order-123', 'Order cancelled');
```

##### `cancelWorkflow(workflowId: string): Promise<void>`

Request cancellation of a workflow.

```typescript
await temporalService.cancelWorkflow('order-123');
```

#### Discovery Operations

##### `getAvailableWorkflows(): WorkflowInfo[]`

Get all discovered workflow types.

```typescript
const workflows = temporalService.getAvailableWorkflows();
console.log(workflows.map(w => w.name));
```

##### `getWorkflowInfo(name: string): WorkflowInfo | undefined`

Get metadata for a specific workflow.

```typescript
const info = temporalService.getWorkflowInfo('processOrder');
if (info) {
    console.log(`Task Queue: ${info.taskQueue}`);
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
await temporalService.resumeSchedule('daily-report', 'Maintenance complete');
```

##### `getManagedSchedules(): string[]`

Get all managed schedule IDs.

```typescript
const schedules = temporalService.getManagedSchedules();
```

##### `getScheduleInfo(scheduleId: string): Promise<ScheduleDescription>`

Get detailed schedule information.

```typescript
const info = await temporalService.getScheduleInfo('daily-report');
```

#### Worker Management

##### `hasWorker(): boolean`

Check if worker is available.

```typescript
if (temporalService.hasWorker()) {
    const status = await temporalService.getWorkerStatus();
}
```

##### `getWorkerStatus(): Promise<WorkerStatus>`

Get comprehensive worker status.

```typescript
const status = await temporalService.getWorkerStatus();
console.log(`Worker running: ${status.isRunning}`);
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
if (health.status !== 'healthy') {
    console.warn('Worker health issues:', health.details);
}
```

#### System Operations

##### `getSystemStatus(): Promise<SystemStatus>`

Get comprehensive system status.

```typescript
const status = await temporalService.getSystemStatus();
console.log(`Workflows: ${status.discovery.workflowCount}`);
console.log(`Schedules: ${status.schedules.managed}`);
```

##### `getClient(): TemporalClientService`

Get the client service for advanced operations.

```typescript
const client = temporalService.getClient();
const handle = client.getWorkflowHandle('order-123');
```

##### `getScheduleService(): TemporalScheduleService`

Get the schedule service.

```typescript
const scheduleService = temporalService.getScheduleService();
```

##### `getWorkerManager(): WorkerManager | undefined`

Get the worker manager (if available).

```typescript
const workerManager = temporalService.getWorkerManager();
if (workerManager) {
    await workerManager.shutdown();
}
```

### TemporalClientService

Service for client-only operations.

#### Methods

##### `startWorkflow<T>(type: string, args: any[], options: StartWorkflowOptions): Promise<WorkflowHandle<T>>`

Start a workflow execution.

##### `getWorkflowHandle<T>(workflowId: string, runId?: string): WorkflowHandle<T>`

Get a handle to manage a workflow.

##### `signalWorkflow(workflowId: string, signal: string, args?: any[], runId?: string): Promise<void>`

Send a signal to a workflow.

##### `queryWorkflow<T>(workflowId: string, query: string, args?: any[], runId?: string): Promise<T>`

Query a workflow.

##### `terminateWorkflow(workflowId: string, reason?: string, runId?: string): Promise<void>`

Terminate a workflow.

##### `cancelWorkflow(workflowId: string, runId?: string): Promise<void>`

Cancel a workflow.

##### `describeWorkflow(workflowId: string, runId?: string): Promise<WorkflowExecution>`

Get workflow execution details.

##### `listWorkflows(query?: string): AsyncIterable<WorkflowExecutionInfo>`

List workflows matching a query.

### TemporalScheduleService

Service for schedule management.

#### Methods

##### `createCronWorkflow(scheduleId: string, workflowType: string, cron: string, taskQueue: string, args?: any[], note?: string): Promise<ScheduleHandle>`

Create a cron-based scheduled workflow.

```typescript
const handle = await scheduleService.createCronWorkflow(
    'daily-report',
    'generateReport',
    '0 8 * * *',
    'reports-queue',
    ['daily'],
    'Daily business report'
);
```

##### `createIntervalWorkflow(scheduleId: string, workflowType: string, interval: Duration, taskQueue: string, args?: any[], note?: string): Promise<ScheduleHandle>`

Create an interval-based scheduled workflow.

```typescript
const handle = await scheduleService.createIntervalWorkflow(
    'health-check',
    'healthCheck',
    '5m',
    'health-queue'
);
```

##### `pauseSchedule(scheduleId: string, note?: string): Promise<void>`

Pause a schedule.

##### `resumeSchedule(scheduleId: string, note?: string): Promise<void>`

Resume a schedule.

##### `deleteSchedule(scheduleId: string): Promise<void>`

Delete a schedule.

##### `triggerNow(scheduleId: string): Promise<void>`

Trigger immediate execution.

##### `listSchedules(): Promise<ScheduleListEntry[]>`

List all schedules.

##### `describeSchedule(scheduleId: string): Promise<ScheduleDescription>`

Get schedule details.

##### `updateSchedule(scheduleId: string, options: ScheduleUpdateOptions): Promise<void>`

Update schedule configuration.

### WorkerManager

Service for worker lifecycle management.

#### Methods

##### `startWorker(): Promise<void>`

Manually start the worker.

##### `shutdown(graceful?: boolean): Promise<void>`

Shutdown the worker.

##### `restartWorker(): Promise<void>`

Restart the worker.

##### `getWorker(): Worker | undefined`

Get the underlying Temporal worker.

##### `getWorkerStatus(): Promise<WorkerStatus>`

Get worker status information.

##### `healthCheck(): Promise<HealthStatus>`

Get worker health check.

##### `isWorkerRunning(): boolean`

Check if worker is running.

##### `getRegisteredActivities(): string[]`

Get list of registered activity names.

## Decorators

### Class Decorators

#### `@Activity(options?: ActivityOptions)`

Mark a class as containing Temporal activities.

```typescript
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
- `name?: string` - Custom controller name

#### `@Workflow(options: WorkflowOptions)` (Legacy)

Traditional workflow class decorator.

```typescript
@Workflow({ name: 'processOrder' })
export class OrderWorkflow {
    @WorkflowMethod()
    async execute(orderId: string): Promise<string> {
        // Implementation
        return 'completed';
    }
}
```

### Method Decorators

#### `@ActivityMethod(name?: string)`

Mark a method as a Temporal activity.

```typescript
@Activity()
export class EmailActivities {
    @ActivityMethod() // Uses method name 'sendEmail'
    async sendEmail(to: string): Promise<void> {}

    @ActivityMethod('send-notification') // Custom name
    async sendNotification(message: string): Promise<void> {}
}
```

#### `@WorkflowMethod(options?: WorkflowMethodOptions)`

Mark a method as a workflow entry point.

```typescript
@WorkflowController()
export class OrderController {
    @WorkflowMethod({ name: 'processOrder' })
    async process(orderId: string): Promise<string> {
        return 'completed';
    }
}
```

**Options:**
- `name?: string` - Custom workflow name
- `taskQueue?: string` - Override task queue

#### `@Signal(name?: string)` / `@SignalMethod(name?: string)`

Mark a method as a signal handler.

```typescript
@WorkflowController()
export class OrderController {
    @Signal('addItem')
    async addItem(item: any): Promise<void> {
        // Handle signal
    }
}
```

#### `@Query(name?: string)` / `@QueryMethod(name?: string)`

Mark a method as a query handler.

```typescript
@WorkflowController()
export class OrderController {
    @Query('getStatus')
    getStatus(): string {
        return this.status;
    }
}
```

#### `@Cron(expression: string, options?: CronOptions)`

Schedule a workflow with cron expression.

```typescript
@WorkflowController()
export class ReportController {
    @Cron('0 8 * * *', {
        scheduleId: 'daily-report',
        description: 'Generate daily report',
        timezone: 'America/New_York'
    })
    @WorkflowMethod()
    async generateDailyReport(): Promise<void> {}
}
```

**Options:**
- `scheduleId: string` - Unique schedule identifier
- `description?: string` - Human-readable description
- `timezone?: string` - Timezone for cron expression
- `startPaused?: boolean` - Start schedule in paused state

#### `@Interval(duration: Duration, options?: IntervalOptions)`

Schedule a workflow with fixed interval.

```typescript
@WorkflowController()
export class HealthController {
    @Interval('5m', {
        scheduleId: 'health-check',
        description: 'System health check'
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
        startPaused: true
    })
    @WorkflowMethod()
    async weeklyCleanup(): Promise<void> {}
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
        @WorkflowParam(1) customerId: string
    ): Promise<string> {
        // Implementation
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
        orderId: string,
        @WorkflowContext() context: WorkflowInfo
    ): Promise<string> {
        console.log(`Workflow ID: ${context.workflowId}`);
        // Implementation
    }
}
```

### Advanced Decorators

#### `@WorkflowStarter(options: WorkflowStarterOptions)`

Auto-generate workflow starter methods.

```typescript
@Injectable()
export class OrderService {
    @WorkflowStarter({
        workflowType: 'processOrder',
        taskQueue: 'orders'
    })
    async startOrderProcessing(orderId: string): Promise<string> {
        // Auto-generated implementation
    }
}
```

## Interfaces

### Configuration Interfaces

#### `TemporalModuleOptions`

Main module configuration interface.

```typescript
interface TemporalModuleOptions {
    connection: TemporalConnectionOptions;
    taskQueue?: string;
    worker?: TemporalWorkerOptions;
    client?: TemporalClientOptions;
    isGlobal?: boolean;
}
```

#### `TemporalConnectionOptions`

Connection configuration interface.

```typescript
interface TemporalConnectionOptions {
    address: string;
    namespace: string;
    apiKey?: string;
    tls?: boolean | TLSConfig;
    connectOptions?: ConnectionOptions;
}
```

#### `TemporalWorkerOptions`

Worker configuration interface.

```typescript
interface TemporalWorkerOptions {
    workflowsPath?: string;
    workflowBundle?: any;
    activityClasses: any[];
    workerOptions?: WorkerOptions;
    autoStart?: boolean;
    shutdownGraceTime?: Duration;
}
```

### Discovery Interfaces

#### `WorkflowInfo`

Workflow metadata interface.

```typescript
interface WorkflowInfo {
    name: string;
    taskQueue?: string;
    controller?: any;
    method?: string;
    signals?: SignalInfo[];
    queries?: QueryInfo[];
    schedules?: ScheduleInfo[];
}
```

#### `ScheduleInfo`

Schedule metadata interface.

```typescript
interface ScheduleInfo {
    scheduleId: string;
    workflowType: string;
    cron?: string;
    interval?: Duration;
    description?: string;
    timezone?: string;
    startPaused?: boolean;
}
```

### Status Interfaces

#### `SystemStatus`

System status interface.

```typescript
interface SystemStatus {
    client: {
        connected: boolean;
        namespace: string;
        address: string;
    };
    worker?: {
        isRunning: boolean;
        taskQueue: string;
        activities: number;
    };
    discovery: {
        workflowCount: number;
        activityCount: number;
    };
    schedules: {
        managed: number;
        active: number;
        paused: number;
    };
}
```

#### `HealthStatus`

Health check interface.

```typescript
interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
    timestamp: Date;
}
```

### Result Interfaces

#### `WorkflowStartResult<T>`

Workflow start result interface.

```typescript
interface WorkflowStartResult<T> {
    workflowId: string;
    runId: string;
    result: Promise<T>;
}
```

## Constants & Presets

### CRON_EXPRESSIONS

Predefined cron expressions for common schedules.

```typescript
import { CRON_EXPRESSIONS } from 'nestjs-temporal-core';

@Cron(CRON_EXPRESSIONS.DAILY_8AM, { scheduleId: 'morning-report' })
```

Available expressions:
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

Available intervals:
- `EVERY_MINUTE = '1m'`
- `EVERY_5_MINUTES = '5m'`
- `EVERY_30_MINUTES = '30m'`
- `HOURLY = '1h'`
- `DAILY = '24h'`

### WORKER_PRESETS

Predefined worker configurations.

```typescript
import { WORKER_PRESETS } from 'nestjs-temporal-core';

workerOptions: WORKER_PRESETS.PRODUCTION_BALANCED
```

Available presets:
- `DEVELOPMENT` - Development-optimized settings
- `PRODUCTION_BALANCED` - Balanced production settings
- `PRODUCTION_HIGH_THROUGHPUT` - High-throughput production settings

### RETRY_POLICIES

Predefined retry policies.

```typescript
import { RETRY_POLICIES } from 'nestjs-temporal-core';

// In activity configuration
startToCloseTimeout: '30s',
retry: RETRY_POLICIES.AGGRESSIVE
```

### TIMEOUTS

Common timeout values.

```typescript
import { TIMEOUTS } from 'nestjs-temporal-core';

startToCloseTimeout: TIMEOUTS.ACTIVITY_MEDIUM
```

## Types

### Duration Type

```typescript
type Duration = string; // e.g., '30s', '5m', '1h', '2d'
```

### TaskQueue Type

```typescript
type TaskQueue = string;
```

### WorkflowId Type

```typescript
type WorkflowId = string;
```

## Error Classes

### TemporalError

Base error class for all Temporal-related errors.

```typescript
class TemporalError extends Error {
    constructor(message: string, cause?: Error);
}
```

### WorkflowNotFoundError

Thrown when a workflow is not found.

```typescript
class WorkflowNotFoundError extends TemporalError {
    constructor(workflowName: string);
}
```

### WorkerNotAvailableError

Thrown when worker operations are attempted without a worker.

```typescript
class WorkerNotAvailableError extends TemporalError {
    constructor(operation: string);
}
```

### ScheduleNotFoundError

Thrown when a schedule is not found.

```typescript
class ScheduleNotFoundError extends TemporalError {
    constructor(scheduleId: string);
}
```

### ConfigurationError

Thrown for configuration-related issues.

```typescript
class ConfigurationError extends TemporalError {
    constructor(message: string, field?: string);
}
```

---

**[← Configuration](./configuration.md)** | **[🍳 Examples →](./examples.md)**