import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRecorder, isRecordingSupported } from '../../src/core/capture/recorder';

type FakeRecorder = {
  state: 'inactive' | 'recording' | 'stopped';
  ondataavailable: ((e: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

describe('createRecorder', () => {
  const origMR = (globalThis as { MediaRecorder?: unknown }).MediaRecorder;
  let lastInstance: FakeRecorder | null = null;

  beforeEach(() => {
    lastInstance = null;
    class FakeMediaRecorder implements FakeRecorder {
      state: 'inactive' | 'recording' | 'stopped' = 'inactive';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start = vi.fn(() => { this.state = 'recording'; });
      stop = vi.fn(() => {
        this.state = 'stopped';
        this.ondataavailable?.({ data: new Blob(['chunk1'], { type: 'video/webm' }) });
        this.ondataavailable?.({ data: new Blob(['chunk2'], { type: 'video/webm' }) });
        this.onstop?.();
      });
      constructor(_s: MediaStream, _opts?: unknown) {
        lastInstance = this;
      }
      static isTypeSupported(_t: string): boolean { return true; }
    }
    (globalThis as { MediaRecorder?: unknown }).MediaRecorder = FakeMediaRecorder;
  });

  afterEach(() => {
    (globalThis as { MediaRecorder?: unknown }).MediaRecorder = origMR;
  });

  const fakeCanvas = (): HTMLCanvasElement => ({
    captureStream: vi.fn().mockReturnValue({ getTracks: () => [] } as unknown as MediaStream),
  } as unknown as HTMLCanvasElement);

  it('start() → stop() resolves with a single concatenated Blob', async () => {
    const rec = createRecorder(fakeCanvas());
    expect(rec.isRecording()).toBe(false);
    rec.start();
    expect(rec.isRecording()).toBe(true);
    const blob = await rec.stop();
    expect(blob.type).toBe('video/webm');
    expect(blob.size).toBeGreaterThan(0);
    expect(rec.isRecording()).toBe(false);
  });

  it('stop() without start() rejects', async () => {
    const rec = createRecorder(fakeCanvas());
    await expect(rec.stop()).rejects.toThrow(/not recording/i);
  });

  it('double start() is a no-op (stays recording, does not leak a recorder)', () => {
    const rec = createRecorder(fakeCanvas());
    rec.start();
    const first = lastInstance;
    rec.start();
    expect(lastInstance).toBe(first);
  });

  it('throws if MediaRecorder is unavailable', () => {
    (globalThis as { MediaRecorder?: unknown }).MediaRecorder = undefined;
    expect(() => createRecorder(fakeCanvas())).toThrow(/MediaRecorder/);
  });
});

describe('isRecordingSupported', () => {
  const origMR = (globalThis as { MediaRecorder?: unknown }).MediaRecorder;
  afterEach(() => { (globalThis as { MediaRecorder?: unknown }).MediaRecorder = origMR; });

  it('true when MediaRecorder + canvas.captureStream exist', () => {
    (globalThis as { MediaRecorder?: unknown }).MediaRecorder = class {};
    expect(isRecordingSupported()).toBe(true);
  });

  it('false when MediaRecorder missing', () => {
    (globalThis as { MediaRecorder?: unknown }).MediaRecorder = undefined;
    expect(isRecordingSupported()).toBe(false);
  });
});
