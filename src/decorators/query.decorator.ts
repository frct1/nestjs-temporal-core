import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_QUERY_METHOD, TEMPORAL_QUERY_NAME } from '../constants';
import { QueryMethodOptions } from '../interfaces/workflow.interface';

/**
 * Decorator that marks a method as a Temporal Query Method
 *
 * Queries allow you to get the current state of a workflow without modifying it.
 * Query methods should be synchronous (not async) and should not have side effects.
 *
 * @param options Optional configuration or query name string
 *
 * @example
 * ```typescript
 * @Workflow({ taskQueue: 'my-task-queue' })
 * export class OrderWorkflow {
 *   private orderStatus: string = 'PENDING';
 *   private orderItems: Item[] = [];
 *
 *   @WorkflowMethod()
 *   async execute(orderId: string): Promise<string> {
 *     // Workflow implementation
 *   }
 *
 *   @Query()
 *   getStatus(): string {
 *     return this.orderStatus;
 *   }
 *
 *   @Query('getOrderDetails')
 *   getOrderDetails(): OrderDetails {
 *     return {
 *       status: this.orderStatus,
 *       items: this.orderItems,
 *     };
 *   }
 * }
 * ```
 */
export const Query = (options?: string | QueryMethodOptions): MethodDecorator => {
    return (_target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        // Handle both string (name) and options object
        let queryName: string;

        if (typeof options === 'string') {
            queryName = options;
        } else if (options && typeof options === 'object') {
            queryName = options.name || propertyKey.toString();
        } else {
            queryName = propertyKey.toString();
        }

        // Store metadata on the method
        Reflect.defineMetadata(TEMPORAL_QUERY_METHOD, true, descriptor.value);
        Reflect.defineMetadata(TEMPORAL_QUERY_NAME, queryName, descriptor.value);

        // Set NestJS metadata for discovery
        SetMetadata(TEMPORAL_QUERY_METHOD, true)(descriptor.value);
        SetMetadata(TEMPORAL_QUERY_NAME, queryName)(descriptor.value);

        return descriptor;
    };
};
