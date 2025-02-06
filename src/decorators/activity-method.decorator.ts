import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_ACTIVITY_METHOD } from '../constants';

export interface ActivityMethodOptions {
  name?: string;
}

export function ActivityMethod(options: ActivityMethodOptions = {}): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    SetMetadata(TEMPORAL_ACTIVITY_METHOD, true)(descriptor.value);

    // Store the method name if provided in options, otherwise use the property key
    const methodName = options.name || propertyKey.toString();
    Reflect.defineMetadata('activityMethodName', methodName, descriptor.value);

    return descriptor;
  };
}
