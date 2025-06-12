# NestJS Temporal Core

A comprehensive NestJS integration for [Temporal.io](https://temporal.io/) that provides seamless workflow orchestration with auto-discovery, declarative scheduling, and enterprise-ready features.

[![npm version](https://badge.fury.io/js/nestjs-temporal-core.svg)](https://badge.fury.io/js/nestjs-temporal-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

## Overview

NestJS Temporal Core brings the power of Temporal's durable execution to NestJS applications with native decorator patterns, automatic discovery, and comprehensive lifecycle management. Build reliable distributed systems with workflows, activities, and scheduled tasks.

## 🚀 Key Features

- **🎯 NestJS-Native Integration** - Familiar decorator patterns (`@WorkflowController`, `@Activity`, `@Cron`)
- **🔍 Auto-Discovery** - Automatic detection of workflows, activities, and scheduled tasks
- **📅 Declarative Scheduling** - Built-in cron and interval scheduling with `@Cron` and `@Interval`
- **🔄 Unified Service** - Single `TemporalService` for all operations (workflows, signals, queries, schedules)
- **⚙️ Flexible Configuration** - Support for client-only, worker-only, or unified deployments
- **🏥 Health Monitoring** - Built-in health checks and status monitoring
- **🔧 Production Ready** - TLS support, connection management, graceful shutdowns
- **📊 Schedule Management** - Full lifecycle management of scheduled workflows

## 📦 Installation

```bash
npm install nestjs-temporal-core @temporalio/client @temporalio/worker @temporalio/workflow
```

## 🚀 Quick Start

### 1. Basic Module Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TemporalModule } from 'nestjs-temporal-core';

@Module({
    imports: [
        TemporalModule.register({
            connection: {
                address: 'localhost:7233',
                namespace: 'default',
            },
            taskQueue: 'my-app',
            worker: {
                workflowsPath: './dist/workflows',
                activityClasses: [EmailActivities],
                autoStart: true,
            },
            isGlobal: true,
        }),
    ],
})
export class AppModule {}
```

### 2. Create Activities

```typescript
// activities/email.activities.ts
import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';

@Injectable()
@Activity()
export class EmailActivities {
    @ActivityMethod()
    async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
        console.log(`Sending welcome email to ${email}`);
        // Email sending logic here
        return true;
    }

    @ActivityMethod()
    async sendNotification(email: string, message: string): Promise<void> {
        console.log(`Sending notification to ${email}: ${message}`);
        // Notification logic here
    }
}
```

### 3. Create Workflow Controller

```typescript
// workflows/user.controller.ts
import { WorkflowController, WorkflowMethod, Signal, Query, Cron } from 'nestjs-temporal-core';
import { proxyActivities } from '@temporalio/workflow';

interface EmailActivities {
    sendWelcomeEmail(email: string, name: string): Promise<boolean>;
    sendNotification(email: string, message: string): Promise<void>;
}

const activities = proxyActivities<EmailActivities>({
    startToCloseTimeout: '1m',
});

@WorkflowController({ taskQueue: 'user-workflows' })
export class UserWorkflowController {
    private status = 'pending';

    @WorkflowMethod()
    async onboardUser(email: string, name: string): Promise<string> {
        this.status = 'processing';

        // Send welcome email
        await activities.sendWelcomeEmail(email, name);

        // Send follow-up notification
        await activities.sendNotification(email, 'Welcome to our platform!');

        this.status = 'completed';
        return this.status;
    }

    @Cron('0 9 * * *', {
        scheduleId: 'daily-user-report',
        description: 'Daily user onboarding report',
    })
    @WorkflowMethod()
    async generateDailyReport(): Promise<void> {
        console.log('Generating daily user report...');
        // Report generation logic
    }

    @Signal('updateStatus')
    async updateUserStatus(newStatus: string): Promise<void> {
        this.status = newStatus;
    }

    @Query('getStatus')
    getUserStatus(): string {
        return this.status;
    }
}
```

### 4. Use in Services

```typescript
// services/user.service.ts
import { Injectable } from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';

@Injectable()
export class UserService {
    constructor(private readonly temporal: TemporalService) {}

    async onboardNewUser(email: string, name: string): Promise<string> {
        const { workflowId } = await this.temporal.startWorkflow('onboardUser', [email, name], {
            taskQueue: 'user-workflows',
            workflowId: `onboard-${email}-${Date.now()}`,
        });

        return workflowId;
    }

    async getUserStatus(workflowId: string): Promise<string> {
        return await this.temporal.queryWorkflow(workflowId, 'getStatus');
    }

    async updateUserStatus(workflowId: string, status: string): Promise<void> {
        await this.temporal.signalWorkflow(workflowId, 'updateStatus', [status]);
    }
}
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     NestJS Application                      │
├─────────────────────────────────────────────────────────────┤
│  Controllers    │    Services    │   Workflow Controllers   │
│  - UserController │ - UserService  │ - @WorkflowController   │
│  - API Endpoints  │ - Business Logic│ - @WorkflowMethod      │
├─────────────────────────────────────────────────────────────┤
│                    TemporalService                          │
│  - startWorkflow()  │ - signalWorkflow() │ - queryWorkflow() │
│  - scheduleManagement │ - discovery │ - healthChecks        │
├─────────────────────────────────────────────────────────────┤
│    Client Module    │    Worker Module    │  Discovery       │
│ - TemporalClient    │ - WorkerManager     │ - Auto-discovery │
│ - ScheduleService   │ - ActivityRegistry  │ - Schedule Mgmt  │
├─────────────────────────────────────────────────────────────┤
│                    Temporal Server                          │
│              Workflows ←→ Activities ←→ Schedules            │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Core Concepts

### Workflow Controllers

Define durable workflows using familiar NestJS controller patterns:

```typescript
@WorkflowController({ taskQueue: 'orders' })
export class OrderWorkflowController {
    @WorkflowMethod()
    async processOrder(orderId: string): Promise<string> {
        // Durable workflow logic
    }
}
```

### Activities

Implement business logic that can be retried and monitored:

```typescript
@Activity()
export class PaymentActivities {
    @ActivityMethod()
    async processPayment(amount: number): Promise<string> {
        // External API calls, database operations
    }
}
```

### Scheduling

Declare scheduled workflows with cron expressions or intervals:

```typescript
@Cron('0 8 * * *', { scheduleId: 'daily-report' })
@WorkflowMethod()
async generateReport(): Promise<void> {
  // Scheduled workflow logic
}
```

## 🎯 Use Cases

- **Order Processing** - Reliable order fulfillment with compensation
- **User Onboarding** - Multi-step user journeys with timeouts
- **Data Pipelines** - Long-running ETL processes
- **Scheduled Tasks** - Cron jobs and recurring workflows
- **Saga Patterns** - Distributed transaction management
- **Payment Processing** - Multi-step payment flows with retries

## ⚙️ Configuration Options

### Basic Configuration

```typescript
TemporalModule.register({
    connection: {
        address: 'localhost:7233',
        namespace: 'default',
    },
    taskQueue: 'my-app',
    worker: {
        workflowsPath: './dist/workflows',
        activityClasses: [EmailActivities, PaymentActivities],
    },
});
```

### Client-Only Mode

```typescript
TemporalModule.forClient({
    connection: {
        address: 'temporal.company.com:7233',
        namespace: 'production',
        tls: true,
        apiKey: process.env.TEMPORAL_API_KEY,
    },
});
```

### Async Configuration

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
            activityClasses: [EmailActivities],
        },
    }),
    inject: [ConfigService],
});
```

## 🔧 Advanced Features

### Health Monitoring

```typescript
// Get system status
const status = await temporalService.getSystemStatus();
console.log('Workflows discovered:', status.discovery.methods);
console.log('Active schedules:', status.schedules.active);

// Worker health check
const health = await temporalService.getWorkerHealth();
console.log('Worker status:', health.status);
```

### Schedule Management

```typescript
// Manage discovered schedules
await temporalService.pauseSchedule('daily-report', 'Maintenance mode');
await temporalService.resumeSchedule('daily-report');
await temporalService.triggerSchedule('daily-report'); // Run now

// Get schedule information
const schedules = temporalService.getManagedSchedules();
const stats = temporalService.getScheduleStats();
```

### Discovery Introspection

```typescript
// Discover available workflows
const workflows = temporalService.getAvailableWorkflows();
const workflowInfo = temporalService.getWorkflowInfo('processOrder');

// Check capabilities
if (temporalService.hasWorkflow('processOrder')) {
    // Start the workflow
}
```

## 📊 Monitoring & Observability

The package provides comprehensive monitoring capabilities:

- **Worker Status** - Health checks, uptime, activity counts
- **Schedule Management** - Active/paused schedules, execution stats
- **Discovery Metrics** - Discovered workflows, activities, schedules
- **Connection Health** - Client connection status and errors

## 🌍 Environment Support

- **Development** - Filesystem-based workflows, enhanced logging
- **Production** - Bundled workflows, optimized worker settings
- **Testing** - Mock support, isolated testing capabilities

## 📚 Documentation

- **[Getting Started](./docs/getting-started.md)** - Installation and basic setup
- **[Configuration](./docs/configuration.md)** - Complete configuration guide
- **[API Reference](./docs/api-reference.md)** - Detailed API documentation
- **[Examples](./docs/examples.md)** - Real-world examples and patterns

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Temporal.io](https://temporal.io/) - For the amazing workflow engine
- [NestJS](https://nestjs.com/) - For the incredible framework
- The Temporal community for inspiration and feedback

---

Built with ❤️ for the NestJS and Temporal communities.
