import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_WORKFLOW, TEMPORAL_WORKFLOW_OPTIONS } from '../constants';
import { WorkflowOptions } from '../interfaces/workflow.interface';

/**
 * Decorator that marks a class as a Temporal Workflow
 *
 * @param options Workflow configuration options
 *
 * @example
 * ```typescript
 * @Workflow({
 *   taskQueue: 'my-task-queue'
 * })
 * export class MyWorkflow {
 *   // Workflow implementation
 * }
 * ```
 */
export function Workflow(options: WorkflowOptions): ClassDecorator {
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
        SetMetadata(TEMPORAL_WORKFLOW_OPTIONS, workflowOptions)(target);

        return target;
    };
}
