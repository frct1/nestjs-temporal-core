# ⚙️ Configuration

This guide covers all configuration options for NestJS Temporal Core, from basic setup to advanced production configurations.

## Table of Contents

- [Configuration Methods](#configuration-methods)
- [Connection Configuration](#connection-configuration)
- [Worker Configuration](#worker-configuration)
- [Client-Only Configuration](#client-only-configuration)
- [Worker-Only Configuration](#worker-only-configuration)
- [Environment-Based Configuration](#environment-based-configuration)
- [Advanced Configuration](#advanced-configuration)
- [Configuration Validation](#configuration-validation)
- [Environment Variables](#environment-variables)

## Configuration Methods

### Synchronous Configuration

Simple, direct configuration for basic setups:

```typescript
import { Module } from '@nestjs/common';
import { TemporalModule } from 'nestjs-temporal-core';

@Module({
    imports: [
        TemporalModule.register({
            connection: {
                address: 'localhost:7233',
                namespace: 'default',
            },
            taskQueue: 'my-task-queue',
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

### Asynchronous Configuration

Dynamic configuration using ConfigService or other async providers:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TemporalModule } from 'nestjs-temporal-core';

@Module({
    imports: [
        ConfigModule.forRoot(),
        TemporalModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                connection: {
                    address: configService.get('TEMPORAL_ADDRESS', 'localhost:7233'),
                    namespace: configService.get('TEMPORAL_NAMESPACE', 'default'),
                    apiKey: configService.get('TEMPORAL_API_KEY'),
                },
                taskQueue: configService.get('TEMPORAL_TASK_QUEUE', 'default'),
                worker: {
                    workflowsPath: './dist/workflows',
                    activityClasses: [MyActivities],
                    autoStart: configService.get('NODE_ENV') !== 'test',
                },
                isGlobal: true,
            }),
        }),
    ],
})
export class AppModule {}
```

### Class-Based Configuration

Using a configuration class for better organization:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
    TemporalOptionsFactory, 
    TemporalModuleOptions,
    WORKER_PRESETS 
} from 'nestjs-temporal-core';

@Injectable()
export class TemporalConfigService implements TemporalOptionsFactory {
    constructor(private configService: ConfigService) {}

    createTemporalOptions(): TemporalModuleOptions {
        const env = this.configService.get('NODE_ENV', 'development');
        
        return {
            connection: {
                address: this.configService.get('TEMPORAL_ADDRESS', 'localhost:7233'),
                namespace: this.configService.get('TEMPORAL_NAMESPACE', 'default'),
                tls: env === 'production',
                apiKey: this.configService.get('TEMPORAL_API_KEY'),
            },
            taskQueue: this.configService.get('TEMPORAL_TASK_QUEUE', 'default'),
            worker: {
                workflowsPath: env === 'production' 
                    ? undefined 
                    : './dist/workflows',
                workflowBundle: env === 'production' 
                    ? require('./workflows-bundle') 
                    : undefined,
                activityClasses: [MyActivities],
                workerOptions: env === 'production'
                    ? WORKER_PRESETS.PRODUCTION_BALANCED
                    : WORKER_PRESETS.DEVELOPMENT,
                autoStart: env !== 'test',
            },
            isGlobal: true,
        };
    }
}

// In your module
@Module({
    imports: [
        TemporalModule.registerAsync({
            imports: [ConfigModule],
            useClass: TemporalConfigService,
        }),
    ],
})
export class AppModule {}
```

## Connection Configuration

### Basic Connection

```typescript
connection: {
    address: 'localhost:7233',
    namespace: 'default',
}
```

### Temporal Cloud Configuration

```typescript
connection: {
    address: 'mycompany.tmprl.cloud:7233',
    namespace: 'mycompany.accounting',
    apiKey: process.env.TEMPORAL_API_KEY, // Required for Temporal Cloud
    tls: true, // Required for Temporal Cloud
}
```

### Advanced TLS Configuration

```typescript
import * as fs from 'fs';

connection: {
    address: 'temporal.company.com:7233',
    namespace: 'production',
    tls: {
        serverName: 'temporal.company.com',
        clientCertPair: {
            crt: fs.readFileSync('./certs/client.crt'),
            key: fs.readFileSync('./certs/client.key'),
        },
        serverRootCACertificate: fs.readFileSync('./certs/ca.crt'),
    },
}
```

### Connection with Custom Options

```typescript
connection: {
    address: 'localhost:7233',
    namespace: 'default',
    connectOptions: {
        timeout: '30s',
        retry: {
            initialIntervalMs: 1000,
            maximumIntervalMs: 10000,
            maximumAttempts: 5,
        },
    },
}
```

## Worker Configuration

### Basic Worker Setup

```typescript
worker: {
    workflowsPath: './dist/workflows',
    activityClasses: [EmailActivities, PaymentActivities],
    autoStart: true,
}
```

### Production Worker with Bundle

```typescript
worker: {
    workflowBundle: require('./dist/workflows-bundle'), // Webpack bundle
    activityClasses: [EmailActivities, PaymentActivities],
    workerOptions: {
        maxConcurrentActivityTaskExecutions: 100,
        maxConcurrentWorkflowTaskExecutions: 50,
        reuseV8Context: true,
    },
    autoStart: true,
}
```

### Worker with Custom Options

```typescript
import { WORKER_PRESETS } from 'nestjs-temporal-core';

worker: {
    workflowsPath: './dist/workflows',
    activityClasses: [EmailActivities],
    workerOptions: {
        ...WORKER_PRESETS.PRODUCTION_HIGH_THROUGHPUT,
        // Override specific options
        maxConcurrentActivityTaskExecutions: 200,
        taskQueueRegistrationOptions: {
            description: 'Custom task queue for high-volume processing',
        },
    },
    autoStart: true,
    shutdownGraceTime: '10s',
}
```

### Worker Presets

Use predefined worker configurations:

```typescript
import { WORKER_PRESETS } from 'nestjs-temporal-core';

// Development preset
worker: {
    workflowsPath: './dist/workflows',
    activityClasses: [MyActivities],
    workerOptions: WORKER_PRESETS.DEVELOPMENT,
}

// Production presets
worker: {
    workflowBundle: require('./workflows-bundle'),
    activityClasses: [MyActivities],
    workerOptions: WORKER_PRESETS.PRODUCTION_BALANCED, // or PRODUCTION_HIGH_THROUGHPUT
}
```

Available presets:
- `DEVELOPMENT` - Optimized for local development
- `PRODUCTION_BALANCED` - Balanced performance for production
- `PRODUCTION_HIGH_THROUGHPUT` - Maximum throughput for high-load scenarios

## Client-Only Configuration

For applications that only start workflows but don't execute them:

```typescript
import { Module } from '@nestjs/common';
import { TemporalModule } from 'nestjs-temporal-core';

@Module({
    imports: [
        TemporalModule.forClient({
            connection: {
                address: 'temporal.company.com:7233',
                namespace: 'production',
                tls: true,
                apiKey: process.env.TEMPORAL_API_KEY,
            },
        }),
    ],
})
export class ClientModule {}
```

### Client with Custom Options

```typescript
TemporalModule.forClient({
    connection: {
        address: 'localhost:7233',
        namespace: 'default',
    },
    clientOptions: {
        retryOptions: {
            initialIntervalMs: 100,
            maximumIntervalMs: 5000,
            maximumAttempts: 10,
        },
    },
})
```

## Worker-Only Configuration

For dedicated worker processes:

```typescript
import { Module } from '@nestjs/common';
import { TemporalModule } from 'nestjs-temporal-core';

@Module({
    imports: [
        TemporalModule.forWorker({
            connection: {
                address: 'localhost:7233',
                namespace: 'default',
            },
            taskQueue: 'worker-queue',
            workflowsPath: './dist/workflows',
            activityClasses: [ProcessingActivities],
            workerOptions: {
                maxConcurrentActivityTaskExecutions: 50,
                maxConcurrentWorkflowTaskExecutions: 20,
            },
        }),
    ],
})
export class WorkerModule {}
```

## Environment-Based Configuration

### Complete Environment-Aware Setup

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TemporalModule, WORKER_PRESETS } from 'nestjs-temporal-core';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),
        TemporalModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const env = configService.get('NODE_ENV', 'development');
                const isProduction = env === 'production';
                const isTest = env === 'test';

                return {
                    connection: {
                        address: configService.get('TEMPORAL_ADDRESS', 'localhost:7233'),
                        namespace: configService.get('TEMPORAL_NAMESPACE', 'default'),
                        tls: isProduction ? {
                            serverName: configService.get('TEMPORAL_TLS_SERVER_NAME'),
                            clientCertPair: {
                                crt: Buffer.from(configService.get('TEMPORAL_CLIENT_CERT', ''), 'base64'),
                                key: Buffer.from(configService.get('TEMPORAL_CLIENT_KEY', ''), 'base64'),
                            },
                            serverRootCACertificate: Buffer.from(configService.get('TEMPORAL_CA_CERT', ''), 'base64'),
                        } : false,
                        apiKey: configService.get('TEMPORAL_API_KEY'),
                    },
                    taskQueue: configService.get('TEMPORAL_TASK_QUEUE', 'default'),
                    worker: !isTest ? {
                        workflowsPath: isProduction ? undefined : './dist/workflows',
                        workflowBundle: isProduction ? require('./workflows-bundle') : undefined,
                        activityClasses: [MyActivities],
                        workerOptions: isProduction 
                            ? WORKER_PRESETS.PRODUCTION_BALANCED 
                            : WORKER_PRESETS.DEVELOPMENT,
                        autoStart: true,
                        shutdownGraceTime: configService.get('TEMPORAL_SHUTDOWN_GRACE_TIME', '30s'),
                    } : undefined,
                    isGlobal: true,
                };
            },
        }),
    ],
})
export class AppModule {}
```

### Feature Flags

```typescript
useFactory: (configService: ConfigService) => ({
    connection: {
        address: configService.get('TEMPORAL_ADDRESS', 'localhost:7233'),
        namespace: configService.get('TEMPORAL_NAMESPACE', 'default'),
    },
    taskQueue: configService.get('TEMPORAL_TASK_QUEUE', 'default'),
    worker: configService.get('ENABLE_WORKER', 'true') === 'true' ? {
        workflowsPath: './dist/workflows',
        activityClasses: [MyActivities],
        autoStart: configService.get('AUTO_START_WORKER', 'true') === 'true',
    } : undefined,
    features: {
        enableScheduling: configService.get('ENABLE_SCHEDULING', 'true') === 'true',
        enableMetrics: configService.get('ENABLE_METRICS', 'false') === 'true',
        enableHealthChecks: configService.get('ENABLE_HEALTH_CHECKS', 'true') === 'true',
    },
    isGlobal: true,
})
```

## Advanced Configuration

### Multiple Task Queues

```typescript
// Primary configuration
TemporalModule.register({
    connection: {
        address: 'localhost:7233',
        namespace: 'default',
    },
    taskQueue: 'default-queue',
    worker: {
        workflowsPath: './dist/workflows',
        activityClasses: [DefaultActivities],
    },
    isGlobal: true,
})

// Additional workers can be configured separately
TemporalModule.forWorker({
    connection: {
        address: 'localhost:7233',
        namespace: 'default',
    },
    taskQueue: 'priority-queue',
    workflowsPath: './dist/priority-workflows',
    activityClasses: [PriorityActivities],
    workerOptions: WORKER_PRESETS.PRODUCTION_HIGH_THROUGHPUT,
})
```

### Custom Activity Registration

```typescript
worker: {
    workflowsPath: './dist/workflows',
    activityClasses: [EmailActivities, PaymentActivities],
    customActivities: {
        // Register activities with custom names
        'custom-send-email': EmailActivities.prototype.sendEmail,
        'custom-process-payment': PaymentActivities.prototype.processPayment,
    },
    autoStart: true,
}
```

### Interceptors and Middleware

```typescript
worker: {
    workflowsPath: './dist/workflows',
    activityClasses: [MyActivities],
    workerOptions: {
        interceptors: {
            workflowModules: [require('./interceptors/workflow-interceptor')],
            activityInbound: [require('./interceptors/activity-interceptor')],
        },
    },
    autoStart: true,
}
```

## Configuration Validation

### Using Class Validator

```typescript
import { IsString, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ConnectionConfig {
    @IsString()
    address: string;

    @IsString()
    namespace: string;

    @IsOptional()
    @IsString()
    apiKey?: string;

    @IsOptional()
    @IsBoolean()
    tls?: boolean;
}

class TemporalConfig {
    @ValidateNested()
    @Type(() => ConnectionConfig)
    connection: ConnectionConfig;

    @IsString()
    taskQueue: string;

    @IsOptional()
    @IsBoolean()
    isGlobal?: boolean;
}

// Use in your configuration factory
useFactory: async (configService: ConfigService) => {
    const config = new TemporalConfig();
    config.connection = {
        address: configService.get('TEMPORAL_ADDRESS', 'localhost:7233'),
        namespace: configService.get('TEMPORAL_NAMESPACE', 'default'),
        apiKey: configService.get('TEMPORAL_API_KEY'),
    };
    config.taskQueue = configService.get('TEMPORAL_TASK_QUEUE', 'default');
    
    // Validate configuration
    const errors = await validate(config);
    if (errors.length > 0) {
        throw new Error(`Invalid Temporal configuration: ${errors}`);
    }
    
    return config;
}
```

### Custom Validation

```typescript
useFactory: (configService: ConfigService) => {
    const address = configService.get('TEMPORAL_ADDRESS');
    const namespace = configService.get('TEMPORAL_NAMESPACE');
    
    if (!address) {
        throw new Error('TEMPORAL_ADDRESS is required');
    }
    
    if (!namespace) {
        throw new Error('TEMPORAL_NAMESPACE is required');
    }
    
    // Validate address format
    if (!/^[^:]+:\d+$/.test(address)) {
        throw new Error('TEMPORAL_ADDRESS must be in format host:port');
    }
    
    return {
        connection: { address, namespace },
        taskQueue: configService.get('TEMPORAL_TASK_QUEUE', 'default'),
        // ... rest of configuration
    };
}
```

## Environment Variables

### Complete Environment Variable Reference

```bash
# Connection Configuration
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_API_KEY=your-api-key-here

# TLS Configuration (for production)
TEMPORAL_TLS_SERVER_NAME=temporal.company.com
TEMPORAL_CLIENT_CERT=base64-encoded-client-cert
TEMPORAL_CLIENT_KEY=base64-encoded-client-key
TEMPORAL_CA_CERT=base64-encoded-ca-cert

# Worker Configuration
TEMPORAL_TASK_QUEUE=my-task-queue
TEMPORAL_SHUTDOWN_GRACE_TIME=30s
ENABLE_WORKER=true
AUTO_START_WORKER=true

# Feature Flags
ENABLE_SCHEDULING=true
ENABLE_METRICS=false
ENABLE_HEALTH_CHECKS=true

# Environment Control
NODE_ENV=production
```

### Environment File Examples

**Development (.env.development):**
```bash
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=development
TEMPORAL_TASK_QUEUE=dev-queue
ENABLE_WORKER=true
AUTO_START_WORKER=true
ENABLE_SCHEDULING=true
ENABLE_METRICS=false
```

**Production (.env.production):**
```bash
TEMPORAL_ADDRESS=temporal.company.com:7233
TEMPORAL_NAMESPACE=production
TEMPORAL_API_KEY=${TEMPORAL_API_KEY}
TEMPORAL_TLS_SERVER_NAME=temporal.company.com
TEMPORAL_CLIENT_CERT=${TEMPORAL_CLIENT_CERT}
TEMPORAL_CLIENT_KEY=${TEMPORAL_CLIENT_KEY}
TEMPORAL_CA_CERT=${TEMPORAL_CA_CERT}
TEMPORAL_TASK_QUEUE=prod-queue
TEMPORAL_SHUTDOWN_GRACE_TIME=60s
ENABLE_WORKER=true
AUTO_START_WORKER=true
ENABLE_SCHEDULING=true
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
```

**Testing (.env.test):**
```bash
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=test
TEMPORAL_TASK_QUEUE=test-queue
ENABLE_WORKER=false
AUTO_START_WORKER=false
ENABLE_SCHEDULING=false
ENABLE_METRICS=false
```

## Configuration Examples by Use Case

### Microservice with Temporal

```typescript
// Each microservice has its own namespace and task queue
TemporalModule.registerAsync({
    useFactory: (configService: ConfigService) => ({
        connection: {
            address: configService.get('TEMPORAL_ADDRESS'),
            namespace: `${configService.get('SERVICE_NAME')}-${configService.get('NODE_ENV')}`,
        },
        taskQueue: `${configService.get('SERVICE_NAME')}-queue`,
        worker: {
            workflowsPath: './dist/workflows',
            activityClasses: [ServiceActivities],
            autoStart: true,
        },
        isGlobal: true,
    }),
})
```

### Multi-Tenant Application

```typescript
// Dynamic namespace based on tenant
TemporalModule.registerAsync({
    useFactory: (configService: ConfigService) => ({
        connection: {
            address: configService.get('TEMPORAL_ADDRESS'),
            namespace: 'default', // Use scheduling or dynamic clients for tenants
        },
        taskQueue: 'multi-tenant-queue',
        worker: {
            workflowsPath: './dist/workflows',
            activityClasses: [TenantActivities],
            autoStart: true,
        },
        isGlobal: true,
    }),
})
```

### Serverless/Lambda Configuration

```typescript
// Client-only for serverless functions
TemporalModule.forClient({
    connection: {
        address: process.env.TEMPORAL_ADDRESS,
        namespace: process.env.TEMPORAL_NAMESPACE,
        apiKey: process.env.TEMPORAL_API_KEY,
        tls: true,
    },
    clientOptions: {
        retryOptions: {
            maximumAttempts: 3, // Shorter retry for serverless timeouts
        },
    },
})
```

---

**[← Getting Started](./getting-started.md)** | **[📖 API Reference →](./api-reference.md)**