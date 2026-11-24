import { createClockProp } from './clockProp';
import { createShapeProp } from './shapeProp';
import { createCurtainProp } from './curtainProp';
import { createLetterProp } from './letterProp';
import { createTrophyProp } from './trophyProp';
import type { PropFactory } from './types';

export { PROP_ATTR } from './types';
export type { PropInstance, PropFactory } from './types';

/** Oggetti 3D disponibili, per nome (`data-stage-prop="letter3d"`). Nuovi giochi aggiungono qui il proprio. */
export const PROPS: Record<string, PropFactory> = {
  letter3d: createLetterProp,
  trophy: createTrophyProp,
  curtain: createCurtainProp,
  clock3d: createClockProp,
  shape3d: createShapeProp,
};
