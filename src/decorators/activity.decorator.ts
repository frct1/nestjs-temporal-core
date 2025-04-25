import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_ACTIVITY } from '../constants';
import { ActivityOptions } from '../interfaces/activity.interface';

/**
 * Decorator that marks a class as a Temporal Activity
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
