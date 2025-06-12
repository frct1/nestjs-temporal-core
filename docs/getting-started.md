# 🚀 Getting Started with NestJS Temporal Core

This guide will walk you through setting up NestJS Temporal Core from installation to running your first workflow.

## Prerequisites

- **Node.js** v16 or higher
- **NestJS** application (v9, v10, or v11)
- **Temporal Server** (local or cloud)
- Basic understanding of TypeScript and NestJS

## Installation

### 1. Install Dependencies

```bash
npm install nestjs-temporal-core @temporalio/client @temporalio/worker @temporalio/workflow
```

### 2. Ensure Peer Dependencies

These are typically already in your NestJS project:

```bash
npm install @nestjs/common @nestjs/core reflect-metadata rxjs
```

## Setting Up Temporal Server

Choose one of these options to run Temporal Server:

### Option A: Docker (Recommended)

```bash
# Clone Temporal's docker-compose setup
git clone https://github.com/temporalio/docker-compose.git temporal-docker
cd temporal-docker
docker-compose up -d

# Temporal will be available at:
# - Server: localhost:7233
# - Web UI: http://localhost:8080
```

### Option B: Temporal CLI

```bash
# Install Temporal CLI
npm install -g @temporalio/cli

# Start local development server
temporal server start-dev
```

### Option C: Temporal Cloud

Sign up for [Temporal Cloud](https://temporal.io/cloud) for production-ready hosting.

## Basic Integration

### 1. Enable Shutdown Hooks

Update your `main.ts` to enable graceful shutdowns:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Required for proper Temporal worker shutdown
    app.enableShutdownHooks();

    await app.listen(3000);
    console.log('🚀 Application running on http://localhost:3000');
}
bootstrap();
```

### 2. Register Temporal Module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TemporalModule } from 'nestjs-temporal-core';

@Module({
    imports: [
        TemporalModule.register({
            connection: {
                address: 'localhost:7233',
                namespace: 'default',
            },
            taskQueue: 'tutorial',
            worker: {
                workflowsPath: './dist/workflows',
                activityClasses: [], // We'll add activities later
                autoStart: true,
            },
            isGlobal: true,
        }),
    ],
})
export class AppModule {}
```

## Creating Your First Activity

Activities handle external operations (API calls, database operations, file I/O):

```typescript
// src/activities/greeting.activities.ts
import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';

@Injectable()
@Activity()
export class GreetingActivities {
    @ActivityMethod()
    async createGreeting(name: string): Promise<string> {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log(`Creating greeting for ${name}`);
        return `Hello, ${name}! Welcome to Temporal with NestJS!`;
    }

    @ActivityMethod()
    async logMessage(message: string): Promise<void> {
        console.log(`📝 Activity Log: ${message}`);

        // In a real app, this might:
        // - Save to database
        // - Send to logging service
        // - Write to file
    }

    @ActivityMethod()
    async validateName(name: string): Promise<boolean> {
        if (!name || name.trim().length === 0) {
            throw new Error('Name cannot be empty');
        }

        if (name.length > 50) {
            throw new Error('Name too long');
        }

        return true;
    }
}
```

## Creating Your First Workflow

Workflows orchestrate activities and manage state:

```typescript
// src/workflows/greeting.controller.ts
import { WorkflowController, WorkflowMethod, Signal, Query } from 'nestjs-temporal-core';
import { proxyActivities } from '@temporalio/workflow';

// Define the activity interface for type safety
interface GreetingActivities {
    createGreeting(name: string): Promise<string>;
    logMessage(message: string): Promise<void>;
    validateName(name: string): Promise<boolean>;
}

// Create activity proxy with configuration
const activities = proxyActivities<GreetingActivities>({
    startToCloseTimeout: '30s',
    retry: {
        maximumAttempts: 3,
        initialIntervalMs: 1000,
    },
});

@WorkflowController({ taskQueue: 'tutorial' })
export class GreetingWorkflowController {
    private status = 'pending';
    private result: string | null = null;
    private error: string | null = null;

    @WorkflowMethod()
    async greetUser(name: string): Promise<string> {
        try {
            this.status = 'validating';

            // Step 1: Validate the input
            await activities.validateName(name);

            this.status = 'creating_greeting';

            // Step 2: Create the greeting
            const greeting = await activities.createGreeting(name);

            this.status = 'logging';

            // Step 3: Log the result
            await activities.logMessage(`Greeting created for ${name}`);

            this.status = 'completed';
            this.result = greeting;

            return greeting;
        } catch (error) {
            this.status = 'failed';
            this.error = error.message;

            await activities.logMessage(`Error creating greeting: ${error.message}`);
            throw error;
        }
    }

    @Signal('updateStatus')
    async updateStatus(newStatus: string): Promise<void> {
        console.log(`Status updated from ${this.status} to ${newStatus}`);
        this.status = newStatus;
    }

    @Query('getStatus')
    getStatus(): string {
        return this.status;
    }

    @Query('getResult')
    getResult(): string | null {
        return this.result;
    }

    @Query('getError')
    getError(): string | null {
        return this.error;
    }
}
```

## Register Components

Update your module to include the new components:

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TemporalModule } from 'nestjs-temporal-core';
import { GreetingActivities } from './activities/greeting.activities';
import { GreetingWorkflowController } from './workflows/greeting.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
    imports: [
        TemporalModule.register({
            connection: {
                address: 'localhost:7233',
                namespace: 'default',
            },
            taskQueue: 'tutorial',
            worker: {
                workflowsPath: './dist/workflows',
                activityClasses: [GreetingActivities], // Register activities
                autoStart: true,
            },
            isGlobal: true,
        }),
    ],
    controllers: [AppController, GreetingWorkflowController], // Register workflow controller
    providers: [AppService, GreetingActivities], // Register as providers for DI
})
export class AppModule {}
```

## Using Workflows in Services

Create a service to interact with your workflows:

```typescript
// src/app.service.ts
import { Injectable } from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';

@Injectable()
export class AppService {
    constructor(private readonly temporal: TemporalService) {}

    async greetUser(name: string): Promise<{
        workflowId: string;
        greeting: string;
    }> {
        // Start the workflow
        const { workflowId, result } = await this.temporal.startWorkflow(
            'greetUser', // Workflow method name
            [name], // Arguments
            {
                taskQueue: 'tutorial',
                workflowId: `greet-${name}-${Date.now()}`, // Unique ID
            },
        );

        // Wait for the workflow to complete and get the result
        const greeting = await result;

        return { workflowId, greeting };
    }

    async getWorkflowStatus(workflowId: string): Promise<{
        status: string;
        result: string | null;
        error: string | null;
    }> {
        const [status, result, error] = await Promise.all([
            this.temporal.queryWorkflow(workflowId, 'getStatus'),
            this.temporal.queryWorkflow(workflowId, 'getResult'),
            this.temporal.queryWorkflow(workflowId, 'getError'),
        ]);

        return { status, result, error };
    }

    async updateWorkflowStatus(workflowId: string, newStatus: string): Promise<void> {
        await this.temporal.signalWorkflow(workflowId, 'updateStatus', [newStatus]);
    }
}
```

## Create REST Endpoints

Add controllers to expose your workflows via HTTP:

```typescript
// src/app.controller.ts
import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Post('greet')
    async greetUser(@Body('name') name: string) {
        try {
            const result = await this.appService.greetUser(name);
            return {
                success: true,
                ...result,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    @Get('workflow/:workflowId/status')
    async getWorkflowStatus(@Param('workflowId') workflowId: string) {
        try {
            const status = await this.appService.getWorkflowStatus(workflowId);
            return {
                success: true,
                workflowId,
                ...status,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    @Post('workflow/:workflowId/signal')
    async updateWorkflowStatus(
        @Param('workflowId') workflowId: string,
        @Body('status') status: string,
    ) {
        try {
            await this.appService.updateWorkflowStatus(workflowId, status);
            return {
                success: true,
                message: 'Signal sent successfully',
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
}
```

## Running Your Application

### 1. Build the Application

```bash
npm run build
```

### 2. Start the Application

```bash
npm run start
# or for development
npm run start:dev
```

You should see output like:

```
🚀 Application running on http://localhost:3000
[Temporal] Worker started successfully for task queue: tutorial
[Temporal] Discovered 1 controllers with 1 workflow methods
[Temporal] Found 0 scheduled workflows, 1 signals, 3 queries
[Temporal] Worker: initialized, 3 activities registered
```

## Testing Your Workflow

### 1. Using HTTP Requests

```bash
# Start a workflow
curl -X POST http://localhost:3000/greet \
  -H "Content-Type: application/json" \
  -d '{"name": "World"}'

# Response:
# {
#   "success": true,
#   "workflowId": "greet-World-1234567890",
#   "greeting": "Hello, World! Welcome to Temporal with NestJS!"
# }

# Check workflow status
curl http://localhost:3000/workflow/greet-World-1234567890/status

# Send a signal to update status
curl -X POST http://localhost:3000/workflow/greet-World-1234567890/signal \
  -H "Content-Type: application/json" \
  -d '{"status": "custom_status"}'
```

### 2. Using Temporal Web UI

Visit http://localhost:8080 to see your workflow executions in the Temporal Web UI.

## Adding Scheduled Workflows

Add scheduling capabilities to your workflows:

```typescript
// src/workflows/scheduled.controller.ts
import { WorkflowController, WorkflowMethod, Cron, Interval } from 'nestjs-temporal-core';
import { proxyActivities } from '@temporalio/workflow';

interface GreetingActivities {
    logMessage(message: string): Promise<void>;
}

const activities = proxyActivities<GreetingActivities>({
    startToCloseTimeout: '10s',
});

@WorkflowController({ taskQueue: 'tutorial' })
export class ScheduledWorkflowController {
    @Cron('*/5 * * * *', {
        scheduleId: 'periodic-greeting',
        description: 'Greet every 5 minutes',
    })
    @WorkflowMethod()
    async periodicGreeting(): Promise<void> {
        const message = `Scheduled greeting at ${new Date().toISOString()}`;
        await activities.logMessage(message);
        console.log('Periodic greeting executed');
    }

    @Interval('30s', {
        scheduleId: 'health-check',
        description: 'Health check every 30 seconds',
    })
    @WorkflowMethod()
    async healthCheck(): Promise<void> {
        await activities.logMessage('Health check passed');
        console.log('Health check completed');
    }
}
```

Register the scheduled workflow:

```typescript
// Add to app.module.ts controllers array
controllers: [
  AppController,
  GreetingWorkflowController,
  ScheduledWorkflowController, // Add this
],
```

## Managing Schedules

Use the TemporalService to manage schedules:

```typescript
// In your service or controller
async getScheduleInfo() {
  const schedules = this.temporal.getManagedSchedules();
  const stats = this.temporal.getScheduleStats();

  return {
    schedules,
    stats: {
      total: stats.total,
      active: stats.active,
      inactive: stats.inactive,
    },
  };
}

async pauseSchedule(scheduleId: string) {
  await this.temporal.pauseSchedule(scheduleId, 'Paused via API');
}

async resumeSchedule(scheduleId: string) {
  await this.temporal.resumeSchedule(scheduleId, 'Resumed via API');
}

async triggerSchedule(scheduleId: string) {
  await this.temporal.triggerSchedule(scheduleId);
}
```

## Next Steps

Now that you have a working Temporal integration:

1. **[Configuration Guide](./configuration.md)** - Learn about advanced configuration options
2. **[API Reference](./api-reference.md)** - Explore all available APIs and decorators
3. **[Examples](./examples.md)** - See real-world examples and patterns

### Advanced Topics to Explore

- **Error Handling** - Retry policies, compensation patterns
- **Testing** - Unit and integration testing strategies
- **Production Deployment** - TLS, Temporal Cloud, monitoring
- **Workflow Patterns** - Saga, fan-out/fan-in, human tasks
- **Performance Optimization** - Worker configuration, connection pooling

## Troubleshooting

### Common Issues

**Worker not starting:**

- Ensure Temporal server is running
- Check the `workflowsPath` points to compiled JavaScript files
- Verify activities are properly registered

**Workflows not found:**

- Make sure workflow controllers are in the `controllers` array
- Check that `@WorkflowController()` decorator is applied
- Verify `@WorkflowMethod()` is on the correct methods

**Activities failing:**

- Ensure activity classes are in `activityClasses` array
- Check that activities are registered as NestJS providers
- Verify `@Activity()` and `@ActivityMethod()` decorators are applied

**Connection issues:**

- Verify Temporal server address and port
- Check network connectivity
- For Temporal Cloud, ensure API key is correct

### Getting Help

- Check the [troubleshooting section](./troubleshooting.md)
- Open an issue on [GitHub](https://github.com/harsh-simform/nestjs-temporal-core/issues)
- Join the Temporal community [Slack](https://temporal.io/slack)

---

**[← Back to README](../README.md)** | **[Configuration Guide →](./configuration.md)**
