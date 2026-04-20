import { test, expect } from '@playwright/test';

test.describe('T-007 device selection', () => {
  test('camera + mic <select> render under ⚙ 設定 and expose the default option', async ({ page }) => {
    await page.goto('/');

    await page.locator('#settings summary').click();

    const cameraSelect = page.locator('#cameraSelect');
    const micSelect    = page.locator('#micSelect');

    await expect(cameraSelect).toBeVisible();
    await expect(micSelect).toBeVisible();

    const cameraOptionCount = await cameraSelect.locator('option').count();
    const micOptionCount    = await micSelect.locator('option').count();

    expect(cameraOptionCount).toBeGreaterThanOrEqual(1);
    expect(micOptionCount).toBeGreaterThanOrEqual(1);

    await expect(cameraSelect.locator('option').first()).toHaveText('（既定）');
    await expect(micSelect.locator('option').first()).toHaveText('（既定）');
  });
});
