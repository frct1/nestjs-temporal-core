import { Inject } from '@nestjs/common';
import { TEMPORAL_CLIENT } from '../constants';

export const InjectTemporalClient = (): ParameterDecorator => Inject(TEMPORAL_CLIENT);
