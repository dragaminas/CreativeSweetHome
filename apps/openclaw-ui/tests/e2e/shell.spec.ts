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

    await expect(page.getByTestId('runner-contract-path')).toBeVisible();
    await expect(page.getByTestId('runner-contract-path')).toContainText(
      'runner-interface.md'
    );

    await page.getByRole('link', { name: 'ComfyUI engine' }).first().click();
    await expect(page.getByRole('heading', { name: 'ComfyUI', exact: true })).toBeVisible();
    await expect(page.getByText('runner_id').first()).toBeVisible();
    await expect(page.getByText('comfyui').first()).toBeVisible();

    await page.getByRole('link', { name: 'Kimodo' }).first().click();
    await expect(page.getByRole('heading', { name: 'Kimodo', exact: true })).toBeVisible();

    const frame = page.frameLocator('iframe[title="Kimodo embedded workspace seam"]');
    await expect(frame.getByRole('heading', { name: 'Kimodo embed seam', exact: true })).toBeVisible();
  });
});
