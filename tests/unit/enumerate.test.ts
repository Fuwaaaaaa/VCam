import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listDevices } from '../../src/core/devices/enumerate';

const makeInfo = (kind: MediaDeviceKind, deviceId: string, label = ''): MediaDeviceInfo => ({
  deviceId,
  kind,
  label,
  groupId: 'g-' + deviceId,
  toJSON() { return this; },
});

describe('listDevices', () => {
  const origNav = globalThis.navigator;

  beforeEach(() => {
    const enumerate = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { mediaDevices: { enumerateDevices: enumerate } },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: origNav });
  });

  it('separates cameras and mics from the device list', async () => {
    (navigator.mediaDevices.enumerateDevices as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeInfo('videoinput', 'cam-1', 'Front Cam'),
      makeInfo('videoinput', 'cam-2', 'USB Cam'),
      makeInfo('audioinput', 'mic-1', 'Built-in Mic'),
      makeInfo('audiooutput', 'spk-1', 'Speakers'),
    ]);

    const { cameras, mics } = await listDevices();

    expect(cameras.map((c) => c.deviceId)).toEqual(['cam-1', 'cam-2']);
    expect(mics.map((m) => m.deviceId)).toEqual(['mic-1']);
  });

  it('supplies a fallback label when label is empty (permission not yet granted)', async () => {
    (navigator.mediaDevices.enumerateDevices as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeInfo('videoinput', 'cam-x', ''),
      makeInfo('audioinput', 'mic-y', ''),
    ]);

    const { cameras, mics } = await listDevices();

    expect(cameras[0].label).toMatch(/カメラ/);
    expect(mics[0].label).toMatch(/マイク/);
  });

  it('returns empty arrays when mediaDevices is unavailable', async () => {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
    const { cameras, mics } = await listDevices();
    expect(cameras).toEqual([]);
    expect(mics).toEqual([]);
  });

  it('returns empty arrays when enumerateDevices rejects', async () => {
    (navigator.mediaDevices.enumerateDevices as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('denied'),
    );
    const { cameras, mics } = await listDevices();
    expect(cameras).toEqual([]);
    expect(mics).toEqual([]);
  });
});
