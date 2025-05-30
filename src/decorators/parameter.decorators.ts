import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts workflow parameters
 * Similar to @Param() in REST controllers
 *
 * @param index Optional parameter index to extract specific argument
 *
 * @example
 * ```typescript
 * @WorkflowController({ taskQueue: 'orders' })
 * export class OrderController {
 *   @WorkflowMethod()
 *   async processOrder(
 *     @WorkflowParam(0) orderId: string,
 *     @WorkflowParam(1) customerId: string
 *   ) {
 *     // orderId = args[0], customerId = args[1]
 *   }
 *
 *   @WorkflowMethod()
 *   async processMultipleOrders(@WorkflowParam() orderIds: string[]) {
 *     // orderIds = entire args array
 *   }
 *
 *   @Signal('addItem')
 *   async addItem(@WorkflowParam() item: any) {
 *     // item = signal argument
 *   }
 * }
 * ```
 */
export const WorkflowParam = createParamDecorator(
    (index: number | undefined, _ctx: ExecutionContext) => {
        // This is a placeholder implementation
        // The actual implementation would need to be integrated
        // with the workflow execution context

        // For now, we'll store the parameter metadata
        // and handle extraction during workflow execution
        return (target: any, propertyKey: string | symbol, parameterIndex: number) => {
            const existingParams =
                Reflect.getMetadata('workflow:params', target, propertyKey) || [];
            existingParams[parameterIndex] = {
                type: 'param',
                index: index !== undefined ? index : parameterIndex,
            };
            Reflect.defineMetadata('workflow:params', existingParams, target, propertyKey);
        };
    },
);

/**
 * Extracts workflow execution context
 * Provides access to workflow metadata
 *
 * @example
 * ```typescript
 * @WorkflowController({ taskQueue: 'orders' })
 * export class OrderController {
 *   @WorkflowMethod()
 *   async processOrder(
 *     @WorkflowParam() orderId: string,
 *     @WorkflowContext() context: WorkflowExecutionContext
 *   ) {
 *     console.log('Workflow ID:', context.workflowId);
 *     console.log('Task Queue:', context.taskQueue);
 *   }
 *
 *   @Query()
 *   getWorkflowInfo(@WorkflowContext() context: WorkflowExecutionContext) {
 *     return {
 *       id: context.workflowId,
 *       type: context.workflowType
 *     };
 *   }
 * }
 * ```
 */
export const WorkflowContext = (): ParameterDecorator => {
    return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
        const existingParams = propertyKey
            ? Reflect.getMetadata('workflow:params', target, propertyKey) || []
            : [];
        existingParams[parameterIndex] = {
            type: 'context',
        };
        if (propertyKey !== undefined) {
            Reflect.defineMetadata('workflow:params', existingParams, target, propertyKey);
        }
    };
};
