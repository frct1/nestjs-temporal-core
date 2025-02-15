import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_ACTIVITY } from '../constants';

/**
 * Decorator that marks a class as a Temporal Activity
 */
export const Activity = (): ClassDecorator => {
  return (target: any) => {
    Reflect.defineMetadata(TEMPORAL_ACTIVITY, true, target);
    SetMetadata(TEMPORAL_ACTIVITY, true)(target);
    return target;
  };
};
