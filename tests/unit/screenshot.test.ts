import { describe, it, expect, vi } from 'vitest';
import { captureCanvasPNG, downloadBlob } from '../../src/core/capture/screenshot';

const makeCanvas = (blob: Blob | null): HTMLCanvasElement => {
  return {
    toBlob: vi.fn((cb: (b: Blob | null) => void, type?: string) => {
      expect(type).toBe('image/png');
      queueMicrotask(() => cb(blob));
    }),
  } as unknown as HTMLCanvasElement;
};

describe('captureCanvasPNG', () => {
  it('resolves with the Blob that canvas.toBlob yields', async () => {
    const expected = new Blob(['pngdata'], { type: 'image/png' });
    const canvas = makeCanvas(expected);
    await expect(captureCanvasPNG(canvas)).resolves.toBe(expected);
  });

  it('rejects when canvas.toBlob produces null (encoding failed)', async () => {
    const canvas = makeCanvas(null);
    await expect(captureCanvasPNG(canvas)).rejects.toThrow(/canvas/i);
  });
});

describe('downloadBlob', () => {
  it('creates an <a download> element, clicks it, and revokes the object URL', () => {
    const blob = new Blob(['x'], { type: 'image/png' });
    const createURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeURL = vi.fn();
    const originalURL = globalThis.URL;
    // Preserve other URL statics
    (globalThis as { URL: unknown }).URL = Object.assign(
      function () {} as unknown as typeof URL,
      originalURL,
      { createObjectURL: createURL, revokeObjectURL: revokeURL },
    );

    const click = vi.fn();
    const anchor = { href: '', download: '', click, style: {} } as unknown as HTMLAnchorElement;
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    try {
      downloadBlob(blob, 'snapshot.png');
    } finally {
      createElement.mockRestore();
      (globalThis as { URL: unknown }).URL = originalURL;
    }

    expect(createURL).toHaveBeenCalledWith(blob);
    expect(anchor.href).toBe('blob:mock-url');
    expect(anchor.download).toBe('snapshot.png');
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
