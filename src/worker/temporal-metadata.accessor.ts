import { Injectable } from '@nestjs/common';
import {
  TEMPORAL_ACTIVITY,
  TEMPORAL_ACTIVITY_METHOD,
  TEMPORAL_ACTIVITY_METHOD_NAME,
} from '../constants';

@Injectable()
export class TemporalMetadataAccessor {
  isActivity(target: any): boolean {
    if (!target) {
      return false;
    }
    return !!Reflect.getMetadata(TEMPORAL_ACTIVITY, target);
  }

  isActivityMethod(target: any): boolean {
    if (!target) {
      return false;
    }
    return !!Reflect.getMetadata(TEMPORAL_ACTIVITY_METHOD, target);
  }

  getActivityMethodName(target: any): string | undefined {
    if (!target) {
      return undefined;
    }
    return Reflect.getMetadata(TEMPORAL_ACTIVITY_METHOD_NAME, target);
  }
}
