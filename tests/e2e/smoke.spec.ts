import { test, expect } from '@playwright/test';

test.describe('VCam smoke', () => {
  test('page loads with expected UI elements', async ({ page }) => {
    await page.goto('/');
    // Canvas should exist (three.js WebGL renderer)
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
    // Status panel shows initial message
    await expect(page.locator('#status')).toBeVisible();
    // Controls panel with 3 buttons
    await expect(page.locator('#mic-btn')).toBeVisible();
    await expect(page.locator('#gaze-btn')).toBeVisible();
    await expect(page.locator('#smooth-btn')).toBeVisible();
    // Drop zone for VRM
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('gaze toggle flips label and active class', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('#gaze-btn');
    await expect(btn).toHaveClass(/active/);
    await expect(btn).toContainText('目線 ON');
    await btn.click();
    await expect(btn).not.toHaveClass(/active/);
    await expect(btn).toContainText('目線 OFF');
  });

  test('smoothing toggle flips label and active class', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('#smooth-btn');
    await expect(btn).toContainText('スムージング ON');
    await btn.click();
    await expect(btn).toContainText('スムージング OFF');
  });

  test('no uncaught browser errors on fresh load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
    });
    await page.goto('/');
    await page.waitForTimeout(2_500);
    // Exclude only network errors from the remote MediaPipe CDN (tflite download).
    const appErrors = errors.filter(
      (m) => !/tflite|\.wasm|binarypb|Failed to fetch.*jsdelivr|ERR_INTERNET_DISCONNECTED/i.test(m),
    );
    if (appErrors.length > 0) console.log('E2E captured errors:', appErrors);
    expect(appErrors).toEqual([]);
  });
});
