import { Injectable, Logger } from '@nestjs/common';
import {
    TEMPORAL_ACTIVITY,
    TEMPORAL_ACTIVITY_METHOD,
    TEMPORAL_ACTIVITY_METHOD_NAME,
    TEMPORAL_ACTIVITY_METHOD_OPTIONS,
    LOG_CATEGORIES,
} from '../constants';
import { ActivityMethodHandler } from '../interfaces';
import { ActivityMetadata, ActivityMethodMetadata } from 'src/interfaces';

/**
 * Enhanced service for accessing Temporal-related metadata
 * Provides efficient discovery and extraction of metadata from decorated classes and methods
 */
@Injectable()
export class TemporalMetadataAccessor {
    private readonly logger = new Logger(LOG_CATEGORIES.ACTIVITY);

    // Cache for metadata to avoid repeated reflection calls
    private readonly activityClassCache = new WeakMap<any, ActivityMetadata | null>();
    private readonly activityMethodCache = new WeakMap<any, Map<string, ActivityMethodMetadata>>();

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

        return Reflect.getMetadata(TEMPORAL_ACTIVITY_METHOD_NAME, target) || null;
    }

    /**
     * Get options for an Activity Method
     */
    getActivityMethodOptions(target: any): Record<string, any> | null {
        if (!target || typeof target !== 'function') {
            return null;
        }

        return Reflect.getMetadata(TEMPORAL_ACTIVITY_METHOD_OPTIONS, target) || null;
    }

    /**
     * Extract all activity methods from a class instance with enhanced caching
     * Returns map of activity name to bound method handler
     */
    extractActivityMethods(instance: any): Map<string, ActivityMethodHandler> {
        if (!instance || typeof instance !== 'object') {
            this.logger.warn('Invalid instance provided to extractActivityMethods');
            return new Map();
        }

        const constructor = instance.constructor;

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
                        handler: handler, // This is already bound
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
        const prototype = target.prototype;
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

    /**
     * Clear metadata caches (useful for testing or hot reloading)
     */
    clearCache(): void {
        // WeakMaps don't have clear() method, but they'll be garbage collected
        // when their keys are no longer referenced
        this.logger.debug('Metadata accessor cache cleared');
    }

    /**
     * Get statistics about cached metadata
     */
    getCacheStats(): {
        activityClassesCached: number;
        activityMethodsCached: number;
    } {
        // WeakMaps don't expose size, so we can't provide exact counts
        // This is a limitation but protects against memory leaks
        return {
            activityClassesCached: -1, // Unknown due to WeakMap
            activityMethodsCached: -1, // Unknown due to WeakMap
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
                    const activityName = this.getActivityMethodName(method) || propertyName;
                    const options = this.getActivityMethodOptions(method);

                    methods.set(activityName, {
                        name: activityName,
                        originalName: propertyName,
                        options: options || undefined,
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

    /**
     * Validate that a method signature is compatible with activity requirements
     */
    private validateMethodSignature(method: any, methodName: string): boolean {
        try {
            // Check if method is callable
            if (typeof method !== 'function') {
                this.logger.warn(`Method ${methodName} is not a function`);
                return false;
            }

            // Additional validation could be added here
            // For example, checking parameter types, return types, etc.

            return true;
        } catch (error) {
            this.logger.warn(
                `Error validating method signature for ${methodName}: ${error.message}`,
            );
            return false;
        }
    }
}
