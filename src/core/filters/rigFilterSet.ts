import { OneEuroFilter } from './OneEuroFilter';

/** Rig の各軸を個別にスムージングするフィルタ束 */
export type RigFilterSet = {
  headX: OneEuroFilter;
  headY: OneEuroFilter;
  headZ: OneEuroFilter;
  pupilX: OneEuroFilter;
  pupilY: OneEuroFilter;
  brow: OneEuroFilter;
  eyeL: OneEuroFilter;
  eyeR: OneEuroFilter;
};

export function createRigFilterSet(): RigFilterSet {
  return {
    headX:  new OneEuroFilter(1.2, 0.01),
    headY:  new OneEuroFilter(1.2, 0.01),
    headZ:  new OneEuroFilter(1.2, 0.01),
    pupilX: new OneEuroFilter(2.0, 0.02),
    pupilY: new OneEuroFilter(2.0, 0.02),
    brow:   new OneEuroFilter(1.5, 0.01),
    eyeL:   new OneEuroFilter(3.0, 0.04),
    eyeR:   new OneEuroFilter(3.0, 0.04),
  };
}

export function resetRigFilterSet(f: RigFilterSet): void {
  (Object.keys(f) as (keyof RigFilterSet)[]).forEach((k) => f[k].reset());
}
