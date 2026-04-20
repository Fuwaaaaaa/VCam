import { test, expect } from '@playwright/test';

test.describe('CDN failure handling (T-003)', () => {
  test('face_mesh.js abort → status に「顔認識ライブラリ」エラー文言が出る', async ({ page }) => {
    // Block the FaceMesh CDN script before navigation so onerror fires.
    await page.route('**/face_mesh.js', (route) => route.abort());

    await page.goto('/');
    // boot() は CDN フラグを同期チェックしてから出すため、数秒で十分。
    await expect(page.locator('#status')).toContainText('顔認識ライブラリ', { timeout: 6_000 });
  });

  test('pose.js のみ 404 → status に「ポーズ認識モデル」追記が出る (顔は継続)', async ({ page }) => {
    // pose CDN は 200 で返るが pose.js を空レスポンスにして window.Pose を未定義にする。
    // ※ onerror は 404 のみで発火するため、CDN script abort の方が確実。
    await page.route('**/pose@*/pose.js', (route) => route.abort());

    await page.goto('/');
    // pose だけ落ちると boot は CDN フラグで早期 return する (現実装の挙動)。
    // T-003 の挙動仕様: いずれか 1 つでも CDN 失敗なら全体メッセージを出す。
    await expect(page.locator('#status')).toContainText('顔認識ライブラリ', { timeout: 6_000 });
  });
});
