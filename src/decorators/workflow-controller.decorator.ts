import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_WORKFLOW_CONTROLLER } from '../constants';

/**
 * Workflow controller options
 */
export interface WorkflowControllerOptions {
    /**
     * Task queue for workflows in this controller
     */
    taskQueue?: string;
}

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
