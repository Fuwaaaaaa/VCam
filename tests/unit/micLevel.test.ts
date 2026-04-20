import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeMicLevel, MicTracker } from '../../src/core/audio/micLevel';

describe('computeMicLevel', () => {
  it('silence (all 128) → 0', () => {
    const buf = new Uint8Array(1024).fill(128);
    expect(computeMicLevel(buf)).toBe(0);
  });

  it('max amplitude square wave (0 and 255) → 1 (clamped)', () => {
    const buf = new Uint8Array(1024);
    for (let i = 0; i < buf.length; i++) buf[i] = i % 2 === 0 ? 0 : 255;
    // RMS of this signal is ~1.0 before sensitivity, saturates to 1 after *5
    expect(computeMicLevel(buf, 5)).toBe(1);
  });

  it('higher sensitivity maps small RMS to larger level', () => {
    const buf = new Uint8Array(1024);
    for (let i = 0; i < buf.length; i++) buf[i] = 128 + (i % 2 === 0 ? 10 : -10);
    const low  = computeMicLevel(buf, 1);
    const high = computeMicLevel(buf, 10);
    expect(high).toBeGreaterThan(low);
  });

  it('output is clamped to [0, 1]', () => {
    const buf = new Uint8Array(1024);
    for (let i = 0; i < buf.length; i++) buf[i] = i % 2 === 0 ? 0 : 255;
    expect(computeMicLevel(buf, 100)).toBe(1);
    expect(computeMicLevel(new Uint8Array(1024).fill(128), 100)).toBe(0);
  });

  it('deviation from 128 scales linearly in RMS', () => {
    // Make buffer constant-offset from 128 so RMS = offset/128
    const offset = 32;
    const buf = new Uint8Array(1024).fill(128 + offset);
    const rmsNoSensitivity = computeMicLevel(buf, 1);
    expect(rmsNoSensitivity).toBeCloseTo(offset / 128, 3);
  });
});

describe('MicTracker.enable deviceId', () => {
  const origNav = globalThis.navigator;
  const origAC = (globalThis as { AudioContext?: unknown }).AudioContext;
  let getUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const fakeStream = { getTracks: () => [] } as unknown as MediaStream;
    getUserMedia = vi.fn().mockResolvedValue(fakeStream);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { mediaDevices: { getUserMedia } },
    });
    class FakeCtx {
      state = 'running';
      createMediaStreamSource() { return { connect: () => {} }; }
      createAnalyser() {
        return { fftSize: 1024, smoothingTimeConstant: 0, connect: () => {}, getByteTimeDomainData: () => {} };
      }
      async resume() { /* noop */ }
      async close() { /* noop */ }
    }
    (globalThis as { AudioContext?: unknown }).AudioContext = FakeCtx;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: origNav });
    (globalThis as { AudioContext?: unknown }).AudioContext = origAC;
  });

  it('passes deviceId as exact constraint when provided', async () => {
    const t = new MicTracker();
    await t.enable({ deviceId: 'mic-xyz' });
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: expect.objectContaining({ deviceId: { exact: 'mic-xyz' } }),
      }),
    );
  });

  it('omits deviceId constraint when not provided', async () => {
    const t = new MicTracker();
    await t.enable();
    const args = getUserMedia.mock.calls[0][0] as { audio: MediaTrackConstraints };
    expect(args.audio.deviceId).toBeUndefined();
  });

  it('omits deviceId constraint when null', async () => {
    const t = new MicTracker();
    await t.enable({ deviceId: null });
    const args = getUserMedia.mock.calls[0][0] as { audio: MediaTrackConstraints };
    expect(args.audio.deviceId).toBeUndefined();
  });
});
