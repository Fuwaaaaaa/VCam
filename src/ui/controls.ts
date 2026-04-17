import type { AppOptions } from '../types';

export type ControlsHandlers = {
  onMicToggle: (next: boolean) => Promise<boolean>;   // return: 成功したら true
  onGazeToggle: (next: boolean) => void;
  onSmoothToggle: (next: boolean) => void;
};

export type ControlsElements = {
  micBtn: HTMLButtonElement;
  micMeter: HTMLElement;
  gazeBtn: HTMLButtonElement;
  smoothBtn: HTMLButtonElement;
};

export function wireControls(els: ControlsElements, opts: AppOptions, handlers: ControlsHandlers): {
  setMicLevel: (lv: number) => void;
} {
  const syncMic = () => {
    els.micBtn.textContent = opts.mic ? '🎙 マイク ON' : '🎙 マイク OFF';
    els.micBtn.classList.toggle('active', opts.mic);
  };
  const syncGaze = () => {
    els.gazeBtn.textContent = opts.gaze ? '👀 目線 ON' : '👀 目線 OFF';
    els.gazeBtn.classList.toggle('active', opts.gaze);
  };
  const syncSmooth = () => {
    els.smoothBtn.textContent = opts.smooth ? '〰 スムージング ON' : '〰 スムージング OFF';
    els.smoothBtn.classList.toggle('active', opts.smooth);
  };

  syncMic(); syncGaze(); syncSmooth();

  els.micBtn.addEventListener('click', async () => {
    const ok = await handlers.onMicToggle(!opts.mic);
    if (ok) { opts.mic = !opts.mic; syncMic(); }
    if (!opts.mic) els.micMeter.style.width = '0%';
  });
  els.gazeBtn.addEventListener('click', () => {
    opts.gaze = !opts.gaze;
    handlers.onGazeToggle(opts.gaze);
    syncGaze();
  });
  els.smoothBtn.addEventListener('click', () => {
    opts.smooth = !opts.smooth;
    handlers.onSmoothToggle(opts.smooth);
    syncSmooth();
  });

  return {
    setMicLevel: (lv) => {
      els.micMeter.style.width = `${Math.round(lv * 100)}%`;
    },
  };
}
