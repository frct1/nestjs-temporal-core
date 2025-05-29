import { Scheduled, ScheduledOptions } from './scheduled.decorator';

/**
 * Cron scheduling options (without cron expression)
 */
export interface CronOptions extends Omit<ScheduledOptions, 'cron' | 'interval'> {
    /**
     * Unique schedule ID
     */
    scheduleId: string;
}

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
