import { Inject } from '@nestjs/common';
import { TEMPORAL_CLIENT, TEMPORAL_WORKER } from '../constants';

export const InjectTemporalClient = () => Inject(TEMPORAL_CLIENT);
export const InjectTemporalWorker = () => Inject(TEMPORAL_WORKER);
