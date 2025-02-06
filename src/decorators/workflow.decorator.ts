import { SetMetadata } from '@nestjs/common';
import { TEMPORAL_WORKFLOW } from '../constants';
import { WorkflowOptions } from '@temporalio/client';

export function Workflow(
  options: WorkflowOptions = { workflowId: '', taskQueue: '' },
): ClassDecorator {
  return (target: any) => {
    SetMetadata(TEMPORAL_WORKFLOW, options)(target);
    return target;
  };
}
