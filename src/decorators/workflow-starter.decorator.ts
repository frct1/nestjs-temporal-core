import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_WORKFLOW_STARTER } from '../constants';
import { WorkflowStarterOptions } from '../interfaces';

/**
 * Marks a service method as a workflow starter
 * The method will automatically start a workflow when called
 *
 * @param options Workflow starter configuration
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class OrderService {
 *   @WorkflowStarter({
 *     workflowType: 'processOrder',
 *     taskQueue: 'orders',
 *     workflowId: (orderId: string) => `order-${orderId}`
 *   })
 *   async processOrder(orderId: string): Promise<WorkflowHandle> {
 *     // This method body is auto-generated
 *     // Returns a workflow handle for the started workflow
 *   }
 *
 *   @WorkflowStarter({
 *     workflowType: 'sendNotification',
 *     taskQueue: 'notifications'
 *   })
 *   async sendNotification(userId: string, message: string): Promise<WorkflowHandle> {
 *     // Auto-generated implementation
 *   }
 * }
 * ```
 */
export const WorkflowStarter = (options: WorkflowStarterOptions): MethodDecorator => {
    return (_target: unknown, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(TEMPORAL_WORKFLOW_STARTER, options, descriptor.value);
        SetMetadata(TEMPORAL_WORKFLOW_STARTER, options)(descriptor.value);
        return descriptor;
    };
};
