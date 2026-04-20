/**
 * three.js canvas を webm に録画する薄い MediaRecorder ラッパ。
 * start() → stop(): Promise<Blob> の 2 操作だけ。
 *
 * Chromium 系では webm/vp9 推奨。ブラウザ対応がない場合 MediaRecorder が
 * 存在しない・isTypeSupported が false のどちらかになるので、フォールバック
 * を段階的に試す。
 */

const PREFERRED_MIMES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export type Recorder = {
  start: () => void;
  stop: () => Promise<Blob>;
  isRecording: () => boolean;
};

export function isRecordingSupported(): boolean {
  const g = globalThis as { MediaRecorder?: unknown };
  return typeof g.MediaRecorder === 'function' || typeof g.MediaRecorder === 'object';
}

function pickMime(MR: typeof MediaRecorder): string | undefined {
  if (typeof MR.isTypeSupported !== 'function') return undefined;
  return PREFERRED_MIMES.find((m) => MR.isTypeSupported(m));
}

export function createRecorder(canvas: HTMLCanvasElement, fps = 30): Recorder {
  const MR = (globalThis as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;
  if (!MR) throw new Error('MediaRecorder API unavailable in this environment');

  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let pendingStop: { resolve: (b: Blob) => void; reject: (e: unknown) => void } | null = null;

  const start = (): void => {
    if (mediaRecorder && mediaRecorder.state === 'recording') return;
    const stream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream })
      .captureStream(fps);
    const mimeType = pickMime(MR);
    mediaRecorder = new MR(stream, mimeType ? { mimeType } : undefined);
    chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const type = mediaRecorder?.mimeType || 'video/webm';
      const blob = new Blob(chunks, { type: type.split(';')[0] });
      pendingStop?.resolve(blob);
      pendingStop = null;
      mediaRecorder = null;
    };
    mediaRecorder.start();
  };

  const stop = (): Promise<Blob> => {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') {
      return Promise.reject(new Error('recorder not recording'));
    }
    return new Promise<Blob>((resolve, reject) => {
      pendingStop = { resolve, reject };
      mediaRecorder!.stop();
    });
  };

  const isRecording = (): boolean => mediaRecorder?.state === 'recording';

  return { start, stop, isRecording };
}
