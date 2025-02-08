import { SetMetadata } from '@nestjs/common';
import { WorkflowOptions } from '@temporalio/client';
import { TEMPORAL_WORKFLOW } from '../constants';

export function Workflow(
  options: WorkflowOptions = { workflowId: '', taskQueue: '' },
): ClassDecorator {
  return (target: any) => {
    SetMetadata(TEMPORAL_WORKFLOW, options)(target);
    return target;
  };
}
