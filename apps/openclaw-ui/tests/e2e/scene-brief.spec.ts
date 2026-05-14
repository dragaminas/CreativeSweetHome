import { expect, test } from '@playwright/test';

test.describe('phase16-scene-brief', () => {
  test('captures and persists a scene brief from the workspace UI', async ({ page }) => {
    await page.goto('/workspaces/scene');

    await page.getByTestId('scene-brief-project-id').fill('pilot-feature');
    await page.getByTestId('scene-brief-scene-id').fill('opening-alley');
    await page
      .getByTestId('scene-brief-intent')
      .fill('Abrir la historia con una persecucion corta.');
    await page
      .getByTestId('scene-brief-tone')
      .fill('Nocturno, artesanal y cinematografico.');
    await page.getByTestId('scene-brief-narrative').fill(
      'Una piloto adolescente cruza un callejon lluvioso mientras un dron casero la sigue de cerca.'
    );
    await page
      .getByTestId('scene-brief-characters')
      .fill('Nora\ndron casero');
    await page
      .getByTestId('scene-brief-objects')
      .fill('moto electrica\nneones');
    await page
      .getByTestId('scene-brief-constraints')
      .fill('clip corto\ncontinuidad entre personaje y dron');

    await page.getByTestId('scene-brief-submit').click();

    await expect(page.getByTestId('scene-brief-checkpoint-status')).toContainText('accepted');
    await expect(page.getByTestId('scene-brief-saved-path')).toContainText(
      '/Scenes/pilot-feature/opening-alley/briefs/scene-brief.json'
    );
    await expect(page.getByTestId('scene-brief-feedback')).toBeVisible();
  });
});
