# 🚀 Getting Started

Welcome to NestJS Temporal Core! This guide will help you set up your first Temporal workflow with NestJS in minutes.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Setting Up Temporal Server](#setting-up-temporal-server)
- [Basic Configuration](#basic-configuration)
- [Your First Workflow](#your-first-workflow)
- [Creating Activities](#creating-activities)
- [Running the Application](#running-the-application)
- [Testing Your Workflow](#testing-your-workflow)
- [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have:

- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **Basic NestJS knowledge** - familiar with modules, controllers, and services
- **TypeScript** experience

## Installation

### 1. Install the Package

```bash
npm install nestjs-temporal-core @temporalio/client @temporalio/worker @temporalio/workflow

# If using yarn
yarn add nestjs-temporal-core @temporalio/client @temporalio/worker @temporalio/workflow
```

### 2. Install Required Peer Dependencies

```bash
npm install reflect-metadata rxjs

# These are usually already installed in NestJS projects
npm install @nestjs/common @nestjs/core
```

## Setting Up Temporal Server

### Option 1: Docker (Recommended for Development)

```bash
# Download and run Temporal server with Web UI
git clone https://github.com/temporalio/docker-compose.git
cd docker-compose
docker-compose up
```

### Option 2: Temporal CLI (Simpler)

```bash
# Install Temporal CLI
npm install -g @temporalio/cli

# Start local server
temporal server start
```

### Option 3: Temporal Cloud

For production, consider [Temporal Cloud](https://temporal.io/cloud) - no setup required!

## Basic Configuration

### 1. Enable Shutdown Hooks

First, update your `main.ts` to enable graceful shutdown:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    
    // Required for proper worker shutdown
    app.enableShutdownHooks();
    
    await app.listen(3000);
    console.log('🚀 Application is running on: http://localhost:3000');
}
bootstrap();
```

### 2. Register the Temporal Module

Update your `app.module.ts`:

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
            taskQueue: 'hello-world',
            worker: {
                workflowsPath: './dist/workflows', // Path to compiled workflows
                activityClasses: [], // We'll add activities later
                autoStart: true, // Start worker automatically
            },
            isGlobal: true, // Make available globally
        }),
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
```

## Your First Workflow

### Method 1: Workflow Controller (Recommended)

Create a new workflow using the modern controller approach:

```typescript
// src/workflows/hello.controller.ts
import { WorkflowController, WorkflowMethod } from 'nestjs-temporal-core';

@WorkflowController({ taskQueue: 'hello-world' })
export class HelloWorkflowController {
    
    @WorkflowMethod()
    async sayHello(name: string): Promise<string> {
        return `Hello, ${name}! Welcome to Temporal with NestJS!`;
    }
}
```

### Method 2: Traditional Workflow File

Alternatively, create a traditional workflow file:

```typescript
// src/workflows/hello.workflow.ts

export async function sayHelloWorkflow(name: string): Promise<string> {
    return `Hello, ${name}! Welcome to Temporal with NestJS!`;
}
```

**Register the controller in your module:**

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TemporalModule } from 'nestjs-temporal-core';
import { HelloWorkflowController } from './workflows/hello.controller';

@Module({
    imports: [
        TemporalModule.register({
            connection: {
                address: 'localhost:7233',
                namespace: 'default',
            },
            taskQueue: 'hello-world',
            worker: {
                workflowsPath: './dist/workflows',
                activityClasses: [],
                autoStart: true,
            },
            isGlobal: true,
        }),
    ],
    controllers: [HelloWorkflowController], // Add your workflow controller
    providers: [],
})
export class AppModule {}
```

## Creating Activities

Activities handle external operations like API calls, database operations, etc.

### 1. Create an Activity Class

```typescript
// src/activities/greeting.activities.ts
import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';

@Injectable()
@Activity()
export class GreetingActivities {
    
    @ActivityMethod()
    async formatGreeting(name: string): Promise<string> {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return `🎉 Hello, ${name}! This greeting was formatted by an activity.`;
    }
    
    @ActivityMethod()
    async logGreeting(message: string): Promise<void> {
        console.log(`📝 Logging: ${message}`);
        // In real app, this might save to database
    }
}
```

### 2. Update Your Workflow to Use Activities

```typescript
// src/workflows/hello.controller.ts
import { WorkflowController, WorkflowMethod } from 'nestjs-temporal-core';
import { proxyActivities } from '@temporalio/workflow';

// Define activity interface
interface GreetingActivities {
    formatGreeting(name: string): Promise<string>;
    logGreeting(message: string): Promise<void>;
}

// Create activity proxy
const activities = proxyActivities<GreetingActivities>({
    startToCloseTimeout: '10s',
});

@WorkflowController({ taskQueue: 'hello-world' })
export class HelloWorkflowController {
    
    @WorkflowMethod()
    async sayHello(name: string): Promise<string> {
        // Use the activity
        const greeting = await activities.formatGreeting(name);
        await activities.logGreeting(greeting);
        
        return greeting;
    }
}
```

### 3. Register Activities in Module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TemporalModule } from 'nestjs-temporal-core';
import { HelloWorkflowController } from './workflows/hello.controller';
import { GreetingActivities } from './activities/greeting.activities';

@Module({
    imports: [
        TemporalModule.register({
            connection: {
                address: 'localhost:7233',
                namespace: 'default',
            },
            taskQueue: 'hello-world',
            worker: {
                workflowsPath: './dist/workflows',
                activityClasses: [GreetingActivities], // Register activities
                autoStart: true,
            },
            isGlobal: true,
        }),
    ],
    controllers: [HelloWorkflowController],
    providers: [GreetingActivities], // Add as provider for DI
})
export class AppModule {}
```

## Running the Application

### 1. Build the Application

```bash
npm run build
```

### 2. Start the Application

```bash
npm run start

# Or in development mode
npm run start:dev
```

You should see output similar to:

```
🚀 Application is running on: http://localhost:3000
[Temporal] Worker started successfully for task queue: hello-world
[Temporal] 1 workflow types discovered
[Temporal] 2 activity methods registered
```

## Testing Your Workflow

### 1. Create a Test Service

Create a service to trigger your workflow:

```typescript
// src/app.service.ts
import { Injectable } from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';

@Injectable()
export class AppService {
    constructor(private readonly temporalService: TemporalService) {}
    
    async sayHello(name: string): Promise<{ workflowId: string; result: string }> {
        const { workflowId } = await this.temporalService.startWorkflow(
            'sayHello', // Workflow method name
            [name], // Arguments
            {
                workflowId: `hello-${name}-${Date.now()}`,
            }
        );
        
        // Get the workflow handle to wait for result
        const handle = this.temporalService.getClient().getHandle(workflowId);
        const result = await handle.result();
        
        return { workflowId, result };
    }
}
```

### 2. Create a Test Controller

```typescript
// src/app.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}
    
    @Get('hello/:name')
    async sayHello(@Param('name') name: string) {
        return await this.appService.sayHello(name);
    }
}
```

### 3. Update App Module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TemporalModule } from 'nestjs-temporal-core';
import { HelloWorkflowController } from './workflows/hello.controller';
import { GreetingActivities } from './activities/greeting.activities';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
    imports: [
        TemporalModule.register({
            connection: {
                address: 'localhost:7233',
                namespace: 'default',
            },
            taskQueue: 'hello-world',
            worker: {
                workflowsPath: './dist/workflows',
                activityClasses: [GreetingActivities],
                autoStart: true,
            },
            isGlobal: true,
        }),
    ],
    controllers: [AppController, HelloWorkflowController],
    providers: [AppService, GreetingActivities],
})
export class AppModule {}
```

### 4. Test the Workflow

With your application running, test the workflow:

```bash
# Using curl
curl http://localhost:3000/hello/World

# Expected response:
{
  "workflowId": "hello-World-1234567890",
  "result": "🎉 Hello, World! This greeting was formatted by an activity."
}
```

### 5. View in Temporal Web UI

Open http://localhost:8080 to see your workflow execution in the Temporal Web UI.

## Next Steps

Congratulations! 🎉 You've successfully created your first Temporal workflow with NestJS. Here's what to explore next:

### Immediate Next Steps

1. **[⚙️ Configuration](./configuration.md)** - Learn about advanced configuration options
2. **[🍳 Examples](./examples.md)** - Explore more complex workflow patterns
3. **[📖 API Reference](./api-reference.md)** - Dive deep into all available decorators and services

### Advanced Features

- **Scheduling** - Learn about `@Cron` and `@Interval` decorators
- **Signals & Queries** - Interactive workflows
- **Error Handling** - Retries and compensation
- **Testing** - Unit and integration testing strategies

### Production Considerations

- **[🔐 Security](./security.md)** - TLS and authentication
- **[📊 Monitoring](./monitoring.md)** - Health checks and metrics
- **[🐳 Deployment](./deployment.md)** - Docker and Kubernetes deployment

### Common Patterns

- **Saga Pattern** - Distributed transactions
- **Human Tasks** - Workflows requiring approval
- **Data Pipelines** - Long-running data processing

### Troubleshooting

If you encounter issues:

1. Check the **[🔧 Troubleshooting Guide](./troubleshooting.md)**
2. Ensure Temporal server is running (`docker ps` or check port 7233)
3. Verify your TypeScript compilation (`npm run build`)
4. Check application logs for errors

### Getting Help

- **GitHub Issues** - Report bugs or request features
- **Discussions** - Ask questions and share ideas
- **Examples Repository** - Browse complete example projects

---

**[← Back to Main README](../README.md)** | **[⚙️ Configuration →](./configuration.md)**