import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_ACTIVITY_METHOD, TEMPORAL_ACTIVITY_METHOD_NAME } from '../constants';

/**
 * Options for configuring Temporal Activity Methods
 */
export interface ActivityMethodOptions {
    /**
     * Custom name for the activity method
     * If not specified, the method name will be used
     */
    name?: string;

    /**
     * Optional activity timeout settings
     */
    timeout?: {
        /**
         * Maximum time allowed for the activity execution
         * Format: number in milliseconds or string like '30s', '5m'
         */
        startToClose?: string | number;

        /**
         * Maximum time allowed for the activity to be scheduled
         * Format: number in milliseconds or string like '30s', '5m'
         */
        scheduleToStart?: string | number;
    };
}

/**
 * Decorator that marks a method as a Temporal Activity Method
 *
 * Activity methods are executed by Temporal workers and contain
 * the business logic of your application.
 *
 * @param options Optional configuration or activity name string
 *
 * @example
 * ```typescript
 * @Activity()
 * export class EmailActivities {
 *   // Simple usage with default method name
 *   @ActivityMethod()
 *   async sendWelcomeEmail(to: string): Promise<boolean> {
 *     // Implementation
 *   }
 *
 *   // With custom name
 *   @ActivityMethod('processPayment')
 *   async processPayment(orderId: string, amount: number): Promise<string> {
 *     // Implementation
 *   }
 *
 *   // With options object
 *   @ActivityMethod({
 *     name: 'generateInvoice',
 *     timeout: { startToClose: '1m' }
 *   })
 *   async generateInvoicePdf(data: any): Promise<Buffer> {
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
        Reflect.defineMetadata(TEMPORAL_ACTIVITY_METHOD, true, descriptor.value);
        Reflect.defineMetadata(TEMPORAL_ACTIVITY_METHOD_NAME, methodName, descriptor.value);

        if (Object.keys(methodOptions).length > 0) {
            Reflect.defineMetadata(
                'TEMPORAL_ACTIVITY_METHOD_OPTIONS',
                methodOptions,
                descriptor.value,
            );
        }

        // Set NestJS metadata for discovery
        SetMetadata(TEMPORAL_ACTIVITY_METHOD, true)(descriptor.value);
        SetMetadata(TEMPORAL_ACTIVITY_METHOD_NAME, methodName)(descriptor.value);

        if (Object.keys(methodOptions).length > 0) {
            SetMetadata('TEMPORAL_ACTIVITY_METHOD_OPTIONS', methodOptions)(descriptor.value);
        }

        return descriptor;
    };
};
