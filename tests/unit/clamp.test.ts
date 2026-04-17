import { describe, it, expect } from 'vitest';
import { clamp01, lerp, clamp } from '../../src/core/math/clamp';

describe('clamp01', () => {
  it('returns 0 for values below 0', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(-Infinity)).toBe(0);
  });

  it('returns 1 for values above 1', () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(Infinity)).toBe(1);
  });

  it('passes through values in [0, 1]', () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
  });

  it('handles NaN by returning NaN (no silent coercion)', () => {
    // NaN comparisons are always false so NaN passes through — document behavior
    expect(Number.isNaN(clamp01(NaN))).toBe(true);
  });
});

describe('lerp', () => {
  it('returns a at t=0, b at t=1, midpoint at 0.5', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it('extrapolates for t outside [0, 1]', () => {
    expect(lerp(0, 10, 2)).toBe(20);
    expect(lerp(0, 10, -1)).toBe(-10);
  });

  it('works with negative ranges', () => {
    expect(lerp(-5, 5, 0.5)).toBe(0);
  });
});

describe('clamp', () => {
  it('clamps to [min, max]', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
