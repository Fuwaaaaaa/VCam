import { describe, it, expect } from 'vitest';
import { nextFreeSlot, slotToX } from '../../src/core/avatar/remoteAvatar';

describe('nextFreeSlot', () => {
  it('returns 1 when no slots are used', () => {
    expect(nextFreeSlot([])).toBe(1);
  });

  it('returns the smallest gap left by a disconnected peer', () => {
    // ピア 1,2,3 のうち 2 が切断 → 次の接続は 2 を再利用する
    expect(nextFreeSlot([1, 3])).toBe(2);
  });

  it('appends after the last slot when there is no gap', () => {
    expect(nextFreeSlot([1, 2, 3])).toBe(4);
  });

  it('ignores duplicates and ordering', () => {
    expect(nextFreeSlot([3, 1, 1])).toBe(2);
  });
});

describe('slotToX', () => {
  it('alternates right/left in 1.5m steps', () => {
    expect(slotToX(1)).toBe(1.5);
    expect(slotToX(2)).toBe(-1.5);
    expect(slotToX(3)).toBe(3.0);
    expect(slotToX(4)).toBe(-3.0);
  });

  it('re-used slot yields a position distinct from remaining peers', () => {
    // 重なり回帰テスト: [1,2,3] から 1 が切断 → 新規は slot 1 (x=+1.5)。
    // 残存 2 (x=-1.5), 3 (x=+3.0) といずれも重ならない。
    const remaining = [2, 3];
    const slot = nextFreeSlot(remaining);
    const xs = remaining.map(slotToX);
    expect(xs).not.toContain(slotToX(slot));
  });
});
