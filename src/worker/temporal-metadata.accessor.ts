import { Injectable } from '@nestjs/common';
import {
  TEMPORAL_ACTIVITY,
  TEMPORAL_ACTIVITY_METHOD,
  TEMPORAL_ACTIVITY_METHOD_NAME,
} from '../constants';

@Injectable()
export class TemporalMetadataAccessor {
  /**
   * Check if target is marked as a Temporal Activity
   */
  isActivity(target: Function): boolean {
    if (!target) {
      return false;
    }
    return !!Reflect.getMetadata(TEMPORAL_ACTIVITY, target);
  }

  /**
   * Check if target is marked as a Temporal Activity Method
   */
  isActivityMethod(target: Function): boolean {
    if (!target) {
      return false;
    }
    return !!Reflect.getMetadata(TEMPORAL_ACTIVITY_METHOD, target);
  }

  /**
   * Get the name of the Activity Method
   */
  getActivityMethodName(target: Function): string | undefined {
    if (!target) {
      return undefined;
    }
    return Reflect.getMetadata(TEMPORAL_ACTIVITY_METHOD_NAME, target);
  }
}
