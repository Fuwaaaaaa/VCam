/**
 * canvas → PNG Blob。three.js の WebGL canvas は preserveDrawingBuffer 不要
 * (toBlob がフレーム複製する際にブラウザ側が readPixels する)。
 */
export function captureCanvasPNG(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned null'));
    }, 'image/png');
  });
}

/**
 * 動的 <a download> を経由した Blob ダウンロード。Object URL を即座に revoke。
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // click 直後に revoke しても現行ブラウザは DL 完了まで保持する
  URL.revokeObjectURL(url);
}

/** `vcam-YYYYMMDD-HHMMSS.png` 形式 */
export function defaultFilename(ext: 'png' | 'webm', now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const H = pad(now.getHours());
  const M = pad(now.getMinutes());
  const S = pad(now.getSeconds());
  return `vcam-${y}${m}${d}-${H}${M}${S}.${ext}`;
}
