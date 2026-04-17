import { describe, it, expect } from 'vitest';
import { computeExpressions } from '../../src/core/avatar/applyExpressions';
import type { FaceRig } from '../../src/types';

const baseRig: FaceRig = {
  head: { x: 0, y: 0, z: 0 },
  eye: { l: 1, r: 1 },
  mouth: { shape: { A: 0, I: 0, U: 0, E: 0, O: 0 } },
  pupil: { x: 0, y: 0 },
  brow: 0.5,
};

const baseOpts = { mic: false, gaze: true, smooth: false, micLevel: 0 };

describe('computeExpressions — null rig', () => {
  it('returns all zeros when no rig', () => {
    const ev = computeExpressions(null, baseOpts, null, 0);
    expect(ev.blinkLeft).toBe(0);
    expect(ev.blinkRight).toBe(0);
    expect(ev.aa).toBe(0);
    expect(ev.surprised).toBe(0);
    expect(ev.sad).toBe(0);
  });

  it('still applies mic level to aa when no rig but mic on', () => {
    const ev = computeExpressions(null, { ...baseOpts, mic: true, micLevel: 0.6 }, null, 0);
    expect(ev.aa).toBeCloseTo(0.6);
  });
});

describe('computeExpressions — blink inversion', () => {
  it('eye.l=1 (fully open) → blinkLeft=0', () => {
    const ev = computeExpressions({ ...baseRig, eye: { l: 1, r: 1 } }, baseOpts, null, 0);
    expect(ev.blinkLeft).toBe(0);
  });

  it('eye.l=0 (fully closed) → blinkLeft=1', () => {
    const ev = computeExpressions({ ...baseRig, eye: { l: 0, r: 0 } }, baseOpts, null, 0);
    expect(ev.blinkLeft).toBe(1);
  });

  it('clamps out-of-range eye values', () => {
    const ev = computeExpressions({ ...baseRig, eye: { l: 1.5, r: -0.3 } }, baseOpts, null, 0);
    expect(ev.blinkLeft).toBe(0);   // clamp01(1.5) = 1 → 1-1=0
    expect(ev.blinkRight).toBe(1);  // clamp01(-0.3) = 0 → 1-0=1
  });
});

describe('computeExpressions — brow → surprised/sad', () => {
  it('neutral brow (0.5) → no surprised, no sad', () => {
    const ev = computeExpressions({ ...baseRig, brow: 0.5 }, baseOpts, null, 0);
    expect(ev.surprised).toBe(0);
    expect(ev.sad).toBe(0);
  });

  it('max raised brow (1.0) → surprised=1', () => {
    const ev = computeExpressions({ ...baseRig, brow: 1.0 }, baseOpts, null, 0);
    expect(ev.surprised).toBe(1);
    expect(ev.sad).toBe(0);
  });

  it('max lowered brow (0.0) → sad=1', () => {
    const ev = computeExpressions({ ...baseRig, brow: 0.0 }, baseOpts, null, 0);
    expect(ev.surprised).toBe(0);
    expect(ev.sad).toBe(1);
  });

  it('defaults brow to 0.5 when undefined', () => {
    const rig = { ...baseRig };
    delete rig.brow;
    const ev = computeExpressions(rig, baseOpts, null, 0);
    expect(ev.surprised).toBe(0);
    expect(ev.sad).toBe(0);
  });
});

describe('computeExpressions — mouth / mic blending', () => {
  it('without mic: aa = mouth.A', () => {
    const ev = computeExpressions(
      { ...baseRig, mouth: { shape: { A: 0.7, I: 0, U: 0, E: 0, O: 0 } } },
      { ...baseOpts, mic: false, micLevel: 0.9 },
      null, 0,
    );
    expect(ev.aa).toBeCloseTo(0.7);
  });

  it('with mic: aa = max(mouth.A, micLevel)', () => {
    const ev = computeExpressions(
      { ...baseRig, mouth: { shape: { A: 0.3, I: 0, U: 0, E: 0, O: 0 } } },
      { ...baseOpts, mic: true, micLevel: 0.8 },
      null, 0,
    );
    expect(ev.aa).toBeCloseTo(0.8);
  });

  it('mic blend does not affect ih/ou/ee/oh', () => {
    const ev = computeExpressions(
      { ...baseRig, mouth: { shape: { A: 0, I: 0.5, U: 0.3, E: 0.2, O: 0.1 } } },
      { ...baseOpts, mic: true, micLevel: 0.9 },
      null, 0,
    );
    expect(ev.ih).toBeCloseTo(0.5);
    expect(ev.ou).toBeCloseTo(0.3);
    expect(ev.ee).toBeCloseTo(0.2);
    expect(ev.oh).toBeCloseTo(0.1);
  });
});

describe('computeExpressions — gaze', () => {
  it('gaze off → all look* = 0', () => {
    const ev = computeExpressions(
      { ...baseRig, pupil: { x: 0.5, y: 0.5 } },
      { ...baseOpts, gaze: false },
      null, 0,
    );
    expect(ev.lookLeft).toBe(0);
    expect(ev.lookRight).toBe(0);
    expect(ev.lookUp).toBe(0);
    expect(ev.lookDown).toBe(0);
  });

  it('pupil.x = +0.5 (right in rig coords) → after mirror flip → lookLeft=0.5', () => {
    const ev = computeExpressions(
      { ...baseRig, pupil: { x: 0.5, y: 0 } },
      baseOpts, null, 0,
    );
    // webcam 鏡像前提で px = -rig.pupil.x の反転があるため
    expect(ev.lookLeft).toBeCloseTo(0.5);
    expect(ev.lookRight).toBe(0);
  });

  it('pupil.x = -0.5 → lookRight = 0.5', () => {
    const ev = computeExpressions(
      { ...baseRig, pupil: { x: -0.5, y: 0 } },
      baseOpts, null, 0,
    );
    expect(ev.lookLeft).toBe(0);
    expect(ev.lookRight).toBeCloseTo(0.5);
  });

  it('pupil.y positive → lookUp', () => {
    const ev = computeExpressions(
      { ...baseRig, pupil: { x: 0, y: 0.4 } },
      baseOpts, null, 0,
    );
    expect(ev.lookUp).toBeCloseTo(0.4);
    expect(ev.lookDown).toBe(0);
  });

  it('pupil.y negative → lookDown', () => {
    const ev = computeExpressions(
      { ...baseRig, pupil: { x: 0, y: -0.4 } },
      baseOpts, null, 0,
    );
    expect(ev.lookUp).toBe(0);
    expect(ev.lookDown).toBeCloseTo(0.4);
  });

  it('look* values are clamped to [0, 1]', () => {
    const ev = computeExpressions(
      { ...baseRig, pupil: { x: 5.0, y: -5.0 } },
      baseOpts, null, 0,
    );
    expect(ev.lookLeft).toBe(1);
    expect(ev.lookDown).toBe(1);
    expect(ev.lookRight).toBe(0);
    expect(ev.lookUp).toBe(0);
  });
});
