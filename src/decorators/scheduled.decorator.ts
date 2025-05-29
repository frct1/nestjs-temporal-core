import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_SCHEDULED_WORKFLOW } from '../constants';

/**
 * Scheduled workflow options
 */
export interface ScheduledOptions {
    /**
     * Unique schedule ID
     */
    scheduleId: string;

    /**
     * Cron expression for scheduling
     * @example "0 8 * * *" // Daily at 8 AM
     */
    cron?: string;

    /**
     * Interval for scheduling (alternative to cron)
     * @example "1h" // Every hour
     */
    interval?: string;

    /**
     * Description of the schedule
     */
    description?: string;

    /**
     * Task queue (overrides controller default)
     */
    taskQueue?: string;
}

/**
 * Marks a workflow method as scheduled
 *
 * @param options Schedule configuration
 *
 * @example
 * ```typescript
 * @WorkflowController({ taskQueue: 'reports' })
 * export class ReportController {
 *   @Scheduled({
 *     scheduleId: 'daily-report',
 *     cron: '0 8 * * *',
 *     description: 'Daily sales report'
 *   })
 *   @WorkflowMethod()
 *   async generateReport() {
 *     // workflow logic
 *   }
 *
 *   @Scheduled({
 *     scheduleId: 'hourly-sync',
 *     interval: '1h',
 *     description: 'Sync data every hour'
 *   })
 *   @WorkflowMethod()
 *   async syncData() {
 *     // workflow logic
 *   }
 * }
 * ```
 */
export const Scheduled = (options: ScheduledOptions): MethodDecorator => {
    return (_target: unknown, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        // Validate options
        if (!options.scheduleId) {
            throw new Error('@Scheduled requires scheduleId');
        }

        if (!options.cron && !options.interval) {
            throw new Error('@Scheduled requires either cron or interval');
        }

        if (options.cron && options.interval) {
            throw new Error('@Scheduled cannot have both cron and interval');
        }

        Reflect.defineMetadata(TEMPORAL_SCHEDULED_WORKFLOW, options, descriptor.value);
        SetMetadata(TEMPORAL_SCHEDULED_WORKFLOW, options)(descriptor.value);
        return descriptor;
    };
};
