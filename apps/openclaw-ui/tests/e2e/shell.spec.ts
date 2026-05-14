import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const STUDIO_DIR = process.env.STUDIO_DIR || path.join(os.homedir(), 'Studio');

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

test.describe('phase16-scene-brief', () => {
  test('captures and persists a reusable scene brief from the workspace UI', async ({
    page
  }) => {
    const projectId = `phase16-proof-${Date.now()}`;
    const sceneId = 'opening-alley';
    const expectedFilePath = path.join(
      STUDIO_DIR,
      'Scenes',
      projectId,
      sceneId,
      'briefs',
      'scene-brief.json'
    );

    await page.goto('/workspaces/scene');

    await page.getByTestId('scene-brief-project-id').fill(projectId);
    await page.getByTestId('scene-brief-scene-id').fill(sceneId);
    await page
      .getByTestId('scene-brief-intent')
      .fill('Abrir la historia con una persecucion corta.');
    await page
      .getByTestId('scene-brief-tone')
      .fill('Nocturno, artesanal y cinematografico.');
    await page.getByTestId('scene-brief-narrative').fill(
      'Una piloto adolescente cruza un callejon lluvioso mientras un dron casero la sigue de cerca.'
    );
    await page.getByTestId('scene-brief-characters').fill('Nora\ndron casero');
    await page.getByTestId('scene-brief-objects').fill('moto electrica\nneones');
    await page
      .getByTestId('scene-brief-constraints')
      .fill('clip corto\ncontinuidad entre personaje y dron');
    await page
      .getByTestId('scene-brief-references')
      .fill('moodboard lluvia nocturna\nturnaround personaje');

    await page.getByTestId('scene-brief-submit').click();

    await expect(page.getByTestId('scene-brief-checkpoint-status')).toContainText('accepted');
    await expect(page.getByTestId('scene-brief-saved-path')).toContainText(
      '/Scenes/phase16-proof-'
    );
    await expect(page.getByTestId('scene-brief-feedback')).toBeVisible();

    await expect
      .poll(async () => {
        try {
          await fs.access(expectedFilePath);
          return true;
        } catch {
          return false;
        }
      })
      .toBe(true);

    const artifact = JSON.parse(await fs.readFile(expectedFilePath, 'utf8')) as {
      projectId: string;
      sceneId: string;
      checkpoint: { status: string };
      source: { references: string[] };
    };

    expect(artifact.projectId).toBe(projectId);
    expect(artifact.sceneId).toBe(sceneId);
    expect(artifact.checkpoint.status).toBe('accepted');
    expect(artifact.source.references).toEqual([
      'moodboard lluvia nocturna',
      'turnaround personaje'
    ]);
  });
});
