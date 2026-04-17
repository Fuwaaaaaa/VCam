import { describe, it, expect } from 'vitest';
import { encodeMessage, isPeerMessageV1 } from '../../src/core/net/rigSerialize';
import type { FaceRig, PoseRig } from '../../src/types';

const face: FaceRig = {
  head: { x: 0.123456789, y: 0.2, z: 0.3 },
  eye: { l: 0.9876543, r: 1 },
  mouth: { shape: { A: 0.5, I: 0, U: 0, E: 0, O: 0 } },
  pupil: { x: 0.111111, y: -0.222222 },
  brow: 0.4444,
};

const pose: PoseRig = {
  Hips: { rotation: { x: 0.1, y: 0.2, z: 0.3 }, position: { x: 0.4, y: 0.5, z: 0.6 } },
  LeftUpperArm: { x: 1.0, y: -0.5, z: 0.3 },
};

describe('encodeMessage', () => {
  it('produces a V1 envelope with timestamp', () => {
    const msg = encodeMessage({ face, pose, hipPos: null, micLevel: 0.3 });
    expect(msg.v).toBe(1);
    expect(typeof msg.t).toBe('number');
  });

  it('rounds numbers to 4 decimals to compact the payload', () => {
    const msg = encodeMessage({ face, pose: null, hipPos: null, micLevel: 0 });
    expect(msg.face?.head.x).toBe(0.1235);
    expect(msg.face?.eye.l).toBe(0.9877);
    expect(msg.face?.brow).toBe(0.4444);
  });

  it('preserves null for missing sections', () => {
    const msg = encodeMessage({ face: null, pose: null, hipPos: null, micLevel: 0 });
    expect(msg.face).toBeNull();
    expect(msg.pose).toBeNull();
    expect(msg.hipPos).toBeNull();
  });

  it('compacts pose hips rotation + position together', () => {
    const msg = encodeMessage({ face: null, pose, hipPos: null, micLevel: 0 });
    expect(msg.pose?.Hips?.rotation).toEqual({ x: 0.1, y: 0.2, z: 0.3 });
    expect(msg.pose?.Hips?.position).toEqual({ x: 0.4, y: 0.5, z: 0.6 });
  });

  it('copies only provided bones from the PoseRig', () => {
    const msg = encodeMessage({ face: null, pose, hipPos: null, micLevel: 0 });
    expect(msg.pose?.LeftUpperArm).toEqual({ x: 1, y: -0.5, z: 0.3 });
    expect(msg.pose?.RightUpperArm).toBeUndefined();
  });

  it('hipPos null/present passthrough with rounding', () => {
    const a = encodeMessage({ face: null, pose: null, hipPos: { x: 0.123456, y: -0.9877 }, micLevel: 0 });
    expect(a.hipPos).toEqual({ x: 0.1235, y: -0.9877 });
  });
});

describe('isPeerMessageV1', () => {
  it('accepts v=1 messages with a numeric t', () => {
    expect(isPeerMessageV1({ v: 1, t: 1234 })).toBe(true);
  });

  it('rejects wrong version, missing t, non-objects', () => {
    expect(isPeerMessageV1({ v: 2, t: 123 })).toBe(false);
    expect(isPeerMessageV1({ v: 1 })).toBe(false);
    expect(isPeerMessageV1(null)).toBe(false);
    expect(isPeerMessageV1('{"v":1,"t":123}')).toBe(false);
    expect(isPeerMessageV1(undefined)).toBe(false);
  });
});
