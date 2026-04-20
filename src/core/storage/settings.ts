import type { Settings } from '../../types';

const STORAGE_KEY = 'vcam:settings:v1';

export const DEFAULT_SETTINGS: Settings = {
  toggles: { mic: false, gaze: true, smooth: true, pose: true },
  legStrength: 1.0,
  hipPosStrength: 0.3,
  micSensitivity: 5,
  transparentBg: false,
  bloom: false,
  bloomStrength: 0.8,
  cameraDeviceId: null,
  micDeviceId: null,
};

/**
 * localStorage から Settings を読み込む。欠損フィールドは既定値で補完。
 * - 読めない/壊れている場合は DEFAULT_SETTINGS を返し、警告ログを出す
 * - バリデーション範囲外は clamp
 */
export function loadSettings(storage: Storage = localStorage): Settings {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, toggles: { ...DEFAULT_SETTINGS.toggles } };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return normalize(parsed);
  } catch (e) {
    console.warn('[settings] 読込失敗、既定値を使用:', e);
    return { ...DEFAULT_SETTINGS, toggles: { ...DEFAULT_SETTINGS.toggles } };
  }
}

export function saveSettings(s: Settings, storage: Storage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (e) {
    console.warn('[settings] 保存失敗:', e);
  }
}

export function clearSettings(storage: Storage = localStorage): void {
  try { storage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

const clamp = (v: number, min: number, max: number): number => {
  if (Number.isNaN(v)) return min;
  // ±Infinity は Math.max/min で自然に端に寄る
  return Math.min(max, Math.max(min, v));
};

/** 不完全な parsed 値から健全な Settings を生成 (pure、テスト容易) */
export function normalize(parsed: Partial<Settings>): Settings {
  const t = (parsed.toggles ?? {}) as Record<string, unknown>;
  return {
    toggles: {
      mic:    typeof t.mic    === 'boolean' ? t.mic    : DEFAULT_SETTINGS.toggles.mic,
      gaze:   typeof t.gaze   === 'boolean' ? t.gaze   : DEFAULT_SETTINGS.toggles.gaze,
      smooth: typeof t.smooth === 'boolean' ? t.smooth : DEFAULT_SETTINGS.toggles.smooth,
      pose:   typeof t.pose   === 'boolean' ? t.pose   : DEFAULT_SETTINGS.toggles.pose,
    },
    legStrength:    clamp(parsed.legStrength    ?? DEFAULT_SETTINGS.legStrength,    0, 1),
    hipPosStrength: clamp(parsed.hipPosStrength ?? DEFAULT_SETTINGS.hipPosStrength, 0, 1),
    micSensitivity: clamp(parsed.micSensitivity ?? DEFAULT_SETTINGS.micSensitivity, 1, 15),
    transparentBg:  typeof parsed.transparentBg === 'boolean' ? parsed.transparentBg : false,
    bloom:          typeof parsed.bloom === 'boolean' ? parsed.bloom : (DEFAULT_SETTINGS.bloom ?? false),
    bloomStrength:  clamp(parsed.bloomStrength ?? (DEFAULT_SETTINGS.bloomStrength ?? 0.8), 0, 3),
    cameraDeviceId: typeof parsed.cameraDeviceId === 'string' ? parsed.cameraDeviceId : null,
    micDeviceId:    typeof parsed.micDeviceId    === 'string' ? parsed.micDeviceId    : null,
  };
}
