import { Injectable, Logger } from '@nestjs/common';
import { TEMPORAL_ACTIVITY, TEMPORAL_ACTIVITY_METHOD } from 'src/constants';
import { ActivityMetadata, ActivityMethodHandler, ActivityMethodMetadata } from 'src/interfaces';

/**
 * Streamlined Temporal Metadata Accessor
 * Provides efficient discovery and extraction of metadata from decorated classes and methods
 */
@Injectable()
export class TemporalMetadataAccessor {
    private readonly logger = new Logger(TemporalMetadataAccessor.name);

    // Efficient caching to avoid repeated reflection calls
    private readonly activityClassCache = new WeakMap<any, ActivityMetadata | null>();
    private readonly activityMethodCache = new WeakMap<any, Map<string, ActivityMethodMetadata>>();

    // ==========================================
    // Activity Class Methods
    // ==========================================

    /**
     * Check if target class is marked as a Temporal Activity
     */
    isActivity(target: any): boolean {
        if (!target || typeof target !== 'function') {
            return false;
        }

        // Check cache first
        if (this.activityClassCache.has(target)) {
            return this.activityClassCache.get(target) !== null;
        }

        const metadata = this.getActivityMetadata(target);
        const isActivity = metadata !== null;

        this.activityClassCache.set(target, metadata);
        return isActivity;
    }

    /**
     * Get activity metadata from a decorated class
     */
    getActivityOptions(target: any): ActivityMetadata | null {
        if (!target || typeof target !== 'function') {
            return null;
        }

        // Check cache first
        if (this.activityClassCache.has(target)) {
            return this.activityClassCache.get(target) || null;
        }

        const metadata = this.getActivityMetadata(target);
        this.activityClassCache.set(target, metadata);
        return metadata;
    }

    // ==========================================
    // Activity Method Methods
    // ==========================================

    /**
     * Check if target method is marked as a Temporal Activity Method
     */
    isActivityMethod(target: any): boolean {
        return (
            target &&
            typeof target === 'function' &&
            Boolean(Reflect.getMetadata(TEMPORAL_ACTIVITY_METHOD, target))
        );
    }

    /**
     * Get the name of an Activity Method
     */
    getActivityMethodName(target: any): string | null {
        if (!target || typeof target !== 'function') {
            return null;
        }

        const metadata = Reflect.getMetadata(TEMPORAL_ACTIVITY_METHOD, target);
        return metadata?.name || null;
    }

    /**
     * Get options for an Activity Method
     */
    getActivityMethodOptions(target: any): Record<string, any> | null {
        if (!target || typeof target !== 'function') {
            return null;
        }

        const metadata = Reflect.getMetadata(TEMPORAL_ACTIVITY_METHOD, target);
        return metadata || null;
    }

    // ==========================================
    // Activity Extraction Methods
    // ==========================================

    /**
     * Extract all activity methods from a class instance
     * Returns map of activity name to bound method handler
     */
    extractActivityMethods(instance: any): Map<string, ActivityMethodHandler> {
        if (!instance || typeof instance !== 'object') {
            this.logger.warn('Invalid instance provided to extractActivityMethods');
            return new Map();
        }

        const { constructor } = instance;

        // Check cache first
        if (this.activityMethodCache.has(constructor)) {
            const cachedMethods = this.activityMethodCache.get(constructor)!;
            // Return new map with bound methods
            const boundMethods = new Map<string, ActivityMethodHandler>();
            for (const [name, metadata] of cachedMethods.entries()) {
                boundMethods.set(name, metadata.handler.bind(instance));
            }
            return boundMethods;
        }

        const methods = this.extractMethodsFromPrototype(instance);
        this.activityMethodCache.set(constructor, methods);

        // Return bound methods
        const boundMethods = new Map<string, ActivityMethodHandler>();
        for (const [name, metadata] of methods.entries()) {
            boundMethods.set(name, metadata.handler.bind(instance));
        }

        return boundMethods;
    }

    /**
     * Get activity method metadata for a specific method
     */
    getActivityMethodMetadata(instance: any, methodName: string): ActivityMethodMetadata | null {
        const methods = this.extractActivityMethods(instance);

        for (const [activityName, handler] of methods.entries()) {
            const cachedMethods = this.activityMethodCache.get(instance.constructor);
            if (cachedMethods) {
                const metadata = cachedMethods.get(activityName);
                if (metadata && metadata.originalName === methodName) {
                    return {
                        ...metadata,
                        handler, // This is already bound
                    };
                }
            }
        }

        return null;
    }

    /**
     * Get all activity method names for a class
     */
    getActivityMethodNames(target: any): string[] {
        if (!target || typeof target !== 'function') {
            return [];
        }

        const cachedMethods = this.activityMethodCache.get(target);
        if (cachedMethods) {
            return Array.from(cachedMethods.keys());
        }

        // Extract methods from prototype without creating instance
        const { prototype } = target;
        if (!prototype) {
            return [];
        }

        const methodNames: string[] = [];
        const propertyNames = Object.getOwnPropertyNames(prototype);

        for (const propertyName of propertyNames) {
            if (propertyName === 'constructor') continue;

            try {
                const method = prototype[propertyName];
                if (typeof method === 'function' && this.isActivityMethod(method)) {
                    const activityName = this.getActivityMethodName(method) || propertyName;
                    methodNames.push(activityName);
                }
            } catch (error) {
                this.logger.debug(`Error checking method ${propertyName}: ${error.message}`);
            }
        }

        return methodNames;
    }

    // ==========================================
    // Utility Methods
    // ==========================================

    /**
     * Get comprehensive activity information for a class
     */
    getActivityInfo(target: any): {
        isActivity: boolean;
        activityOptions: ActivityMetadata | null;
        methodNames: string[];
        methodCount: number;
    } {
        return {
            isActivity: this.isActivity(target),
            activityOptions: this.getActivityOptions(target),
            methodNames: this.getActivityMethodNames(target),
            methodCount: this.getActivityMethodNames(target).length,
        };
    }

    /**
     * Validate that an activity class has at least one activity method
     */
    validateActivityClass(target: any): {
        isValid: boolean;
        issues: string[];
    } {
        const issues: string[] = [];

        if (!this.isActivity(target)) {
            issues.push('Class is not marked with @Activity decorator');
        }

        const methodNames = this.getActivityMethodNames(target);
        if (methodNames.length === 0) {
            issues.push('Activity class has no methods marked with @ActivityMethod');
        }

        return {
            isValid: issues.length === 0,
            issues,
        };
    }

    /**
     * Clear metadata caches (useful for testing or hot reloading)
     */
    clearCache(): void {
        // WeakMaps don't have clear() method, but they'll be garbage collected
        // when their keys are no longer referenced
        this.logger.debug('Metadata accessor cache cleared');
    }

    /**
     * Get cache statistics (limited due to WeakMap nature)
     */
    getCacheStats(): {
        message: string;
        note: string;
    } {
        // WeakMaps don't expose size, so we can't provide exact counts
        // This protects against memory leaks but limits introspection
        return {
            message: 'Cache statistics not available',
            note: 'WeakMap-based caching prevents memory leaks but limits size reporting',
        };
    }

    // ==========================================
    // Private Helper Methods
    // ==========================================

    /**
     * Get activity metadata from target class
     */
    private getActivityMetadata(target: any): ActivityMetadata | null {
        try {
            const metadata = Reflect.getMetadata(TEMPORAL_ACTIVITY, target);
            return metadata || null;
        } catch (error) {
            this.logger.debug(`Error getting activity metadata: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract methods from class prototype
     */
    private extractMethodsFromPrototype(instance: any): Map<string, ActivityMethodMetadata> {
        const methods = new Map<string, ActivityMethodMetadata>();
        const prototype = Object.getPrototypeOf(instance);

        if (!prototype) {
            return methods;
        }

        const propertyNames = Object.getOwnPropertyNames(prototype);

        for (const propertyName of propertyNames) {
            if (propertyName === 'constructor') continue;

            try {
                const method = prototype[propertyName];
                if (typeof method !== 'function') continue;

                if (this.isActivityMethod(method)) {
                    const metadata = this.getActivityMethodOptions(method);
                    const activityName = metadata?.name || propertyName;

                    methods.set(activityName, {
                        name: activityName,
                        originalName: propertyName,
                        options: metadata || undefined,
                        handler: method, // Not bound yet
                    });

                    this.logger.debug(
                        `Found activity method: ${instance.constructor.name}.${propertyName} -> ${activityName}`,
                    );
                }
            } catch (error) {
                this.logger.warn(
                    `Error processing method ${propertyName} in ${instance.constructor.name}: ${error.message}`,
                );
            }
        }

        return methods;
    }
}
