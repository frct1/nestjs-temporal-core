import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_WORKFLOW } from '../constants';

/**
 * Options for Temporal Workflows decorator
 *
 * This interface defines the configuration options for Temporal workflows
 * in the context of NestJS decorators.
 */
export interface TemporalWorkflowDecoratorOptions {
    /**
     * Workflow type name
     * If not provided, the class name will be used
     */
    name?: string;

    /**
     * Description of what the workflow does
     */
    description?: string;

    /**
     * Default task queue to use for this workflow
     * This will be used if not specified when starting the workflow
     */
    taskQueue: string;

    /**
     * Default workflow ID to use (optional)
     * If not provided, a random ID will be generated when starting the workflow
     */
    workflowId?: string;

    /**
     * Maximum workflow execution time
     * Format: string like '30m', '24h', '7d'
     */
    workflowExecutionTimeout?: string;

    /**
     * Workflow run timeout
     * Format: string like '30m', '24h'
     */
    workflowRunTimeout?: string;

    /**
     * Workflow task timeout
     * Format: string like '10s', '1m'
     */
    workflowTaskTimeout?: string;

    /**
     * Retry policy for workflow execution
     */
    retry?: {
        maximumAttempts?: number;
        initialInterval?: number;
        maximumInterval?: number;
        backoffCoefficient?: number;
    };
}

/**
 * Decorator that marks a class as a Temporal Workflow
 *
 * Workflows are durable, reliable processes in Temporal that orchestrate
 * activities and implement the coordination, routing, and reliability patterns
 * for your application.
 *
 * @param options Workflow configuration options
 *
 * @example
 * ```typescript
 * // Basic workflow with minimal configuration
 * @Workflow({
 *   taskQueue: 'my-task-queue'
 * })
 * export class MyWorkflow {
 *   // Workflow implementation
 * }
 *
 * // More advanced configuration
 * @Workflow({
 *   name: 'OrderProcessingWorkflow',
 *   taskQueue: 'order-processing-queue',
 *   workflowExecutionTimeout: '24h',
 *   workflowTaskTimeout: '10s',
 *   description: 'Processes customer orders from submission to fulfillment'
 * })
 * export class OrderWorkflow {
 *   // Workflow implementation
 * }
 * ```
 */
export function Workflow(options: TemporalWorkflowDecoratorOptions): ClassDecorator {
    // Ensure task queue is provided
    if (!options.taskQueue) {
        throw new Error('taskQueue is required in Workflow decorator options');
    }

    return (target: any) => {
        // Generate default name from class name if not provided
        const workflowOptions = {
            ...options,
            name: options.name || target.name,
        };

        // Store metadata on the class
        Reflect.defineMetadata(TEMPORAL_WORKFLOW, workflowOptions, target);

        // Set NestJS metadata for discovery
        SetMetadata(TEMPORAL_WORKFLOW, workflowOptions)(target);

        return target;
    };
}
