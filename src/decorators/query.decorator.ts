import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_QUERY_METHOD } from '../constants';

/**
 * Query method options
 */
export interface QueryOptions {
    /**
     * Query name (defaults to method name)
     */
    name?: string;
}

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
