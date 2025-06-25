import { SetMetadata } from '@nestjs/common';
import {
    TEMPORAL_WORKFLOW_CONTROLLER,
    TEMPORAL_WORKFLOW_METHOD,
    TEMPORAL_SIGNAL_METHOD,
    TEMPORAL_QUERY_METHOD,
} from 'src/constants';
import {
    WorkflowControllerOptions,
    WorkflowMethodOptions,
    SignalOptions,
    QueryOptions,
} from 'src/interfaces';

/**
 * Marks a class as a Temporal Workflow Controller
 * Similar to @Controller() but for workflows
 *
 * @param options Optional controller configuration
 *
 * @example
 * ```typescript
 * @WorkflowController({ taskQueue: 'orders' })
 * export class OrderWorkflowController {
 *   @WorkflowMethod()
 *   async processOrder(orderId: string) {
 *     // workflow logic
 *   }
 * }
 * ```
 */
export const WorkflowController = (options: WorkflowControllerOptions = {}): ClassDecorator => {
    return (target: any) => {
        Reflect.defineMetadata(TEMPORAL_WORKFLOW_CONTROLLER, options, target);
        SetMetadata(TEMPORAL_WORKFLOW_CONTROLLER, options)(target);
        return target;
    };
};

/**
 * Decorator that marks a method as a Temporal Workflow Method
 *
 * Workflow methods are the entry points to workflow execution.
 *
 * @param options Optional configuration or workflow name string
 *
 * @example
 * ```typescript
 * @WorkflowController({ taskQueue: 'orders' })
 * export class OrderWorkflowController {
 *   @WorkflowMethod()
 *   async processOrder(orderId: string): Promise<string> {
 *     // Workflow implementation
 *     return 'completed';
 *   }
 *
 *   @WorkflowMethod('cancelOrder')
 *   async cancelOrder(orderId: string): Promise<string> {
 *     // Workflow implementation
 *     return 'cancelled';
 *   }
 *
 *   @WorkflowMethod({
 *     name: 'processOrderWithRetry',
 *     timeout: '30m',
 *     retry: {
 *       maximumAttempts: 3,
 *       initialInterval: '10s'
 *     }
 *   })
 *   async processOrderWithRetry(orderId: string): Promise<string> {
 *     // Workflow implementation with retry policy
 *     return 'completed';
 *   }
 * }
 * ```
 */
export const WorkflowMethod = (options?: string | WorkflowMethodOptions): MethodDecorator => {
    return (_target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        // Handle both string (name) and options object
        let methodName: string;
        let methodOptions: WorkflowMethodOptions = {};

        if (typeof options === 'string') {
            methodName = options;
            methodOptions = { name: options };
        } else if (options && typeof options === 'object') {
            methodName = options.name || propertyKey.toString();
            methodOptions = options;
        } else {
            methodName = propertyKey.toString();
        }

        // Store metadata
        const metadata = {
            name: methodName,
            ...methodOptions,
        };

        Reflect.defineMetadata(TEMPORAL_WORKFLOW_METHOD, metadata, descriptor.value);
        SetMetadata(TEMPORAL_WORKFLOW_METHOD, metadata)(descriptor.value);

        return descriptor;
    };
};

/**
 * Marks a method as a Temporal Signal handler
 * Simplified version for workflow controllers
 *
 * @param nameOrOptions Signal name or options
 *
 * @example
 * ```typescript
 * @WorkflowController({ taskQueue: 'orders' })
 * export class OrderController {
 *   @Signal('addItem')
 *   async addItem(item: any) {
 *     // handle signal
 *   }
 *
 *   @Signal()  // Uses method name as signal name
 *   async cancel() {
 *     // handle cancel signal
 *   }
 * }
 * ```
 */
export const Signal = (nameOrOptions?: string | SignalOptions): MethodDecorator => {
    return (_target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        let signalName: string;
        let signalOptions: SignalOptions = {};

        if (typeof nameOrOptions === 'string') {
            signalName = nameOrOptions;
            signalOptions = { name: nameOrOptions };
        } else if (nameOrOptions?.name) {
            signalName = nameOrOptions.name;
            signalOptions = nameOrOptions;
        } else {
            signalName = propertyKey.toString();
            signalOptions = { name: signalName };
        }

        const metadata = {
            name: signalName,
            ...signalOptions,
        };

        Reflect.defineMetadata(TEMPORAL_SIGNAL_METHOD, metadata, descriptor.value);
        SetMetadata(TEMPORAL_SIGNAL_METHOD, metadata)(descriptor.value);
        return descriptor;
    };
};

/**
 * Marks a method as a Temporal Query handler
 * Simplified version for workflow controllers
 *
 * @param nameOrOptions Query name or options
 *
 * @example
 * ```typescript
 * @WorkflowController({ taskQueue: 'orders' })
 * export class OrderController {
 *   @Query('getStatus')
 *   getOrderStatus(): string {
 *     return this.status;
 *   }
 *
 *   @Query()  // Uses method name as query name
 *   getProgress(): number {
 *     return this.progress;
 *   }
 * }
 * ```
 */
export const Query = (nameOrOptions?: string | QueryOptions): MethodDecorator => {
    return (_target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        let queryName: string;
        let queryOptions: QueryOptions = {};

        if (typeof nameOrOptions === 'string') {
            queryName = nameOrOptions;
            queryOptions = { name: nameOrOptions };
        } else if (nameOrOptions?.name) {
            queryName = nameOrOptions.name;
            queryOptions = nameOrOptions;
        } else {
            queryName = propertyKey.toString();
            queryOptions = { name: queryName };
        }

        const metadata = {
            name: queryName,
            ...queryOptions,
        };

        Reflect.defineMetadata(TEMPORAL_QUERY_METHOD, metadata, descriptor.value);
        SetMetadata(TEMPORAL_QUERY_METHOD, metadata)(descriptor.value);
        return descriptor;
    };
};
