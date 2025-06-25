import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_ACTIVITY, TEMPORAL_ACTIVITY_METHOD } from 'src/constants';
import { ActivityMethodOptions, ActivityOptions } from 'src/interfaces';

/**
 * Decorator that marks a class as a Temporal Activity
 *
 * Activities are the basic unit of work in Temporal. They can be retried independently
 * from the Workflow and are executed outside of the Workflow context.
 *
 * @param options Optional activity configuration
 *
 * @example
 * ```typescript
 * @Activity()
 * export class EmailActivities {
 *   // Activity methods go here
 * }
 *
 * @Activity({ name: 'PaymentActivities' })
 * export class PaymentService {
 *   // Activity methods go here
 * }
 * ```
 */
export const Activity = (options: ActivityOptions = {}): ClassDecorator => {
    return (target: any) => {
        Reflect.defineMetadata(TEMPORAL_ACTIVITY, options, target);
        SetMetadata(TEMPORAL_ACTIVITY, options)(target);
        return target;
    };
};

/**
 * Decorator that marks a method as a Temporal Activity Method
 *
 * Activity methods are the implementation of individual activities that can be
 * executed by a workflow.
 *
 * @param options Optional configuration or activity name string
 *
 * @example
 * ```typescript
 * @Activity()
 * export class EmailActivities {
 *   @ActivityMethod()
 *   async sendWelcomeEmail(to: string): Promise<boolean> {
 *     // Implementation
 *     return true;
 *   }
 *
 *   @ActivityMethod('processPayment')
 *   async processPayment(orderId: string, amount: number): Promise<string> {
 *     // Implementation
 *     return 'payment-id';
 *   }
 *
 *   @ActivityMethod({
 *     name: 'sendInvoice',
 *     timeout: '30s',
 *     maxRetries: 3
 *   })
 *   async sendInvoice(orderId: string): Promise<void> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export const ActivityMethod = (options?: string | ActivityMethodOptions): MethodDecorator => {
    return (_target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        // Handle both string (name) and options object
        let methodName: string;
        let methodOptions: ActivityMethodOptions = {};

        if (typeof options === 'string') {
            methodName = options;
            methodOptions = { name: options };
        } else if (options && typeof options === 'object') {
            methodName = options.name || propertyKey.toString();
            methodOptions = options;
        } else {
            methodName = propertyKey.toString();
        }

        // Store metadata on the method
        const metadata = {
            name: methodName,
            ...methodOptions,
        };

        Reflect.defineMetadata(TEMPORAL_ACTIVITY_METHOD, metadata, descriptor.value);
        SetMetadata(TEMPORAL_ACTIVITY_METHOD, metadata)(descriptor.value);

        return descriptor;
    };
};
