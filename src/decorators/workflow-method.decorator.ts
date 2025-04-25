import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_WORKFLOW_METHOD, TEMPORAL_WORKFLOW_METHOD_NAME } from '../constants';
import { WorkflowMethodOptions } from '../interfaces/workflow.interface';

/**
 * Decorator that marks a method as the main Temporal Workflow method
 *
 * @param options Optional configuration or workflow method name string
 *
 * @example
 * ```typescript
 * @Workflow({ taskQueue: 'my-task-queue' })
 * export class OrderProcessingWorkflow {
 *   @WorkflowMethod()
 *   async execute(orderId: string): Promise<string> {
 *     // Workflow implementation
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

        // Store metadata on the method
        Reflect.defineMetadata(TEMPORAL_WORKFLOW_METHOD, true, descriptor.value);
        Reflect.defineMetadata(TEMPORAL_WORKFLOW_METHOD_NAME, methodName, descriptor.value);

        // Set NestJS metadata for discovery
        SetMetadata(TEMPORAL_WORKFLOW_METHOD, true)(descriptor.value);
        SetMetadata(TEMPORAL_WORKFLOW_METHOD_NAME, methodName)(descriptor.value);

        return descriptor;
    };
};
