import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_SCHEDULED_WORKFLOW } from '../constants';
import { ScheduledOptions, CronOptions, IntervalOptions } from '../interfaces';

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

/**
 * Shorthand decorator for cron-based scheduling
 *
 * @param cronExpression Cron expression
 * @param options Schedule options
 *
 * @example
 * ```typescript
 * @WorkflowController({ taskQueue: 'reports' })
 * export class ReportController {
 *   @Cron('0 8 * * *', {
 *     scheduleId: 'daily-report',
 *     description: 'Daily sales report'
 *   })
 *   @WorkflowMethod()
 *   async generateDailyReport() {
 *     // workflow logic
 *   }
 *
 *   @Cron('0 0 1 * *', {
 *     scheduleId: 'monthly-summary',
 *     description: 'Monthly summary'
 *   })
 *   @WorkflowMethod()
 *   async generateMonthlyReport() {
 *     // workflow logic
 *   }
 * }
 * ```
 */
export const Cron = (cronExpression: string, options: CronOptions): MethodDecorator => {
    return Scheduled({
        ...options,
        cron: cronExpression,
    });
};

/**
 * Shorthand decorator for interval-based scheduling
 *
 * @param interval Interval expression
 * @param options Schedule options
 *
 * @example
 * ```typescript
 * @WorkflowController({ taskQueue: 'monitoring' })
 * export class MonitoringController {
 *   @Interval('5m', {
 *     scheduleId: 'health-check',
 *     description: 'Health check every 5 minutes'
 *   })
 *   @WorkflowMethod()
 *   async healthCheck() {
 *     // workflow logic
 *   }
 *
 *   @Interval('1h', {
 *     scheduleId: 'metrics-collection',
 *     description: 'Collect metrics hourly'
 *   })
 *   @WorkflowMethod()
 *   async collectMetrics() {
 *     // workflow logic
 *   }
 * }
 * ```
 */
export const Interval = (interval: string, options: IntervalOptions): MethodDecorator => {
    return Scheduled({
        ...options,
        interval,
    });
};
