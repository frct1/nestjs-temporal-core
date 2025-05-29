/**
 * Scheduling interfaces
 * Contains all interfaces related to scheduled workflows
 */

// ==========================================
// Scheduled Workflow Options
// ==========================================

/**
 * Scheduled workflow configuration options
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

    /**
     * Timezone for cron expressions
     * @default "UTC"
     */
    timezone?: string;

    /**
     * Schedule overlap policy
     */
    overlapPolicy?: 'ALLOW_ALL' | 'SKIP' | 'BUFFER_ONE' | 'BUFFER_ALL' | 'CANCEL_OTHER';

    /**
     * Whether to start the schedule paused
     * @default false
     */
    startPaused?: boolean;

    /**
     * Auto-start the schedule when the application starts
     * @default true
     */
    autoStart?: boolean;
}

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
 * Interval scheduling options (without interval)
 */
export interface IntervalOptions extends Omit<ScheduledOptions, 'cron' | 'interval'> {
    /**
     * Unique schedule ID
     */
    scheduleId: string;
}
