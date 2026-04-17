import { clamp01 } from '../math/clamp';

/**
 * Uint8Array (AnalyserNode.getByteTimeDomainData) を受け取り、
 * RMS を [0..1] にマップした音量値を返す pure 関数。
 *
 * sensitivity は 1.0 が等倍。大きいほど微小音でもメーター振れる。
 */
export function computeMicLevel(buffer: Uint8Array, sensitivity = 5): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const v = (buffer[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / buffer.length);
  return clamp01(rms * sensitivity);
}

/** マイク音量トラッキングのステートフルな wrapper */
export class MicTracker {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Uint8Array<ArrayBuffer> | null = null;
  private _level = 0;

  get level(): number { return this._level; }
  get enabled(): boolean { return this.analyser !== null; }

  async enable(): Promise<void> {
    if (this.enabled) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
    });
    // T-003 critical gap: AudioContext が suspended 状態で来るブラウザがある
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch { /* ignore — user will see silent mic */ }
    }
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.35;
    source.connect(this.analyser);
    this.buffer = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
  }

  disable(): void {
    if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
    if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null; }
    this.analyser = null;
    this.buffer = null;
    this._level = 0;
  }

  /** アニメーションループから毎フレーム呼ぶ */
  update(sensitivity = 5): number {
    if (!this.analyser || !this.buffer) { this._level = 0; return 0; }
    this.analyser.getByteTimeDomainData(this.buffer);
    this._level = computeMicLevel(this.buffer, sensitivity);
    return this._level;
  }
}
