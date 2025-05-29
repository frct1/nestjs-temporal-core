/**
 * Workflow execution context information
 */
export interface WorkflowExecutionContext {
    /**
     * Workflow ID
     */
    workflowId: string;

    /**
     * Run ID
     */
    runId: string;

    /**
     * Workflow type
     */
    workflowType: string;

    /**
     * Task queue
     */
    taskQueue: string;

    /**
     * Namespace
     */
    namespace: string;
}

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
