import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_WORKFLOW, TEMPORAL_WORKFLOW_OPTIONS } from '../constants';
import { WorkflowOptions } from '../interfaces/workflow.interface';

/**
 * Extended options for scheduled workflows
 */
export interface ScheduledWorkflowOptions extends WorkflowOptions {
    /**
     * Schedule for the workflow
     */
    schedule: {
        /**
         * Cron expressions (standard UNIX cron format)
         * @example "0 * * * *" (run once every hour)
         * @example "0 0 * * *" (run once every day at midnight)
         */
        cron?: string;

        /**
         * Time interval to run the workflow
         */
        interval?: {
            seconds?: number;
            minutes?: number;
            hours?: number;
            days?: number;
        };
    };
}

/**
 * Decorator for Temporal workflows that are scheduled to run on a cron schedule
 *
 * @param options Configuration including schedule and workflow options
 *
 * @example
 * ```typescript
 * @ScheduledWorkflow({
 *   taskQueue: 'scheduled-tasks',
 *   schedule: {
 *     cron: '0 0 * * *' // Run daily at midnight
 *   },
 *   description: 'Daily report generation workflow'
 * })
 * export class DailyReportWorkflow {
 *   @WorkflowMethod()
 *   async execute(): Promise<void> {
 *     // Implementation
 *   }
 * }
 *
 * @ScheduledWorkflow({
 *   taskQueue: 'scheduled-tasks',
 *   schedule: {
 *     interval: {
 *       hours: 4 // Run every 4 hours
 *     }
 *   }
 * })
 * export class PeriodicCleanupWorkflow {
 *   @WorkflowMethod()
 *   async execute(): Promise<void> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export function ScheduledWorkflow(options: ScheduledWorkflowOptions): ClassDecorator {
    // Ensure required options are provided
    if (!options.taskQueue) {
        throw new Error('taskQueue is required in ScheduledWorkflow decorator options');
    }

    if (!options.schedule) {
        throw new Error('schedule is required in ScheduledWorkflow decorator options');
    }

    if (!options.schedule.cron && !options.schedule.interval) {
        throw new Error('Either cron or interval must be provided in schedule options');
    }

    return (target: any) => {
        // Generate default name from class name if not provided
        const workflowOptions = {
            ...options,
            name: options.name || target.name,
        };

        // Store metadata on the class
        Reflect.defineMetadata(TEMPORAL_WORKFLOW, workflowOptions, target);
        Reflect.defineMetadata('TEMPORAL_SCHEDULED_WORKFLOW', true, target);
        Reflect.defineMetadata('TEMPORAL_SCHEDULED_WORKFLOW_OPTIONS', options.schedule, target);

        // Set NestJS metadata for discovery
        SetMetadata(TEMPORAL_WORKFLOW, workflowOptions)(target);
        SetMetadata(TEMPORAL_WORKFLOW_OPTIONS, workflowOptions)(target);
        SetMetadata('TEMPORAL_SCHEDULED_WORKFLOW', true)(target);
        SetMetadata('TEMPORAL_SCHEDULED_WORKFLOW_OPTIONS', options.schedule)(target);

        return target;
    };
}
