import { test, expect } from '@playwright/test';

test.describe('T-008 capture (screenshot + recording)', () => {
  test('📸 snap-btn triggers a download with defaultFilename shape', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
    await page.locator('#snap-btn').click();
    const dl = await downloadPromise;

    expect(dl.suggestedFilename()).toMatch(/^vcam-\d{8}-\d{6}\.png$/);
  });

  test('⏺ rec-btn toggles label + recording class', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });

    const btn = page.locator('#rec-btn');
    // MediaRecorder 対応環境では disabled にならない
    const isDisabled = await btn.isDisabled();
    test.skip(isDisabled, 'MediaRecorder unsupported in this browser');

    await expect(btn).toContainText('録画開始');
    await expect(btn).not.toHaveClass(/recording/);
    await btn.click();
    await expect(btn).toHaveClass(/recording/);
    await expect(btn).toContainText('録画停止');

    // 停止して webm DL を検証
    const dlPromise = page.waitForEvent('download', { timeout: 10_000 });
    await page.waitForTimeout(400); // 短尺だが chunk を稼ぐ
    await btn.click();
    const dl = await dlPromise;
    expect(dl.suggestedFilename()).toMatch(/^vcam-\d{8}-\d{6}\.webm$/);
    await expect(btn).not.toHaveClass(/recording/);
    await expect(btn).toContainText('録画開始');
  });
});
