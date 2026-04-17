import { describe, it, expect } from 'vitest';
import { computeHeadRotation, scaleHeadForNeck, NECK_WEIGHT } from '../../src/core/avatar/applyHead';
import type { FaceRig } from '../../src/types';

const rig: FaceRig = {
  head: { x: 0.3, y: 0.2, z: 0.1 },
  eye: { l: 1, r: 1 },
  mouth: { shape: { A: 0, I: 0, U: 0, E: 0, O: 0 } },
};

describe('computeHeadRotation', () => {
  it('null rig → all zeros', () => {
    const h = computeHeadRotation(null, false, null, 0);
    expect(h).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('no smoothing: x passes through, y/z flipped (mirror webcam)', () => {
    const h = computeHeadRotation(rig, false, null, 0);
    expect(h.x).toBeCloseTo(0.3);
    expect(h.y).toBeCloseTo(-0.2);
    expect(h.z).toBeCloseTo(-0.1);
  });
});

describe('scaleHeadForNeck', () => {
  it('scales by NECK_WEIGHT (30%) by default', () => {
    const neck = scaleHeadForNeck({ x: 1, y: 1, z: 1 });
    expect(neck.x).toBeCloseTo(NECK_WEIGHT);
    expect(neck.y).toBeCloseTo(NECK_WEIGHT);
    expect(neck.z).toBeCloseTo(NECK_WEIGHT);
  });

  it('accepts custom weight', () => {
    const neck = scaleHeadForNeck({ x: 2, y: 2, z: 2 }, 0.5);
    expect(neck.x).toBe(1);
  });
});
