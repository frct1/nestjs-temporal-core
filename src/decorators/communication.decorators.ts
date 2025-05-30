import { SetMetadata } from '@nestjs/common';
import {
    TEMPORAL_SIGNAL_METHOD,
    TEMPORAL_SIGNAL_NAME,
    TEMPORAL_QUERY_METHOD,
    TEMPORAL_QUERY_NAME,
} from '../constants';
import { SignalOptions, QueryOptions } from '../interfaces';

/**
 * Decorator that marks a method as a Temporal Signal Method
 *
 * Signal methods handle incoming signals to a workflow.
 *
 * @param name Optional signal name (defaults to method name)
 *
 * @example
 * ```typescript
 * @Workflow({
 *   name: 'OrderWorkflow',
 *   taskQueue: 'order-queue'
 * })
 * export class OrderWorkflow {
 *   @WorkflowMethod()
 *   async processOrder(orderId: string): Promise<string> {
 *     // Workflow implementation
 *     return 'completed';
 *   }
 *
 *   @SignalMethod()
 *   async addItem(item: string): void {
 *     // Handle signal
 *   }
 *
 *   @SignalMethod('cancelProcessing')
 *   async cancel(): void {
 *     // Handle cancel signal
 *   }
 * }
 * ```
 */
export const SignalMethod = (name?: string): MethodDecorator => {
    return (_target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        const signalName = name || propertyKey.toString();

        // Store metadata
        Reflect.defineMetadata(TEMPORAL_SIGNAL_METHOD, true, descriptor.value);
        Reflect.defineMetadata(TEMPORAL_SIGNAL_NAME, signalName, descriptor.value);

        // Set NestJS metadata
        SetMetadata(TEMPORAL_SIGNAL_METHOD, true)(descriptor.value);
        SetMetadata(TEMPORAL_SIGNAL_NAME, signalName)(descriptor.value);

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

        if (typeof nameOrOptions === 'string') {
            signalName = nameOrOptions;
        } else if (nameOrOptions?.name) {
            signalName = nameOrOptions.name;
        } else {
            signalName = propertyKey.toString();
        }

        const options: SignalOptions = { name: signalName };

        Reflect.defineMetadata(TEMPORAL_SIGNAL_METHOD, options, descriptor.value);
        SetMetadata(TEMPORAL_SIGNAL_METHOD, options)(descriptor.value);
        return descriptor;
    };
};

/**
 * Decorator that marks a method as a Temporal Query Method
 *
 * Query methods allow reading workflow state without affecting it.
 *
 * @param name Optional query name (defaults to method name)
 *
 * @example
 * ```typescript
 * @Workflow({
 *   name: 'OrderWorkflow',
 *   taskQueue: 'order-queue'
 * })
 * export class OrderWorkflow {
 *   private status: string = 'pending';
 *
 *   @WorkflowMethod()
 *   async processOrder(orderId: string): Promise<string> {
 *     this.status = 'processing';
 *     // ...
 *     this.status = 'completed';
 *     return this.status;
 *   }
 *
 *   @QueryMethod()
 *   getStatus(): string {
 *     return this.status;
 *   }
 * }
 * ```
 */
export const QueryMethod = (name?: string): MethodDecorator => {
    return (_target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        const queryName = name || propertyKey.toString();

        // Store metadata
        Reflect.defineMetadata(TEMPORAL_QUERY_METHOD, true, descriptor.value);
        Reflect.defineMetadata(TEMPORAL_QUERY_NAME, queryName, descriptor.value);

        // Set NestJS metadata
        SetMetadata(TEMPORAL_QUERY_METHOD, true)(descriptor.value);
        SetMetadata(TEMPORAL_QUERY_NAME, queryName)(descriptor.value);

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

        if (typeof nameOrOptions === 'string') {
            queryName = nameOrOptions;
        } else if (nameOrOptions?.name) {
            queryName = nameOrOptions.name;
        } else {
            queryName = propertyKey.toString();
        }

        const options: QueryOptions = { name: queryName };

        Reflect.defineMetadata(TEMPORAL_QUERY_METHOD, options, descriptor.value);
        SetMetadata(TEMPORAL_QUERY_METHOD, options)(descriptor.value);
        return descriptor;
    };
};
