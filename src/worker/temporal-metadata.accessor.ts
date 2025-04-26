/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { Injectable } from '@nestjs/common';
import {
    TEMPORAL_ACTIVITY,
    TEMPORAL_ACTIVITY_METHOD,
    TEMPORAL_ACTIVITY_METHOD_NAME,
    TEMPORAL_ACTIVITY_METHOD_OPTIONS,
    TEMPORAL_QUERY_METHOD,
    TEMPORAL_QUERY_NAME,
    TEMPORAL_SIGNAL_METHOD,
    TEMPORAL_SIGNAL_NAME,
    TEMPORAL_UPDATE_METHOD,
    TEMPORAL_UPDATE_NAME,
    TEMPORAL_WORKFLOW,
    TEMPORAL_WORKFLOW_METHOD,
    TEMPORAL_WORKFLOW_METHOD_NAME,
    TEMPORAL_WORKFLOW_OPTIONS,
} from '../constants';

/**
 * Service for accessing Temporal-related metadata
 * Used for discovering and extracting metadata from decorated classes and methods
 */
@Injectable()
export class TemporalMetadataAccessor {
    /**
     * Check if target is marked as a Temporal Activity
     * @param target Class to check
     */
    isActivity(target: Function): boolean {
        if (!target) {
            return false;
        }
        return !!Reflect.getMetadata(TEMPORAL_ACTIVITY, target);
    }

    /**
     * Get activity options from a decorated class
     * @param target Class to check
     */
    getActivityOptions(target: Function): Record<string, any> | undefined {
        if (!target) {
            return undefined;
        }
        return Reflect.getMetadata(TEMPORAL_ACTIVITY, target);
    }

    /**
     * Check if target is marked as a Temporal Activity Method
     * @param target Method to check
     */
    isActivityMethod(target: Function): boolean {
        if (!target) {
            return false;
        }
        return !!Reflect.getMetadata(TEMPORAL_ACTIVITY_METHOD, target);
    }

    /**
     * Get the name of the Activity Method
     * @param target Method to check
     */
    getActivityMethodName(target: Function): string | undefined {
        if (!target) {
            return undefined;
        }
        return Reflect.getMetadata(TEMPORAL_ACTIVITY_METHOD_NAME, target);
    }

    /**
     * Get options for an Activity Method
     * @param target Method to check
     */
    getActivityMethodOptions(target: Function): Record<string, any> | undefined {
        if (!target) {
            return undefined;
        }
        return Reflect.getMetadata(TEMPORAL_ACTIVITY_METHOD_OPTIONS, target);
    }

    /**
     * Check if target is marked as a Temporal Workflow
     * @param target Class to check
     */
    isWorkflow(target: Function): boolean {
        if (!target) {
            return false;
        }
        return !!Reflect.getMetadata(TEMPORAL_WORKFLOW, target);
    }

    /**
     * Get workflow options from a decorated class
     * @param target Class to check
     */
    getWorkflowOptions(target: Function): Record<string, any> | undefined {
        if (!target) {
            return undefined;
        }
        return Reflect.getMetadata(TEMPORAL_WORKFLOW_OPTIONS, target);
    }

    /**
     * Check if target is marked as a Temporal Workflow Method
     * @param target Method to check
     */
    isWorkflowMethod(target: Function): boolean {
        if (!target) {
            return false;
        }
        return !!Reflect.getMetadata(TEMPORAL_WORKFLOW_METHOD, target);
    }

    /**
     * Get the name of the Workflow Method
     * @param target Method to check
     */
    getWorkflowMethodName(target: Function): string | undefined {
        if (!target) {
            return undefined;
        }
        return Reflect.getMetadata(TEMPORAL_WORKFLOW_METHOD_NAME, target);
    }

    /**
     * Check if target is marked as a Temporal Query Method
     * @param target Method to check
     */
    isQueryMethod(target: Function): boolean {
        if (!target) {
            return false;
        }
        return !!Reflect.getMetadata(TEMPORAL_QUERY_METHOD, target);
    }

    /**
     * Get the name of the Query Method
     * @param target Method to check
     */
    getQueryMethodName(target: Function): string | undefined {
        if (!target) {
            return undefined;
        }
        return Reflect.getMetadata(TEMPORAL_QUERY_NAME, target);
    }

    /**
     * Check if target is marked as a Temporal Signal Method
     * @param target Method to check
     */
    isSignalMethod(target: Function): boolean {
        if (!target) {
            return false;
        }
        return !!Reflect.getMetadata(TEMPORAL_SIGNAL_METHOD, target);
    }

    /**
     * Get the name of the Signal Method
     * @param target Method to check
     */
    getSignalMethodName(target: Function): string | undefined {
        if (!target) {
            return undefined;
        }
        return Reflect.getMetadata(TEMPORAL_SIGNAL_NAME, target);
    }

    /**
     * Check if target is marked as a Temporal Update Method
     * @param target Method to check
     */
    isUpdateMethod(target: Function): boolean {
        if (!target) {
            return false;
        }
        return !!Reflect.getMetadata(TEMPORAL_UPDATE_METHOD, target);
    }

    /**
     * Get the name of the Update Method
     * @param target Method to check
     */
    getUpdateMethodName(target: Function): string | undefined {
        if (!target) {
            return undefined;
        }
        return Reflect.getMetadata(TEMPORAL_UPDATE_NAME, target);
    }

    /**
     * Extract all activity methods from a class instance
     * Returns map of activity name to method
     * @param instance Class instance to examine
     */
    extractActivityMethods(instance: any): Map<string, Function> {
        if (!instance) {
            return new Map();
        }

        const methods = new Map<string, Function>();
        const prototype = Object.getPrototypeOf(instance);
        const methodNames = Object.getOwnPropertyNames(prototype).filter(
            (prop) => prop !== 'constructor',
        );

        for (const methodName of methodNames) {
            const method = prototype[methodName];
            if (this.isActivityMethod(method)) {
                const activityName = this.getActivityMethodName(method) || methodName;
                methods.set(activityName, method.bind(instance));
            }
        }

        return methods;
    }
}
