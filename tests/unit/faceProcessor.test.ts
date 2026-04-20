import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFaceProcessor } from '../../src/core/tracking/faceProcessor';

type FaceMeshOnResultsCb = (r: { multiFaceLandmarks?: unknown[] }) => void;

describe('createFaceProcessor — isActive / waitForActive (T-003)', () => {
  let onResultsCb: FaceMeshOnResultsCb | null = null;

  beforeEach(() => {
    onResultsCb = null;
    (window as unknown as { FaceMesh: unknown }).FaceMesh = class {
      setOptions(): void {}
      onResults(cb: FaceMeshOnResultsCb): void { onResultsCb = cb; }
      send(): Promise<void> { return Promise.resolve(); }
      close(): void {}
    };
  });

  afterEach(() => {
    delete (window as unknown as { FaceMesh?: unknown }).FaceMesh;
  });

  it('isActive() は onResults が呼ばれるまで false', () => {
    const fp = createFaceProcessor({ onRig: () => {} });
    expect(fp.isActive()).toBe(false);
  });

  it('isActive() は onResults が一度でも呼ばれた後は true (landmarks 空でも)', () => {
    const fp = createFaceProcessor({ onRig: () => {} });
    onResultsCb!({ multiFaceLandmarks: undefined }); // 顔なしフレーム
    expect(fp.isActive()).toBe(true);
  });

  it('waitForActive() は onResults 未発火のまま timeout したら false を返す', async () => {
    const fp = createFaceProcessor({ onRig: () => {} });
    const start = performance.now();
    const ok = await fp.waitForActive(150);
    expect(ok).toBe(false);
    expect(performance.now() - start).toBeGreaterThanOrEqual(140);
  });

  it('waitForActive() は onResults 発火後すぐ true を返す', async () => {
    const fp = createFaceProcessor({ onRig: () => {} });
    setTimeout(() => onResultsCb!({ multiFaceLandmarks: undefined }), 50);
    const ok = await fp.waitForActive(2000);
    expect(ok).toBe(true);
  });
});
