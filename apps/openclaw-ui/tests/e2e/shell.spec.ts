import { expect, test } from '@playwright/test';

test.describe('phase15-shell', () => {
  test('boots the shell and exposes the canonical runner bridge', async ({
    page,
    request
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'OpenClaw Studio' }).first()
    ).toBeVisible();
    await expect(page.getByText('Canonical bridge')).toBeVisible();

    const response = await request.get('/api/runners');
    expect(response.ok()).toBeTruthy();

    const payload = await response.json();
    expect(payload.runners.map((runner: { runner_id: string }) => runner.runner_id)).toContain(
      'comfyui'
    );

    await page.getByRole('link', { name: 'Kimodo' }).first().click();
    await expect(page.getByRole('heading', { name: 'Kimodo' })).toBeVisible();

    const frame = page.frameLocator('iframe[title="Kimodo embedded workspace seam"]');
    await expect(frame.getByText('Kimodo embed seam')).toBeVisible();
  });
});
