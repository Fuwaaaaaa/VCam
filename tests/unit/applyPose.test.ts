import { describe, it, expect } from 'vitest';
import { computePoseBoneRotations, computeHipPosition } from '../../src/core/avatar/applyPose';
import type { PoseRig } from '../../src/types';

const upperBodyRig: PoseRig = {
  Hips: { rotation: { x: 0.1, y: 0.2, z: 0.3 } },
  Spine: { x: 0.05, y: -0.1, z: 0.02 },
  LeftUpperArm:  { x: 1.0, y: 0.5, z: -0.3 },
  LeftLowerArm:  { x: 0.8, y: 0.0, z: 0.1 },
  LeftHand:      { x: 0.2, y: 0.1, z: 0.0 },
  RightUpperArm: { x: -1.0, y: -0.5, z: 0.3 },
  RightLowerArm: { x: -0.8, y: 0.0, z: -0.1 },
  RightHand:     { x: -0.2, y: -0.1, z: 0.0 },
};

const fullBodyRig: PoseRig = {
  ...upperBodyRig,
  Hips: { rotation: { x: 0.1, y: 0.2, z: 0.3 }, position: { x: 0.1, y: -0.05, z: 0.2 } },
  LeftUpperLeg:  { x: 0.2, y: 0.0, z: 0.0 },
  LeftLowerLeg:  { x: 0.4, y: 0.0, z: 0.0 },
  RightUpperLeg: { x: 0.3, y: 0.0, z: 0.0 },
  RightLowerLeg: { x: 0.5, y: 0.0, z: 0.0 },
};

const baseOpts = { smooth: false, mirror: true };

describe('computePoseBoneRotations — null rig', () => {
  it('returns empty map when rig is null', () => {
    const out = computePoseBoneRotations(null, baseOpts, null, 0);
    expect(out).toEqual({});
  });
});

describe('computePoseBoneRotations — mirror flip', () => {
  it('mirror=true flips y and z, keeps x', () => {
    const out = computePoseBoneRotations(upperBodyRig, baseOpts, null, 0);
    expect(out.leftUpperArm).toEqual({ x: 1.0, y: -0.5, z: 0.3 });
    expect(out.rightUpperArm).toEqual({ x: -1.0, y: 0.5, z: -0.3 });
  });

  it('mirror=false passes through unchanged', () => {
    const out = computePoseBoneRotations(upperBodyRig, { ...baseOpts, mirror: false }, null, 0);
    expect(out.leftUpperArm).toEqual({ x: 1.0, y: 0.5, z: -0.3 });
  });
});

describe('computePoseBoneRotations — upper body coverage', () => {
  it('includes all 6 arm/hand bones + spine + hips', () => {
    const out = computePoseBoneRotations(upperBodyRig, baseOpts, null, 0);
    expect(out).toHaveProperty('leftUpperArm');
    expect(out).toHaveProperty('leftLowerArm');
    expect(out).toHaveProperty('leftHand');
    expect(out).toHaveProperty('rightUpperArm');
    expect(out).toHaveProperty('rightLowerArm');
    expect(out).toHaveProperty('rightHand');
    expect(out).toHaveProperty('spine');
    expect(out).toHaveProperty('hips');
  });

  it('skips bones whose rig fields are missing', () => {
    const partial: PoseRig = { LeftUpperArm: { x: 1, y: 0, z: 0 } };
    const out = computePoseBoneRotations(partial, { ...baseOpts, mirror: false }, null, 0);
    expect(out).toHaveProperty('leftUpperArm');
    expect(out).not.toHaveProperty('rightUpperArm');
    expect(out).not.toHaveProperty('spine');
  });

  it('handles missing Hips.rotation gracefully', () => {
    const rig: PoseRig = { ...upperBodyRig, Hips: {} };
    const out = computePoseBoneRotations(rig, baseOpts, null, 0);
    expect(out).not.toHaveProperty('hips');
  });
});

describe('computePoseBoneRotations — Phase 3-b leg coverage', () => {
  it('includes all 4 leg bones when rig provides them and legStrength=1', () => {
    const out = computePoseBoneRotations(fullBodyRig, { ...baseOpts, legStrength: 1 }, null, 0);
    expect(out).toHaveProperty('leftUpperLeg');
    expect(out).toHaveProperty('leftLowerLeg');
    expect(out).toHaveProperty('rightUpperLeg');
    expect(out).toHaveProperty('rightLowerLeg');
  });

  it('legStrength=0 excludes leg bones entirely', () => {
    const out = computePoseBoneRotations(fullBodyRig, { ...baseOpts, legStrength: 0 }, null, 0);
    expect(out).not.toHaveProperty('leftUpperLeg');
    expect(out).not.toHaveProperty('rightUpperLeg');
    // Upper body still present
    expect(out).toHaveProperty('leftUpperArm');
  });

  it('legStrength=0.5 scales leg rotations', () => {
    const out = computePoseBoneRotations(
      fullBodyRig,
      { ...baseOpts, mirror: false, legStrength: 0.5 },
      null, 0,
    );
    // LeftUpperLeg.x was 0.2 → should be 0.1 at 0.5 strength
    expect(out.leftUpperLeg?.x).toBeCloseTo(0.1);
  });

  it('arms are NOT scaled by legStrength', () => {
    const out = computePoseBoneRotations(
      fullBodyRig,
      { ...baseOpts, mirror: false, legStrength: 0.1 },
      null, 0,
    );
    expect(out.leftUpperArm?.x).toBeCloseTo(1.0);
  });
});

describe('computeHipPosition', () => {
  it('returns null when rig has no Hips.position', () => {
    expect(computeHipPosition(upperBodyRig, { smooth: false, mirror: false }, null, 0)).toBeNull();
    expect(computeHipPosition(null, { smooth: false, mirror: false }, null, 0)).toBeNull();
  });

  it('applies hipPosStrength 0.3 by default', () => {
    const hp = computeHipPosition(
      fullBodyRig,
      { smooth: false, mirror: false },
      null, 0,
    );
    // raw x=0.1, y=-0.05 → 0.3x → x=0.03, y=-0.015
    expect(hp?.x).toBeCloseTo(0.03);
    expect(hp?.y).toBeCloseTo(-0.015);
  });

  it('mirror flips X', () => {
    const hp = computeHipPosition(
      fullBodyRig,
      { smooth: false, mirror: true, hipPosStrength: 1 },
      null, 0,
    );
    expect(hp?.x).toBeCloseTo(-0.1);
    expect(hp?.y).toBeCloseTo(-0.05);
  });

  it('clamps Y to floor (-0.2)', () => {
    const extreme: PoseRig = {
      Hips: { position: { x: 0, y: -100, z: 0 } },
    };
    const hp = computeHipPosition(
      extreme,
      { smooth: false, mirror: false, hipPosStrength: 1 },
      null, 0,
    );
    expect(hp?.y).toBe(-0.2);
  });

  it('clamps Y to ceiling (0.5)', () => {
    const extreme: PoseRig = {
      Hips: { position: { x: 0, y: 100, z: 0 } },
    };
    const hp = computeHipPosition(
      extreme,
      { smooth: false, mirror: false, hipPosStrength: 1 },
      null, 0,
    );
    expect(hp?.y).toBe(0.5);
  });

  it('does not use Z coordinate', () => {
    const hp = computeHipPosition(
      { Hips: { position: { x: 0, y: 0, z: 99 } } },
      { smooth: false, mirror: false, hipPosStrength: 1 },
      null, 0,
    );
    // HipPosition only has x and y keys — Z is not in the output type
    expect(hp).toEqual({ x: 0, y: 0 });
  });
});
