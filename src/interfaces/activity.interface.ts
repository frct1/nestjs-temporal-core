/**
 * Options for configuring Temporal Activity classes
 * Extends the base Temporal activity options with NestJS-specific properties
 */
export interface ActivityOptions {
    /**
     * Optional name for the activity class
     * If not provided, the class name will be used
     */
    name?: string;

    /**
     * Optional description of what the activity does
     */
    description?: string;
}

/**
 * Options for configuring Temporal Activity Methods
 *
 * Defines the configuration for activity methods in a way that
 * aligns with Temporal's concepts but fits into NestJS patterns
 */
export interface ActivityMethodOptions {
    /**
     * Custom name for the activity method
     * If not specified, the method name will be used
     */
    name?: string;

    /**
     * Optional activity timeout settings
     */
    timeout?: {
        /**
         * Maximum time allowed for the activity execution
         * Format: number in milliseconds or string like '30s', '5m'
         */
        startToClose?: string | number;

        /**
         * Maximum time allowed for the activity to be scheduled
         * Format: number in milliseconds or string like '30s', '5m'
         */
        scheduleToStart?: string | number;

        /**
         * Maximum time allowed for scheduling and executing the activity
         * Format: number in milliseconds or string like '30s', '5m'
         */
        scheduleToClose?: string | number;

        /**
         * Maximum time allowed for a heartbeat
         * Format: number in milliseconds or string like '30s', '5m'
         */
        heartbeat?: string | number;
    };

    /**
     * Retry policy for failed activities
     */
    retry?: {
        /**
         * Maximum number of retry attempts
         */
        maximumAttempts?: number;

        /**
         * Initial interval between retries
         * Format: number in milliseconds or string like '1s', '30s'
         */
        initialInterval?: string | number;

        /**
         * Maximum interval between retries
         * Format: number in milliseconds or string like '1m', '5m'
         */
        maximumInterval?: string | number;

        /**
         * Backoff coefficient for retry intervals
         * Default: 2.0
         */
        backoffCoefficient?: number;

        /**
         * Error types that should not be retried
         */
        nonRetryableErrorTypes?: string[];
    };

    /**
     * Controls how the SDK handles activity cancellation
     * Aligns with Temporal ActivityCancellationType
     */
    cancellationType?: 'TRY_CANCEL' | 'WAIT_CANCELLATION_COMPLETED' | 'ABANDON';
}
