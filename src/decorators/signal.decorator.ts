import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_SIGNAL_METHOD } from '../constants';

/**
 * Signal method options
 */
export interface SignalOptions {
    /**
     * Signal name (defaults to method name)
     */
    name?: string;
}

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
