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

  // T-004 仮説検証の regression test (2026-04-20)
  // 仮説 (TODOS T-004): 同値 × 異 t での連続 filter() が derivative を 0 退化させ、
  //                     直後の急変への追従が鈍る → seq ガードが必要。
  // 検証結果: 仮説 FALSIFIED。OneEuroFilter は xPrev/dxPrev/tPrev のみ状態保持し、
  //           同値連続では dxPrev=0 が維持される (init 直後と同等)。次の遷移で
  //           dx = (newX - xPrev)/dt が独立に再推定されるため追従は劣化しない。
  it('同値の連続呼出で warm up しても、直後の遷移は init 直後と同じ追従を示す (T-004 regression)', () => {
    const warmedUp = new OneEuroFilter(1.0, 0.007, 1.0);
    warmedUp.filter(0.5, 0);
    warmedUp.filter(0.5, 1 / 60);
    warmedUp.filter(0.5, 2 / 60);
    warmedUp.filter(0.5, 3 / 60);
    warmedUp.filter(0.5, 4 / 60);
    const yWarmed = warmedUp.filter(1.0, 5 / 60);

    const fresh = new OneEuroFilter(1.0, 0.007, 1.0);
    fresh.filter(0.5, 0);
    const yFresh = fresh.filter(1.0, 1 / 60);

    expect(yWarmed).toBeCloseTo(yFresh, 10);
  });
});
