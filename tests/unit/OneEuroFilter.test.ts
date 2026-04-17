import { describe, it, expect } from 'vitest';
import { OneEuroFilter } from '../../src/core/filters/OneEuroFilter';

describe('OneEuroFilter', () => {
  it('returns the first sample unchanged', () => {
    const f = new OneEuroFilter();
    expect(f.filter(0.5, 0)).toBe(0.5);
  });

  it('smooths repeated identical values to the same value', () => {
    const f = new OneEuroFilter(1, 0.1);
    f.filter(1.0, 0);
    const y = f.filter(1.0, 1 / 60);
    expect(y).toBeCloseTo(1.0, 6);
  });

  it('lags behind a step function (low-pass behavior)', () => {
    const f = new OneEuroFilter(1, 0.0); // no adaptive term
    f.filter(0, 0);
    const y1 = f.filter(1, 1 / 60);
    // Should be strictly between 0 (previous) and 1 (input) due to low-pass
    expect(y1).toBeGreaterThan(0);
    expect(y1).toBeLessThan(1);
  });

  it('higher beta gives faster response to fast changes', () => {
    const lowBeta  = new OneEuroFilter(1, 0.001);
    const highBeta = new OneEuroFilter(1, 0.5);
    lowBeta.filter(0, 0);
    highBeta.filter(0, 0);
    const yLow  = lowBeta.filter(1, 1 / 60);
    const yHigh = highBeta.filter(1, 1 / 60);
    expect(yHigh).toBeGreaterThan(yLow);
  });

  it('reset() clears state so next filter() returns raw input', () => {
    const f = new OneEuroFilter(1, 0.1);
    f.filter(0, 0);
    f.filter(1, 1 / 60);
    f.reset();
    expect(f.filter(0.42, 0)).toBe(0.42);
  });

  it('handles zero / negative dt gracefully (no crash)', () => {
    const f = new OneEuroFilter();
    f.filter(0, 1);
    // Same timestamp or going backwards — should not NaN
    const y = f.filter(1, 1);
    expect(Number.isFinite(y)).toBe(true);
  });

  it('alpha is in (0, 1) for positive cutoff and dt', () => {
    const a = OneEuroFilter.alpha(5, 1 / 60);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
  });
});
