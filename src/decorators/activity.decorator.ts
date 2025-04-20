import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_ACTIVITY } from '../constants';

/**
 * Options for configuring Temporal Activity classes
 */
export interface ActivityOptions {
    /**
     * Optional name for the activity class
     * If not provided, the class name will be used
     */
    name?: string;

    /**
     * Optional description of what the activity does
     */
    description?: string;
}

/**
 * Decorator that marks a class as a Temporal Activity
 *
 * Activities are the basic unit of application logic in Temporal applications
 * that execute the business logic of your application.
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
 * @Activity({ name: 'PaymentActivities', description: 'Payment processing activities' })
 * export class PaymentService {
 *   // Activity methods go here
 * }
 * ```
 */
export const Activity = (options: ActivityOptions = {}): ClassDecorator => {
    return (target: any) => {
        Reflect.defineMetadata(TEMPORAL_ACTIVITY, { ...options }, target);
        SetMetadata(TEMPORAL_ACTIVITY, { ...options })(target);
        return target;
    };
};
