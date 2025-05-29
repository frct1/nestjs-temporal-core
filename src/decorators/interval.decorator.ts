import { Scheduled, ScheduledOptions } from './scheduled.decorator';

/**
 * Interval scheduling options (without interval)
 */
export interface IntervalOptions extends Omit<ScheduledOptions, 'cron' | 'interval'> {
    /**
     * Unique schedule ID
     */
    scheduleId: string;
}

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
