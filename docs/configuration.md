# ⚙️ Configuration Guide

Comprehensive configuration guide for NestJS Temporal Core, covering all deployment scenarios from development to production.

## Table of Contents

- [Configuration Methods](#configuration-methods)
- [Connection Configuration](#connection-configuration)
- [Worker Configuration](#worker-configuration)
- [Client-Only Configuration](#client-only-configuration)
- [Environment-Based Configuration](#environment-based-configuration)
- [Production Configuration](#production-configuration)
- [Advanced Configuration](#advanced-configuration)
- [Configuration Validation](#configuration-validation)

## Configuration Methods

### Synchronous Configuration

Direct configuration for simple setups:

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
            taskQueue: 'my-app',
            worker: {
                workflowsPath: './dist/workflows',
                activityClasses: [EmailActivities, PaymentActivities],
                autoStart: true,
            },
            isGlobal: true,
        }),
    ],
})
export class AppModule {}
```

### Asynchronous Configuration

Dynamic configuration using ConfigService or other providers:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TemporalModule } from 'nestjs-temporal-core';

@Module({
    imports: [
        ConfigModule.forRoot(),
        TemporalModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                connection: {
                    address: configService.get('TEMPORAL_ADDRESS', 'localhost:7233'),
                    namespace: configService.get('TEMPORAL_NAMESPACE', 'default'),
                    apiKey: configService.get('TEMPORAL_API_KEY'),
                    tls: configService.get('NODE_ENV') === 'production',
                },
                taskQueue: configService.get('TEMPORAL_TASK_QUEUE', 'default'),
                worker: {
                    workflowsPath:
                        configService.get('NODE_ENV') === 'production'
                            ? undefined
                            : './dist/workflows',
                    workflowBundle:
                        configService.get('NODE_ENV') === 'production'
                            ? require('./workflows-bundle')
                            : undefined,
                    activityClasses: [EmailActivities, PaymentActivities],
                    autoStart: configService.get('NODE_ENV') !== 'test',
                },
                isGlobal: true,
            }),
            inject: [ConfigService],
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
import { TemporalOptionsFactory, TemporalOptions, WORKER_PRESETS } from 'nestjs-temporal-core';

@Injectable()
export class TemporalConfigService implements TemporalOptionsFactory {
    constructor(private configService: ConfigService) {}

    createTemporalOptions(): TemporalOptions {
        const env = this.configService.get('NODE_ENV', 'development');
        const isProduction = env === 'production';

        return {
            connection: {
                address: this.configService.get('TEMPORAL_ADDRESS', 'localhost:7233'),
                namespace: this.configService.get('TEMPORAL_NAMESPACE', 'default'),
                tls: isProduction,
                apiKey: this.configService.get('TEMPORAL_API_KEY'),
            },
            taskQueue: this.configService.get('TEMPORAL_TASK_QUEUE', 'default'),
            worker: {
                workflowsPath: isProduction ? undefined : './dist/workflows',
                workflowBundle: isProduction ? require('./workflows-bundle') : undefined,
                activityClasses: [EmailActivities, PaymentActivities],
                workerOptions: isProduction
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

### Local Development

```typescript
connection: {
  address: 'localhost:7233',
  namespace: 'development',
}
```

### Temporal Cloud

```typescript
connection: {
  address: 'mycompany.tmprl.cloud:7233',
  namespace: 'mycompany.accounting',
  apiKey: process.env.TEMPORAL_API_KEY, // Required for Temporal Cloud
  tls: true, // Required for Temporal Cloud
}
```

### Self-Hosted with TLS

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
      ca: fs.readFileSync('./certs/ca.crt'),
    },
  },
}
```

### Connection with Custom Headers

```typescript
connection: {
  address: 'localhost:7233',
  namespace: 'default',
  metadata: {
    'custom-header': 'value',
    'authorization': 'Bearer token',
  },
}
```

## Worker Configuration

### Development Setup

```typescript
worker: {
  workflowsPath: './dist/workflows',
  activityClasses: [EmailActivities, PaymentActivities],
  autoStart: true,
  workerOptions: {
    maxConcurrentActivityTaskExecutions: 10,
    maxConcurrentWorkflowTaskExecutions: 5,
    reuseV8Context: false, // Better for debugging
  },
}
```

### Production Setup with Bundle

```typescript
worker: {
  workflowBundle: require('./dist/workflows-bundle'), // Webpack bundle
  activityClasses: [EmailActivities, PaymentActivities],
  autoStart: true,
  workerOptions: {
    maxConcurrentActivityTaskExecutions: 100,
    maxConcurrentWorkflowTaskExecutions: 50,
    reuseV8Context: true,
    buildId: process.env.BUILD_ID,
    identity: `worker-${process.env.HOSTNAME}`,
  },
}
```

### Worker Presets

Use predefined configurations:

```typescript
import { WORKER_PRESETS } from 'nestjs-temporal-core';

worker: {
  workflowsPath: './dist/workflows',
  activityClasses: [MyActivities],
  workerOptions: WORKER_PRESETS.PRODUCTION_BALANCED,
}

// Available presets:
// - DEVELOPMENT: Optimized for local development
// - PRODUCTION_BALANCED: Balanced performance for production
// - PRODUCTION_HIGH_THROUGHPUT: Maximum throughput
// - PRODUCTION_MINIMAL: Resource-constrained environments
```

### Custom Worker Options

```typescript
worker: {
  workflowsPath: './dist/workflows',
  activityClasses: [MyActivities],
  workerOptions: {
    // Concurrency settings
    maxConcurrentActivityTaskExecutions: 200,
    maxConcurrentWorkflowTaskExecutions: 80,
    maxConcurrentLocalActivityExecutions: 200,

    // Rate limiting
    maxActivitiesPerSecond: 1000,
    maxTaskQueueActivitiesPerSecond: 500,

    // Performance settings
    reuseV8Context: true,

    // Timeouts
    stickyQueueScheduleToStartTimeout: '10s',
    maxHeartbeatThrottleInterval: '60s',
    defaultHeartbeatThrottleInterval: '30s',

    // Identity and versioning
    identity: 'my-worker-instance',
    buildId: 'v1.2.3',
    useVersioning: true,

    // Advanced features
    interceptors: [
      // Custom interceptors
    ],
  },
}
```

## Client-Only Configuration

For applications that only start workflows but don't execute them:

### Basic Client-Only

```typescript
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
            isGlobal: true,
        }),
    ],
})
export class ClientModule {}
```

### Async Client-Only

```typescript
@Module({
    imports: [
        TemporalClientModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                connection: {
                    address: configService.get('TEMPORAL_ADDRESS'),
                    namespace: configService.get('TEMPORAL_NAMESPACE'),
                    apiKey: configService.get('TEMPORAL_API_KEY'),
                    tls: configService.get('NODE_ENV') === 'production',
                },
                allowConnectionFailure: true,
            }),
            inject: [ConfigService],
        }),
    ],
})
export class ClientModule {}
```

## Environment-Based Configuration

### Complete Environment Setup

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
            useFactory: (configService: ConfigService) => {
                const env = configService.get('NODE_ENV', 'development');
                const isProduction = env === 'production';
                const isTest = env === 'test';

                return {
                    connection: {
                        address: configService.get('TEMPORAL_ADDRESS', 'localhost:7233'),
                        namespace: configService.get('TEMPORAL_NAMESPACE', 'default'),
                        tls: isProduction
                            ? {
                                  serverName: configService.get('TEMPORAL_TLS_SERVER_NAME'),
                                  clientCertPair: configService.get('TEMPORAL_CLIENT_CERT')
                                      ? {
                                            crt: Buffer.from(
                                                configService.get('TEMPORAL_CLIENT_CERT'),
                                                'base64',
                                            ),
                                            key: Buffer.from(
                                                configService.get('TEMPORAL_CLIENT_KEY'),
                                                'base64',
                                            ),
                                            ca: Buffer.from(
                                                configService.get('TEMPORAL_CA_CERT'),
                                                'base64',
                                            ),
                                        }
                                      : undefined,
                              }
                            : false,
                        apiKey: configService.get('TEMPORAL_API_KEY'),
                    },
                    taskQueue: configService.get('TEMPORAL_TASK_QUEUE', 'default'),
                    worker: !isTest
                        ? {
                              workflowsPath: isProduction ? undefined : './dist/workflows',
                              workflowBundle: isProduction
                                  ? require('./workflows-bundle')
                                  : undefined,
                              activityClasses: [MyActivities],
                              workerOptions: isProduction
                                  ? WORKER_PRESETS.PRODUCTION_BALANCED
                                  : WORKER_PRESETS.DEVELOPMENT,
                              autoStart: configService.get('AUTO_START_WORKER', 'true') === 'true',
                          }
                        : undefined,
                    isGlobal: true,
                };
            },
            inject: [ConfigService],
        }),
    ],
})
export class AppModule {}
```

### Environment Variables

```bash
# .env.development
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=development
TEMPORAL_TASK_QUEUE=dev-queue
AUTO_START_WORKER=true

# .env.production
TEMPORAL_ADDRESS=temporal.company.com:7233
TEMPORAL_NAMESPACE=production
TEMPORAL_API_KEY=${TEMPORAL_API_KEY}
TEMPORAL_TLS_SERVER_NAME=temporal.company.com
TEMPORAL_CLIENT_CERT=${TEMPORAL_CLIENT_CERT}
TEMPORAL_CLIENT_KEY=${TEMPORAL_CLIENT_KEY}
TEMPORAL_CA_CERT=${TEMPORAL_CA_CERT}
TEMPORAL_TASK_QUEUE=prod-queue
AUTO_START_WORKER=true

# .env.test
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=test
TEMPORAL_TASK_QUEUE=test-queue
AUTO_START_WORKER=false
```

## Production Configuration

### Temporal Cloud Production

```typescript
TemporalModule.register({
    connection: {
        address: 'mycompany.tmprl.cloud:7233',
        namespace: 'mycompany.production',
        apiKey: process.env.TEMPORAL_API_KEY,
        tls: true,
    },
    taskQueue: 'production-queue',
    worker: {
        workflowBundle: require('./workflows-bundle'),
        activityClasses: [EmailActivities, PaymentActivities, NotificationActivities],
        workerOptions: {
            ...WORKER_PRESETS.PRODUCTION_HIGH_THROUGHPUT,
            buildId: process.env.BUILD_ID,
            identity: `worker-${process.env.HOSTNAME}-${process.env.POD_NAME}`,
        },
        autoStart: true,
    },
    isGlobal: true,
});
```

### Self-Hosted Production

```typescript
import * as fs from 'fs';

TemporalModule.register({
    connection: {
        address: 'temporal.internal:7233',
        namespace: 'production',
        tls: {
            serverName: 'temporal.internal',
            clientCertPair: {
                crt: fs.readFileSync('/etc/ssl/temporal/client.crt'),
                key: fs.readFileSync('/etc/ssl/temporal/client.key'),
                ca: fs.readFileSync('/etc/ssl/temporal/ca.crt'),
            },
        },
        metadata: {
            'service-name': 'order-service',
            'service-version': process.env.SERVICE_VERSION,
        },
    },
    taskQueue: 'order-processing',
    worker: {
        workflowBundle: require('./workflows-bundle'),
        activityClasses: [OrderActivities, PaymentActivities],
        workerOptions: {
            maxConcurrentActivityTaskExecutions: 200,
            maxConcurrentWorkflowTaskExecutions: 100,
            reuseV8Context: true,
            buildId: process.env.BUILD_ID,
            identity: `order-worker-${process.env.HOSTNAME}`,
            maxActivitiesPerSecond: 1000,
        },
        autoStart: true,
    },
    isGlobal: true,
});
```

### Microservice Configuration

```typescript
// Each microservice has its own configuration
TemporalModule.registerAsync({
    useFactory: (configService: ConfigService) => ({
        connection: {
            address: configService.get('TEMPORAL_ADDRESS'),
            namespace: `${configService.get('SERVICE_NAME')}-${configService.get('NODE_ENV')}`,
            apiKey: configService.get('TEMPORAL_API_KEY'),
            tls: configService.get('NODE_ENV') === 'production',
        },
        taskQueue: `${configService.get('SERVICE_NAME')}-queue`,
        worker: {
            workflowBundle: require('./workflows-bundle'),
            activityClasses: [ServiceActivities],
            workerOptions: {
                identity: `${configService.get('SERVICE_NAME')}-${process.env.HOSTNAME}`,
                buildId: configService.get('BUILD_ID'),
            },
            autoStart: true,
        },
        isGlobal: true,
    }),
});
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
});

// Additional worker for high-priority tasks
TemporalWorkerModule.register({
    connection: {
        address: 'localhost:7233',
        namespace: 'default',
    },
    taskQueue: 'priority-queue',
    workflowsPath: './dist/priority-workflows',
    activityClasses: [PriorityActivities],
    workerOptions: WORKER_PRESETS.PRODUCTION_HIGH_THROUGHPUT,
});
```

### Conditional Worker Registration

```typescript
TemporalModule.registerAsync({
    useFactory: (configService: ConfigService) => {
        const config: TemporalOptions = {
            connection: {
                address: configService.get('TEMPORAL_ADDRESS'),
                namespace: configService.get('TEMPORAL_NAMESPACE'),
            },
            taskQueue: configService.get('TEMPORAL_TASK_QUEUE'),
            isGlobal: true,
        };

        // Only enable worker in specific environments
        if (configService.get('ENABLE_WORKER', 'false') === 'true') {
            config.worker = {
                workflowBundle: require('./workflows-bundle'),
                activityClasses: [MyActivities],
                autoStart: true,
            };
        }

        return config;
    },
});
```

### Custom Activity Registration

```typescript
worker: {
  workflowsPath: './dist/workflows',
  activityClasses: [EmailActivities, PaymentActivities],
  workerOptions: {
    // Custom activity name mapping
    activities: {
      'custom-send-email': EmailActivities.prototype.sendEmail,
      'custom-process-payment': PaymentActivities.prototype.processPayment,
    },
  },
}
```

### Interceptors and Middleware

```typescript
worker: {
  workflowsPath: './dist/workflows',
  activityClasses: [MyActivities],
  workerOptions: {
    interceptors: [
      // Custom workflow interceptors
      require('./interceptors/workflow-interceptor'),
      // Custom activity interceptors
      require('./interceptors/activity-interceptor'),
    ],
  },
}
```

## Configuration Validation

### Using Class Validator

```typescript
import { IsString, IsOptional, IsBoolean, ValidateNested, IsNumber } from 'class-validator';
import { Type, Transform } from 'class-transformer';

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
    @Transform(({ value }) => value === 'true')
    tls?: boolean;
}

class WorkerConfig {
    @IsOptional()
    @IsString()
    workflowsPath?: string;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true')
    autoStart?: boolean;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseInt(value))
    maxConcurrentActivityTaskExecutions?: number;
}

class TemporalConfig {
    @ValidateNested()
    @Type(() => ConnectionConfig)
    connection: ConnectionConfig;

    @IsString()
    taskQueue: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => WorkerConfig)
    worker?: WorkerConfig;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true')
    isGlobal?: boolean;
}

// Use in configuration factory
useFactory: async (configService: ConfigService) => {
    const config = plainToClass(TemporalConfig, {
        connection: {
            address: configService.get('TEMPORAL_ADDRESS'),
            namespace: configService.get('TEMPORAL_NAMESPACE'),
            apiKey: configService.get('TEMPORAL_API_KEY'),
            tls: configService.get('TEMPORAL_TLS'),
        },
        taskQueue: configService.get('TEMPORAL_TASK_QUEUE'),
        worker: {
            workflowsPath: configService.get('TEMPORAL_WORKFLOWS_PATH'),
            autoStart: configService.get('TEMPORAL_AUTO_START'),
            maxConcurrentActivityTaskExecutions: configService.get('TEMPORAL_MAX_ACTIVITIES'),
        },
        isGlobal: configService.get('TEMPORAL_GLOBAL'),
    });

    const errors = await validate(config);
    if (errors.length > 0) {
        throw new Error(`Temporal configuration validation failed: ${errors}`);
    }

    return config;
};
```

### Custom Validation

```typescript
useFactory: (configService: ConfigService) => {
    const address = configService.get('TEMPORAL_ADDRESS');
    const namespace = configService.get('TEMPORAL_NAMESPACE');
    const taskQueue = configService.get('TEMPORAL_TASK_QUEUE');

    // Required field validation
    if (!address) {
        throw new Error('TEMPORAL_ADDRESS is required');
    }

    if (!namespace) {
        throw new Error('TEMPORAL_NAMESPACE is required');
    }

    if (!taskQueue) {
        throw new Error('TEMPORAL_TASK_QUEUE is required');
    }

    // Format validation
    if (!/^[^:]+:\d+$/.test(address)) {
        throw new Error('TEMPORAL_ADDRESS must be in format host:port');
    }

    // Namespace validation
    if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(namespace)) {
        throw new Error('TEMPORAL_NAMESPACE must be alphanumeric with hyphens');
    }

    return {
        connection: { address, namespace },
        taskQueue,
        // ... rest of configuration
    };
};
```

### Environment-Specific Validation

```typescript
useFactory: (configService: ConfigService) => {
    const env = configService.get('NODE_ENV', 'development');
    const config = getBaseConfig(configService);

    if (env === 'production') {
        // Production-specific validation
        if (!configService.get('TEMPORAL_API_KEY') && !configService.get('TEMPORAL_CLIENT_CERT')) {
            throw new Error('Production requires either API key or client certificates');
        }

        if (!config.worker?.workflowBundle) {
            throw new Error('Production should use workflowBundle instead of workflowsPath');
        }
    }

    if (env === 'test') {
        // Test-specific validation
        if (config.worker?.autoStart !== false) {
            console.warn('Consider disabling worker autoStart in test environment');
        }
    }

    return config;
};
```

### Configuration Examples by Use Case

#### Serverless/Lambda

```typescript
// Client-only for serverless functions
TemporalModule.forClient({
    connection: {
        address: process.env.TEMPORAL_ADDRESS,
        namespace: process.env.TEMPORAL_NAMESPACE,
        apiKey: process.env.TEMPORAL_API_KEY,
        tls: true,
    },
});
```

#### Container/Kubernetes

```typescript
TemporalModule.register({
    connection: {
        address: process.env.TEMPORAL_SERVICE_HOST + ':7233',
        namespace: process.env.TEMPORAL_NAMESPACE,
        tls: {
            serverName: process.env.TEMPORAL_SERVICE_HOST,
            clientCertPair: {
                crt: fs.readFileSync('/var/secrets/temporal/client.crt'),
                key: fs.readFileSync('/var/secrets/temporal/client.key'),
                ca: fs.readFileSync('/var/secrets/temporal/ca.crt'),
            },
        },
    },
    taskQueue: process.env.TEMPORAL_TASK_QUEUE,
    worker: {
        workflowBundle: require('./workflows-bundle'),
        activityClasses: [MyActivities],
        workerOptions: {
            identity: `${process.env.HOSTNAME}-${process.env.POD_NAME}`,
            buildId: process.env.BUILD_ID,
        },
    },
});
```

#### Development with Hot Reload

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

TemporalModule.register({
    connection: {
        address: 'localhost:7233',
        namespace: 'development',
    },
    taskQueue: 'dev-queue',
    worker: {
        workflowsPath: './dist/workflows',
        activityClasses: [MyActivities],
        workerOptions: {
            reuseV8Context: false, // Better for debugging
            maxConcurrentActivityTaskExecutions: 5, // Lower for development
        },
        autoStart: isDevelopment,
    },
});
```

---

**[← Getting Started](./getting-started.md)** | **[API Reference →](./api-reference.md)**
