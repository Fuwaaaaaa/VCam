import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, clearSettings, normalize, DEFAULT_SETTINGS } from '../../src/core/storage/settings';
import type { Settings } from '../../src/types';

/**
 * happy-dom は localStorage を提供するが、テスト間で共有される。
 * 各テストで clear してから開始する。
 */
beforeEach(() => {
  localStorage.clear();
});

describe('loadSettings', () => {
  it('returns defaults when nothing saved', () => {
    const s = loadSettings();
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it('returns defaults when JSON is corrupt', () => {
    localStorage.setItem('vcam:settings:v1', '{{{not json');
    const s = loadSettings();
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips a saved settings object', () => {
    const custom: Settings = {
      toggles: { mic: true, gaze: false, smooth: true, pose: false },
      legStrength: 0.4,
      hipPosStrength: 0.1,
      micSensitivity: 8,
      transparentBg: true,
      bloom: true,
      bloomStrength: 1.5,
      cameraDeviceId: 'cam-42',
      micDeviceId: 'mic-99',
    };
    saveSettings(custom);
    expect(loadSettings()).toEqual(custom);
  });

  it('normalizes partial saved data by filling defaults', () => {
    localStorage.setItem('vcam:settings:v1', JSON.stringify({ legStrength: 0.5 }));
    const s = loadSettings();
    expect(s.legStrength).toBe(0.5);
    expect(s.toggles).toEqual(DEFAULT_SETTINGS.toggles);
    expect(s.hipPosStrength).toBe(DEFAULT_SETTINGS.hipPosStrength);
  });
});

describe('normalize', () => {
  it('clamps out-of-range values', () => {
    const s = normalize({
      legStrength: 99,
      hipPosStrength: -5,
      micSensitivity: 1000,
    });
    expect(s.legStrength).toBe(1);
    expect(s.hipPosStrength).toBe(0);
    expect(s.micSensitivity).toBe(15);
  });

  it('rejects NaN/Infinity by using defaults', () => {
    const s = normalize({
      legStrength: NaN,
      hipPosStrength: Infinity,
    });
    expect(s.legStrength).toBe(0);
    expect(s.hipPosStrength).toBe(1);
  });

  it('preserves string deviceIds and drops non-string junk', () => {
    const s1 = normalize({ cameraDeviceId: 'abc', micDeviceId: 'def' });
    expect(s1.cameraDeviceId).toBe('abc');
    expect(s1.micDeviceId).toBe('def');

    const s2 = normalize({ cameraDeviceId: 123 as unknown as string, micDeviceId: null });
    expect(s2.cameraDeviceId).toBeNull();
    expect(s2.micDeviceId).toBeNull();
  });

  it('coerces non-boolean toggles to defaults', () => {
    const s = normalize({
      toggles: {
        mic: 'yes' as unknown as boolean,
        gaze: true,
        smooth: 1 as unknown as boolean,
        pose: true,
      },
    });
    expect(s.toggles.mic).toBe(DEFAULT_SETTINGS.toggles.mic);
    expect(s.toggles.smooth).toBe(DEFAULT_SETTINGS.toggles.smooth);
    expect(s.toggles.gaze).toBe(true);
    expect(s.toggles.pose).toBe(true);
  });
});

describe('clearSettings', () => {
  it('removes saved settings', () => {
    saveSettings({ ...DEFAULT_SETTINGS, legStrength: 0.2 });
    clearSettings();
    expect(localStorage.getItem('vcam:settings:v1')).toBeNull();
  });
});
