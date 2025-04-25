import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_SIGNAL_METHOD, TEMPORAL_SIGNAL_NAME } from '../constants';
import { SignalMethodOptions } from '../interfaces/workflow.interface';

/**
 * Decorator that marks a method as a Temporal Signal Method
 *
 * @param options Optional configuration or signal name string
 *
 * @example
 * ```typescript
 * @Workflow({ taskQueue: 'my-task-queue' })
 * export class OrderWorkflow {
 *   private orderStatus: string = 'PENDING';
 *
 *   @WorkflowMethod()
 *   async execute(orderId: string): Promise<string> {
 *     // Workflow implementation that may wait for signals
 *   }
 *
 *   @Signal()
 *   async cancel(reason: string): Promise<void> {
 *     this.orderStatus = 'CANCELLED';
 *   }
 * }
 * ```
 */
export const Signal = (options?: string | SignalMethodOptions): MethodDecorator => {
    return (_target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        // Handle both string (name) and options object
        let signalName: string;

        if (typeof options === 'string') {
            signalName = options;
        } else if (options && typeof options === 'object') {
            signalName = options.name || propertyKey.toString();
        } else {
            signalName = propertyKey.toString();
        }

        // Store metadata on the method
        Reflect.defineMetadata(TEMPORAL_SIGNAL_METHOD, true, descriptor.value);
        Reflect.defineMetadata(TEMPORAL_SIGNAL_NAME, signalName, descriptor.value);

        // Set NestJS metadata for discovery
        SetMetadata(TEMPORAL_SIGNAL_METHOD, true)(descriptor.value);
        SetMetadata(TEMPORAL_SIGNAL_NAME, signalName)(descriptor.value);

        return descriptor;
    };
};
