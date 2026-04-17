import type { Settings } from '../types';

export type SettingsElements = {
  root: HTMLElement;
  legStrengthInput: HTMLInputElement;
  legStrengthValue: HTMLElement;
  hipPosStrengthInput: HTMLInputElement;
  hipPosStrengthValue: HTMLElement;
  micSensitivityInput: HTMLInputElement;
  micSensitivityValue: HTMLElement;
  transparentBgInput: HTMLInputElement;
  resetBtn: HTMLButtonElement;
};

export type SettingsHandlers = {
  onLegStrength: (v: number) => void;
  onHipPosStrength: (v: number) => void;
  onMicSensitivity: (v: number) => void;
  onTransparentBg: (v: boolean) => void;
  onReset: () => void;
};

export function wireSettingsPanel(
  els: SettingsElements,
  initial: Settings,
  handlers: SettingsHandlers,
): { refresh: (s: Settings) => void } {
  const fmt = (n: number, digits = 2) => n.toFixed(digits);

  const refresh = (s: Settings) => {
    els.legStrengthInput.value    = String(s.legStrength);
    els.legStrengthValue.textContent    = fmt(s.legStrength);
    els.hipPosStrengthInput.value = String(s.hipPosStrength);
    els.hipPosStrengthValue.textContent = fmt(s.hipPosStrength);
    els.micSensitivityInput.value = String(s.micSensitivity);
    els.micSensitivityValue.textContent = fmt(s.micSensitivity, 1);
    els.transparentBgInput.checked = s.transparentBg ?? false;
  };
  refresh(initial);

  els.legStrengthInput.addEventListener('input', () => {
    const v = parseFloat(els.legStrengthInput.value);
    els.legStrengthValue.textContent = fmt(v);
    handlers.onLegStrength(v);
  });
  els.hipPosStrengthInput.addEventListener('input', () => {
    const v = parseFloat(els.hipPosStrengthInput.value);
    els.hipPosStrengthValue.textContent = fmt(v);
    handlers.onHipPosStrength(v);
  });
  els.micSensitivityInput.addEventListener('input', () => {
    const v = parseFloat(els.micSensitivityInput.value);
    els.micSensitivityValue.textContent = fmt(v, 1);
    handlers.onMicSensitivity(v);
  });
  els.transparentBgInput.addEventListener('change', () => {
    handlers.onTransparentBg(els.transparentBgInput.checked);
  });
  els.resetBtn.addEventListener('click', () => handlers.onReset());

  return { refresh };
}
