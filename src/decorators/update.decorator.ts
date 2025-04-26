import { SetMetadata } from '@nestjs/common';
import {
    TEMPORAL_UPDATE_METHOD,
    TEMPORAL_UPDATE_NAME,
    TEMPORAL_UPDATE_VALIDATOR,
} from '../constants';
import { UpdateMethodOptions } from '../interfaces/workflow.interface';

/**
 * Decorator that marks a method as a Temporal Update Method
 *
 * Updates allow modifying the state of a running workflow and getting a synchronous result.
 * They act like a combination of signals (they can modify workflow state) and
 * queries (they return a value synchronously).
 *
 * @param options Optional configuration or update name string
 *
 * @example
 * ```typescript
 * @Workflow({ taskQueue: 'my-task-queue' })
 * export class UserWorkflow {
 *   private userData: UserData = { name: '', email: '' };
 *
 *   @WorkflowMethod()
 *   async execute(userId: string): Promise<string> {
 *     // Workflow implementation
 *   }
 *
 *   @Update()
 *   updateUserDetails(newData: Partial<UserData>): UserData {
 *     this.userData = { ...this.userData, ...newData };
 *     return this.userData;
 *   }
 *
 *   @Update({
 *     name: 'validateAndUpdateEmail',
 *     validator: (email: string) => {
 *       if (!email.includes('@')) {
 *         throw new Error('Invalid email format');
 *       }
 *     }
 *   })
 *   updateEmail(email: string): UserData {
 *     this.userData.email = email;
 *     return this.userData;
 *   }
 * }
 * ```
 */
export const Update = (options?: string | UpdateMethodOptions): MethodDecorator => {
    return (_target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        // Handle both string (name) and options object
        let updateName: string;
        let validator: ((...args: any[]) => void) | undefined;

        if (typeof options === 'string') {
            updateName = options;
        } else if (options && typeof options === 'object') {
            updateName = options.name || propertyKey.toString();
            validator = options.validator;
        } else {
            updateName = propertyKey.toString();
        }

        // Store metadata on the method
        Reflect.defineMetadata(TEMPORAL_UPDATE_METHOD, true, descriptor.value);
        Reflect.defineMetadata(TEMPORAL_UPDATE_NAME, updateName, descriptor.value);

        if (validator) {
            Reflect.defineMetadata(TEMPORAL_UPDATE_VALIDATOR, validator, descriptor.value);
        }

        // Set NestJS metadata for discovery
        SetMetadata(TEMPORAL_UPDATE_METHOD, true)(descriptor.value);
        SetMetadata(TEMPORAL_UPDATE_NAME, updateName)(descriptor.value);

        if (validator) {
            SetMetadata(TEMPORAL_UPDATE_VALIDATOR, validator)(descriptor.value);
        }

        return descriptor;
    };
};
