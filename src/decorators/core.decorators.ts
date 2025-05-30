import { SetMetadata } from '@nestjs/common';
import {
    TEMPORAL_ACTIVITY,
    TEMPORAL_ACTIVITY_METHOD,
    TEMPORAL_ACTIVITY_METHOD_NAME,
    TEMPORAL_ACTIVITY_METHOD_OPTIONS,
    TEMPORAL_WORKFLOW,
    TEMPORAL_WORKFLOW_OPTIONS,
    TEMPORAL_WORKFLOW_METHOD,
    TEMPORAL_WORKFLOW_METHOD_NAME,
    TEMPORAL_WORKFLOW_METHOD_OPTIONS,
    TEMPORAL_WORKFLOW_CONTROLLER,
} from '../constants';
import {
    ActivityOptions,
    ActivityMethodOptions,
    WorkflowOptions,
    WorkflowMethodOptions,
    WorkflowControllerOptions,
} from '../interfaces';

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
        Reflect.defineMetadata(TEMPORAL_ACTIVITY, { ...options }, target);
        SetMetadata(TEMPORAL_ACTIVITY, { ...options })(target);
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
        Reflect.defineMetadata(TEMPORAL_ACTIVITY_METHOD, true, descriptor.value);
        Reflect.defineMetadata(TEMPORAL_ACTIVITY_METHOD_NAME, methodName, descriptor.value);

        if (Object.keys(methodOptions).length > 0) {
            Reflect.defineMetadata(
                TEMPORAL_ACTIVITY_METHOD_OPTIONS,
                methodOptions,
                descriptor.value,
            );
        }

        // Set NestJS metadata for discovery
        SetMetadata(TEMPORAL_ACTIVITY_METHOD, true)(descriptor.value);
        SetMetadata(TEMPORAL_ACTIVITY_METHOD_NAME, methodName)(descriptor.value);

        if (Object.keys(methodOptions).length > 0) {
            SetMetadata(TEMPORAL_ACTIVITY_METHOD_OPTIONS, methodOptions)(descriptor.value);
        }

        return descriptor;
    };
};

/**
 * Decorator that marks a class as a Temporal Workflow
 *
 * Workflows are durable functions that coordinate activities and manage
 * state in a fault-tolerant way.
 *
 * Note: This decorator is used primarily for static analysis and code organization.
 * Actual workflow implementations are in separate files that are loaded by the worker.
 *
 * @param options Workflow configuration
 *
 * @example
 * ```typescript
 * @Workflow({
 *   name: 'OrderWorkflow',
 *   taskQueue: 'order-queue'
 * })
 * export class OrderWorkflow {
 *   // Workflow methods
 * }
 * ```
 */
export const Workflow = (options: WorkflowOptions): ClassDecorator => {
    return (target: any) => {
        Reflect.defineMetadata(TEMPORAL_WORKFLOW, true, target);
        Reflect.defineMetadata(TEMPORAL_WORKFLOW_OPTIONS, options, target);
        SetMetadata(TEMPORAL_WORKFLOW, true)(target);
        SetMetadata(TEMPORAL_WORKFLOW_OPTIONS, options)(target);
        return target;
    };
};

/**
 * Decorator that marks a method as a Temporal Workflow Method
 *
 * Workflow methods are the entry points to workflow execution.
 *
 * @param options Optional configuration or workflow name string
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
 *   @WorkflowMethod('cancelOrder')
 *   async cancelOrder(orderId: string): Promise<string> {
 *     // Workflow implementation
 *     return 'cancelled';
 *   }
 * }
 * ```
 */
export const WorkflowMethod = (options?: string | WorkflowMethodOptions): MethodDecorator => {
    return (_target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        // Handle both string (name) and options object
        let methodName: string;

        if (typeof options === 'string') {
            methodName = options;
        } else if (options && typeof options === 'object' && options.name) {
            methodName = options.name;
        } else {
            methodName = propertyKey.toString();
        }

        // Store metadata
        Reflect.defineMetadata(TEMPORAL_WORKFLOW_METHOD, true, descriptor.value);
        Reflect.defineMetadata(TEMPORAL_WORKFLOW_METHOD_NAME, methodName, descriptor.value);

        if (options && typeof options === 'object') {
            Reflect.defineMetadata(TEMPORAL_WORKFLOW_METHOD_OPTIONS, options, descriptor.value);
        }

        // Set NestJS metadata
        SetMetadata(TEMPORAL_WORKFLOW_METHOD, true)(descriptor.value);
        SetMetadata(TEMPORAL_WORKFLOW_METHOD_NAME, methodName)(descriptor.value);

        if (options && typeof options === 'object') {
            SetMetadata(TEMPORAL_WORKFLOW_METHOD_OPTIONS, options)(descriptor.value);
        }

        return descriptor;
    };
};

/**
 * Marks a class as a Temporal Workflow Controller
 * Similar to @Controller() but for workflows
 *
 * @param options Optional controller configuration
 *
 * @example
 * ```typescript
 * @WorkflowController({ taskQueue: 'orders' })
 * export class OrderWorkflowController {
 *   @WorkflowMethod()
 *   async processOrder(orderId: string) {
 *     // workflow logic
 *   }
 * }
 * ```
 */
export const WorkflowController = (options: WorkflowControllerOptions = {}): ClassDecorator => {
    return (target: any) => {
        Reflect.defineMetadata(TEMPORAL_WORKFLOW_CONTROLLER, options, target);
        SetMetadata(TEMPORAL_WORKFLOW_CONTROLLER, options)(target);
        return target;
    };
};
