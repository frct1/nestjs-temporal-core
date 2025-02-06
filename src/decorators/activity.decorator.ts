import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_ACTIVITY } from '../constants';

export interface ActivityOptions {
  name?: string;
}

export function Activity(options: ActivityOptions = {}): ClassDecorator {
  return (target: any) => {
    SetMetadata(TEMPORAL_ACTIVITY, true)(target);
    if (options.name) {
      Reflect.defineMetadata('activityName', options.name, target);
    }
    return target;
  };
}
