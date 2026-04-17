import { describe, it, expect } from 'vitest';
import { computePoseBoneRotations } from '../../src/core/avatar/applyPose';
import type { PoseRig } from '../../src/types';

const sampleRig: PoseRig = {
  Hips: { rotation: { x: 0.1, y: 0.2, z: 0.3 } },
  Spine: { x: 0.05, y: -0.1, z: 0.02 },
  LeftUpperArm:  { x: 1.0, y: 0.5, z: -0.3 },
  LeftLowerArm:  { x: 0.8, y: 0.0, z: 0.1 },
  LeftHand:      { x: 0.2, y: 0.1, z: 0.0 },
  RightUpperArm: { x: -1.0, y: -0.5, z: 0.3 },
  RightLowerArm: { x: -0.8, y: 0.0, z: -0.1 },
  RightHand:     { x: -0.2, y: -0.1, z: 0.0 },
};

describe('computePoseBoneRotations — null rig', () => {
  it('returns empty map when rig is null', () => {
    const out = computePoseBoneRotations(null, { smooth: false, mirror: true }, null, 0);
    expect(out).toEqual({});
  });
});

describe('computePoseBoneRotations — mirror flip', () => {
  it('mirror=true flips y and z, keeps x', () => {
    const out = computePoseBoneRotations(sampleRig, { smooth: false, mirror: true }, null, 0);
    expect(out.leftUpperArm).toEqual({ x: 1.0, y: -0.5, z: 0.3 });
    expect(out.rightUpperArm).toEqual({ x: -1.0, y: 0.5, z: -0.3 });
  });

  it('mirror=false passes through unchanged', () => {
    const out = computePoseBoneRotations(sampleRig, { smooth: false, mirror: false }, null, 0);
    expect(out.leftUpperArm).toEqual({ x: 1.0, y: 0.5, z: -0.3 });
    expect(out.rightUpperArm).toEqual({ x: -1.0, y: -0.5, z: 0.3 });
  });
});

describe('computePoseBoneRotations — bone coverage (upper body)', () => {
  it('includes all 6 upper-body arm/hand bones when rig provides them', () => {
    const out = computePoseBoneRotations(sampleRig, { smooth: false, mirror: false }, null, 0);
    expect(out).toHaveProperty('leftUpperArm');
    expect(out).toHaveProperty('leftLowerArm');
    expect(out).toHaveProperty('leftHand');
    expect(out).toHaveProperty('rightUpperArm');
    expect(out).toHaveProperty('rightLowerArm');
    expect(out).toHaveProperty('rightHand');
  });

  it('includes spine and hips rotation', () => {
    const out = computePoseBoneRotations(sampleRig, { smooth: false, mirror: false }, null, 0);
    expect(out).toHaveProperty('spine');
    expect(out).toHaveProperty('hips');
  });

  it('skips bones whose rig fields are missing', () => {
    const partial: PoseRig = { LeftUpperArm: { x: 1, y: 0, z: 0 } };
    const out = computePoseBoneRotations(partial, { smooth: false, mirror: false }, null, 0);
    expect(out).toHaveProperty('leftUpperArm');
    expect(out).not.toHaveProperty('rightUpperArm');
    expect(out).not.toHaveProperty('spine');
    expect(out).not.toHaveProperty('hips');
  });

  it('does NOT include leg bones (Phase 3-a is upper body only)', () => {
    const withLegs: PoseRig = {
      ...sampleRig,
      LeftUpperLeg:  { x: 0.1, y: 0, z: 0 },
      RightUpperLeg: { x: 0.2, y: 0, z: 0 },
    };
    const out = computePoseBoneRotations(withLegs, { smooth: false, mirror: false }, null, 0);
    expect(out).not.toHaveProperty('leftUpperLeg');
    expect(out).not.toHaveProperty('rightUpperLeg');
  });

  it('handles missing Hips.rotation gracefully', () => {
    const rig: PoseRig = { ...sampleRig, Hips: {} };
    const out = computePoseBoneRotations(rig, { smooth: false, mirror: false }, null, 0);
    expect(out).not.toHaveProperty('hips');
  });
});

describe('computePoseBoneRotations — smoothing', () => {
  it('with smooth=true and no filters, degrades gracefully (no filtering)', () => {
    const out = computePoseBoneRotations(sampleRig, { smooth: true, mirror: false }, null, 0);
    // Without filters, values pass through without smoothing
    expect(out.leftUpperArm).toEqual({ x: 1.0, y: 0.5, z: -0.3 });
  });
});
