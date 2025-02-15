import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_ACTIVITY_METHOD, TEMPORAL_ACTIVITY_METHOD_NAME } from '../constants';

/**
 * Decorator that marks a method as a Temporal Activity Method
 * @param name Optional name for the activity method
 */
export const ActivityMethod = (name?: string): MethodDecorator => {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const methodName = name || propertyKey.toString();

    Reflect.defineMetadata(TEMPORAL_ACTIVITY_METHOD, true, descriptor.value);
    Reflect.defineMetadata(TEMPORAL_ACTIVITY_METHOD_NAME, methodName, descriptor.value);

    SetMetadata(TEMPORAL_ACTIVITY_METHOD, true)(descriptor.value);
    SetMetadata(TEMPORAL_ACTIVITY_METHOD_NAME, methodName)(descriptor.value);

    return descriptor;
  };
};
