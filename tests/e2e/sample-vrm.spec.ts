import { test, expect } from '@playwright/test';

// T-001 PR C 着手後 (実 VRM が public/samples/sample.vrm に配置されたら)
// この test.skip を test に変えて有効化する。
test.describe('Sample VRM auto-load (T-001)', () => {
  test.skip('boot fetches /samples/sample.vrm 200 and shows 「VRM 読込完了」 in status', async ({ page }) => {
    let sampleStatus: number | null = null;
    page.on('response', (resp) => {
      if (resp.url().endsWith('/samples/sample.vrm')) sampleStatus = resp.status();
    });

    await page.goto('/');
    await expect(page.locator('#status')).toContainText('VRM 読込完了', { timeout: 10_000 });
    expect(sampleStatus).toBe(200);
  });

  test.skip('sample VRM 欠落時はドロップ案内を表示する (regression for the no-bundle path)', async ({ page }) => {
    // public/samples/sample.vrm を 404 にして既存のフォールバックパスが死んでいないことを確認
    await page.route('**/samples/sample.vrm', (route) => route.fulfill({ status: 404, body: '' }));

    await page.goto('/');
    await expect(page.locator('#status')).toContainText('ドラッグ', { timeout: 6_000 });
  });
});
