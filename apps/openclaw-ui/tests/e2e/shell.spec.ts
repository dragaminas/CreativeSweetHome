import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, type APIRequestContext } from '@playwright/test';

const STUDIO_DIR = process.env.STUDIO_DIR || path.join(os.homedir(), 'Studio');

async function seedSceneScaffold(
  request: APIRequestContext,
  projectId: string,
  sceneId: string,
  shotId: string
): Promise<void> {
  const briefResponse = await request.post('/api/briefs/scene', {
    data: {
      projectId,
      sceneId,
      intent: `Scene ${sceneId}`,
      tone: 'Nocturno y cinematico.',
      narrative: 'Escena seed para pruebas e2e de navegacion y catalogo.',
      characters: ['Nora'],
      objects: ['Drone'],
      constraints: ['consistencia e2e']
    }
  });
  expect(briefResponse.ok()).toBeTruthy();

  const briefPayload = (await briefResponse.json()) as { status: string };
  expect(briefPayload.status).toBe('accepted');

  const scaffoldResponse = await request.post('/api/scenes/scaffold', {
    data: {
      projectId,
      sceneId,
      initialShotId: shotId
    }
  });
  expect(scaffoldResponse.ok()).toBeTruthy();

  const scaffoldPayload = (await scaffoldResponse.json()) as { status: string; accepted: boolean };
  expect(scaffoldPayload.accepted).toBe(true);
  expect(scaffoldPayload.status).toBe('created');
}

test.describe('project-editor-shell', () => {
  test('opens ProjectsEditor from the layout navigation into the right editor panel', async ({
    page
  }) => {
    await page.goto('/');

    await expect(page.getByTestId('project-navigation')).toBeVisible();
    await expect(page.getByTestId('nav-projects')).toHaveAttribute('href', '/?editor=projects');
    await expect(page.getByTestId('editor-panel')).toBeVisible();
    await expect(page.getByTestId('projects-editor')).toBeVisible();
    await expect(
      page.getByTestId('projects-editor').getByRole('link', { name: 'Pilot Project' })
    ).toBeVisible();

    await page.getByTestId('nav-project-pilot-project').click();
    await expect(page).toHaveURL(/editor=project/);
    await expect(page.getByTestId('project-editor')).toBeVisible();

    await page.getByTestId('nav-projects').click();
    await expect(page).toHaveURL(/editor=projects/);
    await expect(page.getByTestId('projects-editor')).toBeVisible();

    const projectsEditor = page.getByTestId('projects-editor');
    const listItems = projectsEditor.locator('.projects-editor-list li');
    const initialCount = await listItems.count();
    await projectsEditor.getByRole('button', { name: 'Add Project' }).click();
    await expect(projectsEditor).toBeVisible();
    await expect(listItems).toHaveCount(initialCount);
  });

  test('opens filesystem-backed asset, scene, and shot editors from nested navigation', async ({
    page,
    request
  }) => {
    const projectId = `phase15-nav-proof-${Date.now()}`;
    const sceneId = 'nav-scene';
    const shotId = 'sh010';
    const assetLabel = `Nora Nav ${Date.now()}`;
    await seedSceneScaffold(request, projectId, sceneId, shotId);

    const createAssetResponse = await request.post('/api/assets', {
      data: {
        action: 'create',
        projectId,
        sceneId,
        kind: 'character',
        label: assetLabel
      }
    });
    expect(createAssetResponse.ok()).toBeTruthy();
    const createAssetPayload = (await createAssetResponse.json()) as {
      accepted: boolean;
      status: string;
      assetId: string;
    };
    expect(createAssetPayload.accepted).toBe(true);
    expect(createAssetPayload.status).toBe('created');
    const assetId = createAssetPayload.assetId;

    await page.goto('/');

    await expect(page.getByTestId(`nav-project-${projectId}`)).toBeVisible();
    await expect(page.getByTestId(`nav-scenes-${projectId}`)).toContainText('Scenes');
    await expect(page.getByTestId(`nav-assets-${projectId}`)).toContainText('Assets');
    await expect(page.getByTestId(`nav-asset-category-characters-${projectId}`)).toContainText(
      'Characters'
    );
    await expect(page.getByTestId(`nav-asset-category-objects-${projectId}`)).toContainText(
      'Objects'
    );
    await expect(page.getByTestId(`nav-asset-category-locations-${projectId}`)).toContainText(
      'Locations'
    );

    const projectAssetsBranch = page.getByTestId(`nav-assets-${projectId}`);
    await projectAssetsBranch.getByTestId(`nav-asset-${assetId}`).click();
    await expect(page).toHaveURL(/editor=asset/);
    const assetEditor = page.getByTestId('asset-editor');
    await expect(assetEditor).toBeVisible();
    await expect(assetEditor.getByRole('heading', { name: assetLabel })).toBeVisible();
    await expect(assetEditor.getByText(`Assets3D/${projectId}/${assetId}`, { exact: false })).toBeVisible();

    const projectScenesBranch = page.getByTestId(`nav-scenes-${projectId}`);
    await projectScenesBranch.getByTestId(`nav-scene-${sceneId}`).click();
    await expect(page).toHaveURL(/editor=scene/);
    const sceneEditor = page.getByTestId('scene-editor');
    await expect(sceneEditor).toBeVisible();
    await expect(sceneEditor.getByText('script-main')).toBeVisible();

    await projectScenesBranch.getByTestId(`nav-shot-${shotId}`).click();
    await expect(page).toHaveURL(/editor=shot/);
    const shotEditor = page.getByTestId('shot-editor');
    await expect(shotEditor).toBeVisible();
    await expect(shotEditor.getByText(`${sceneId}`)).toBeVisible();
    await expect(shotEditor.getByText(/\d+ ms/)).toBeVisible();
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

test.describe('phase17-scaffold', () => {
  test('creates the canonical scene storage scaffold from the scene workspace', async ({
    page,
    request
  }) => {
    const projectId = `phase17-proof-${Date.now()}`;
    const sceneId = 'opening-alley';
    const shotId = 'sh010';
    const expectedSceneManifestPath = path.join(
      STUDIO_DIR,
      'Scenes',
      projectId,
      sceneId,
      'manifests',
      'scene-storage.json'
    );
    const expectedAssetsManifestPath = path.join(
      STUDIO_DIR,
      'Scenes',
      projectId,
      sceneId,
      'manifests',
      'assets.json'
    );
    const expectedShotManifestPath = path.join(
      STUDIO_DIR,
      'Scenes',
      projectId,
      sceneId,
      'shots',
      shotId,
      'manifests',
      'shot.json'
    );

    const briefResponse = await request.post('/api/briefs/scene', {
      data: {
        projectId,
        sceneId,
        intent: 'Abrir la historia con una persecucion corta.',
        tone: 'Nocturno, artesanal y cinematografico.',
        narrative:
          'Una piloto adolescente cruza un callejon lluvioso mientras un dron casero la sigue de cerca.',
        characters: ['Nora', 'dron casero'],
        objects: ['moto electrica', 'neones'],
        constraints: ['clip corto', 'continuidad entre personaje y dron']
      }
    });
    expect(briefResponse.ok()).toBeTruthy();

    const briefPayload = (await briefResponse.json()) as { status: string };
    expect(briefPayload.status).toBe('accepted');

    await page.goto('/workspaces/scene');

    await page.getByTestId('scene-scaffold-project-id').fill(projectId);
    await page.getByTestId('scene-scaffold-scene-id').fill(sceneId);
    await page.getByTestId('scene-scaffold-shot-id').fill(shotId);
    await page.getByTestId('scene-scaffold-submit').click();

    await expect(page.getByTestId('scene-scaffold-status')).toContainText('created');
    await expect(page.getByTestId('scene-scaffold-feedback')).toContainText('/Scenes/');
    await expect(page.getByTestId('scene-scaffold-feedback')).toContainText(
      `/Exports/${projectId}/${shotId}`
    );

    await expect
      .poll(async () => {
        try {
          await fs.access(expectedSceneManifestPath);
          return true;
        } catch {
          return false;
        }
      })
      .toBe(true);

    await expect
      .poll(async () => {
        try {
          await fs.access(expectedAssetsManifestPath);
          return true;
        } catch {
          return false;
        }
      })
      .toBe(true);

    await expect
      .poll(async () => {
        try {
          await fs.access(expectedShotManifestPath);
          return true;
        } catch {
          return false;
        }
      })
      .toBe(true);

    const expectedExportSubdirs = [
      path.join(STUDIO_DIR, 'Exports', projectId, shotId, 'blender', 'frames'),
      path.join(STUDIO_DIR, 'Exports', projectId, shotId, 'blender', 'controls'),
      path.join(STUDIO_DIR, 'Exports', projectId, shotId, 'blender', 'refs'),
      path.join(STUDIO_DIR, 'Exports', projectId, shotId, 'blender', 'manifests'),
      path.join(STUDIO_DIR, 'Exports', projectId, shotId, 'comfyui', 'input'),
      path.join(STUDIO_DIR, 'Exports', projectId, shotId, 'comfyui', 'output'),
      path.join(STUDIO_DIR, 'Exports', projectId, shotId, 'comfyui', 'temp'),
      path.join(STUDIO_DIR, 'Exports', projectId, shotId, 'comfyui', 'logs')
    ];

    for (const expectedPath of expectedExportSubdirs) {
      await expect(fs.access(expectedPath)).resolves.toBeUndefined();
    }

    const sceneManifest = JSON.parse(await fs.readFile(expectedSceneManifestPath, 'utf8')) as {
      projectId: string;
      sceneId: string;
      initialShotId: string;
      assetsManifestPath: string;
      exportRoot: string;
    };
    expect(sceneManifest.projectId).toBe(projectId);
    expect(sceneManifest.sceneId).toBe(sceneId);
    expect(sceneManifest.initialShotId).toBe(shotId);
    expect(sceneManifest.assetsManifestPath).toBe(expectedAssetsManifestPath);
    expect(sceneManifest.exportRoot).toContain(`/Exports/${projectId}/${shotId}`);

    const assetsManifest = JSON.parse(await fs.readFile(expectedAssetsManifestPath, 'utf8')) as {
      projectId: string;
      sceneId: string;
      schemaVersion: number;
      shotOrder: string[];
      assetOrder: {
        characters: string[];
        objects: string[];
        locations: string[];
      };
      shots: Record<string, { assetIds: string[]; locationIds: string[] }>;
    };
    expect(assetsManifest.projectId).toBe(projectId);
    expect(assetsManifest.sceneId).toBe(sceneId);
    expect(assetsManifest.schemaVersion).toBe(2);
    expect(assetsManifest.shotOrder).toEqual([shotId]);
    expect(assetsManifest.assetOrder).toEqual({
      characters: [],
      objects: [],
      locations: []
    });
    expect(assetsManifest.shots[shotId]).toEqual({
      assetIds: [],
      locationIds: []
    });
  });
});

test.describe('phase18-asset-catalog', () => {
  test('creates character/object assets and persists maturity updates from the assets workspace', async ({
    page,
    request
  }) => {
    const uniqueSuffix = Date.now();
    const projectId = `phase18-proof-${uniqueSuffix}`;
    const sceneId = 'asset-catalog-scene';
    const shotId = 'sh010';
    const characterLabel = `Nora-${uniqueSuffix}`;
    const objectLabel = `Drone-${uniqueSuffix}`;
    await seedSceneScaffold(request, projectId, sceneId, shotId);

    const characterManifestPath = path.join(
      STUDIO_DIR,
      'Scenes',
      projectId,
      sceneId,
      'manifests',
      'character-catalog.json'
    );
    const objectManifestPath = path.join(
      STUDIO_DIR,
      'Scenes',
      projectId,
      sceneId,
      'manifests',
      'object-catalog.json'
    );

    await page.goto(`/workspaces/assets?projectId=${projectId}&sceneId=${sceneId}`);
    await expect(page.locator('section.panel', { hasText: 'Crear asset' }).first()).toBeVisible();

    const createAssetPanel = page.locator('section.panel', { hasText: 'Crear asset' }).first();
    const kindSelect = createAssetPanel.locator('select').first();
    const labelInput = createAssetPanel.getByPlaceholder('Nombre del asset');
    const createAssetButton = createAssetPanel.getByRole('button', { name: 'Crear asset' });

    await expect(labelInput).toBeVisible();
    await labelInput.fill(characterLabel);
    await expect(createAssetButton).toBeEnabled();
    await createAssetButton.click();

    await expect
      .poll(async () => {
        try {
          const parsed = JSON.parse(await fs.readFile(characterManifestPath, 'utf8')) as {
            assets: Array<{ label: string }>;
          };
          return parsed.assets.some((asset) => asset.label === characterLabel);
        } catch {
          return false;
        }
      })
      .toBe(true);

    await kindSelect.selectOption('object');
    await labelInput.fill(objectLabel);
    await expect(createAssetButton).toBeEnabled();
    await createAssetButton.click();

    await expect
      .poll(async () => {
        try {
          const parsed = JSON.parse(await fs.readFile(objectManifestPath, 'utf8')) as {
            assets: Array<{ label: string }>;
          };
          return parsed.assets.some((asset) => asset.label === objectLabel);
        } catch {
          return false;
        }
      })
      .toBe(true);

    await kindSelect.selectOption('character');

    const characterRow = page.locator('.asset-table tbody tr', { hasText: characterLabel }).first();
    await expect(characterRow).toBeVisible();
    await characterRow.locator('select').nth(0).selectOption('default_benchmark_animation');
    await characterRow.locator('select').nth(1).selectOption('ready');
    await characterRow.getByRole('button', { name: 'Guardar estado' }).click();

    await expect
      .poll(async () => {
        try {
          const parsed = JSON.parse(await fs.readFile(characterManifestPath, 'utf8')) as {
            assets: Array<{ label: string; stage: string; stageState: string }>;
          };
          const entry = parsed.assets.find((asset) => asset.label === characterLabel);
          return entry?.stage === 'default_benchmark_animation' && entry?.stageState === 'ready';
        } catch {
          return false;
        }
      })
      .toBe(true);

    const characterManifest = JSON.parse(await fs.readFile(characterManifestPath, 'utf8')) as {
      assets: Array<{ label: string; stage: string; stageState: string }>;
    };
    const objectManifest = JSON.parse(await fs.readFile(objectManifestPath, 'utf8')) as {
      assets: Array<{ label: string }>;
    };

    const characterEntry = characterManifest.assets.find((asset) => asset.label === characterLabel);
    const objectEntry = objectManifest.assets.find((asset) => asset.label === objectLabel);

    expect(characterEntry).toBeDefined();
    expect(characterEntry?.stage).toBe('default_benchmark_animation');
    expect(characterEntry?.stageState).toBe('ready');
    expect(objectEntry).toBeDefined();
  });
});

test.describe('phase19-asset-references', () => {
  test('imports asset reference files from the assets workspace and persists canonical evidence', async ({
    page,
    request
  }) => {
    const uniqueSuffix = Date.now();
    const projectId = `phase19-proof-${uniqueSuffix}`;
    const sceneId = 'asset-reference-scene';
    const shotId = 'sh010';
    const assetLabel = `NoraRef-${uniqueSuffix}`;
    await seedSceneScaffold(request, projectId, sceneId, shotId);

    const createAssetResponse = await request.post('/api/assets', {
      data: {
        action: 'create',
        projectId,
        sceneId,
        kind: 'character',
        label: assetLabel,
        description: 'Piloto principal para pruebas de referencias.'
      }
    });
    expect(createAssetResponse.ok()).toBeTruthy();

    const createAssetPayload = (await createAssetResponse.json()) as {
      accepted: boolean;
      assetId: string;
    };
    expect(createAssetPayload.accepted).toBe(true);

    const tempRefsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-phase19-refs-'));
    const sourceReferencePath = path.join(tempRefsDir, 'ref-001.png');
    await fs.writeFile(sourceReferencePath, 'not-a-real-image-but-valid-file-copy', 'utf8');

    const expectedPublishedReferencePath = path.join(
      STUDIO_DIR,
      'Scenes',
      projectId,
      sceneId,
      'assets',
      'characters',
      createAssetPayload.assetId,
      'references',
      'published',
      `${createAssetPayload.assetId}__ref__001.png`
    );

    await page.goto(`/workspaces/assets?projectId=${projectId}&sceneId=${sceneId}`);

    await page.getByTestId('asset-reference-asset-id').selectOption(createAssetPayload.assetId);
    await page.getByTestId('asset-reference-mode').selectOption('import');
    await page.getByTestId('asset-reference-source-paths').fill(sourceReferencePath);
    await page.getByTestId('asset-reference-submit').click();

    await expect(page.getByTestId('asset-reference-run-status')).toContainText('pass');
    await expect(page.getByTestId('asset-reference-run-message')).toContainText(
      'Referencias importadas'
    );
    await expect(page.getByTestId('asset-reference-artifacts')).toContainText(
      `${createAssetPayload.assetId}__ref__001.png`
    );
    await expect(page.getByTestId('asset-reference-artifacts')).toContainText('preview image');
    await expect(page.getByTestId('asset-reference-checkpoints')).toContainText(
      'request-accepted'
    );
    await expect(page.getByTestId('asset-reference-evidence-path')).toContainText(
      '/Validation/comfyui/operate/'
    );

    await expect
      .poll(async () => {
        try {
          await fs.access(expectedPublishedReferencePath);
          return true;
        } catch {
          return false;
        }
      })
      .toBe(true);

    const listResponse = await request.get(
      `/api/assets?projectId=${projectId}&sceneId=${sceneId}&kind=character`
    );
    expect(listResponse.ok()).toBeTruthy();
    const listPayload = (await listResponse.json()) as {
      assets: Array<{ assetId: string; stage: string; stageState: string }>;
    };
    const updatedAsset = listPayload.assets.find((entry) => entry.assetId === createAssetPayload.assetId);
    expect(updatedAsset?.stage).toBe('reference_image');
    expect(updatedAsset?.stageState).toBe('ready');
  });
});

test.describe('phase20-asset-3d', () => {
  test('imports a 3D asset candidate from the assets workspace and persists canonical Assets3D evidence', async ({
    page,
    request
  }) => {
    const uniqueSuffix = Date.now();
    const projectId = `phase20-proof-${uniqueSuffix}`;
    const sceneId = 'asset-3d-scene';
    const shotId = 'sh010';
    const assetLabel = `Nora3D-${uniqueSuffix}`;
    await seedSceneScaffold(request, projectId, sceneId, shotId);

    const createAssetResponse = await request.post('/api/assets', {
      data: {
        action: 'create',
        projectId,
        sceneId,
        kind: 'character',
        label: assetLabel,
        description: 'Piloto principal para pruebas de importación 3D.'
      }
    });
    expect(createAssetResponse.ok()).toBeTruthy();

    const createAssetPayload = (await createAssetResponse.json()) as {
      accepted: boolean;
      assetId: string;
    };
    expect(createAssetPayload.accepted).toBe(true);

    const tempModelsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-phase20-models-'));
    const sourceModelPath = path.join(tempModelsDir, 'candidate-source.glb');
    await fs.writeFile(sourceModelPath, 'placeholder-glb-content', 'utf8');

    const expectedCandidatePath = path.join(
      STUDIO_DIR,
      'Assets3D',
      projectId,
      createAssetPayload.assetId,
      'comfyui',
      'output',
      `${createAssetPayload.assetId}__mesh_candidate__v001.glb`
    );

    await page.goto(`/workspaces/assets?projectId=${projectId}&sceneId=${sceneId}`);

    await page.getByTestId('asset-3d-asset-id').selectOption(createAssetPayload.assetId);
    await page.getByTestId('asset-3d-mode').selectOption('import');
    await page.getByTestId('asset-3d-source-model-path').fill(sourceModelPath);
    await page.getByTestId('asset-3d-submit').click();

    await expect(page.getByTestId('asset-3d-run-status')).toContainText('pass', {
      timeout: 20_000
    });
    await expect(page.getByTestId('asset-3d-run-message')).toContainText(
      'Candidato 3D importado'
    );
    await expect(page.getByTestId('asset-3d-artifacts')).toContainText(
      `${createAssetPayload.assetId}__mesh_candidate__v001.glb`
    );
    await expect(page.getByTestId('asset-3d-artifacts')).toContainText('preview 3d candidate');
    await expect(page.getByTestId('asset-3d-checkpoints')).toContainText(
      'publish-asset-3d-candidate'
    );
    await expect(page.getByTestId('asset-3d-evidence-path')).toContainText(
      '/Validation/comfyui/operate/'
    );
    await expect(page.getByTestId('asset-3d-summary-path')).toContainText(
      '/Validation/comfyui/operate/'
    );
    await expect(page.getByTestId('asset-3d-summary-path')).toContainText(
      '/manifests/summary.json'
    );

    await expect
      .poll(async () => {
        try {
          await fs.access(expectedCandidatePath);
          return true;
        } catch {
          return false;
        }
      })
      .toBe(true);

    const listResponse = await request.get(
      `/api/assets?projectId=${projectId}&sceneId=${sceneId}&kind=character`
    );
    expect(listResponse.ok()).toBeTruthy();
    const listPayload = (await listResponse.json()) as {
      assets: Array<{ assetId: string; stage: string; stageState: string }>;
    };
    const updatedAsset = listPayload.assets.find((entry) => entry.assetId === createAssetPayload.assetId);
    expect(updatedAsset?.stage).toBe('model_3d');
    expect(updatedAsset?.stageState).toBe('ready');
  });
});

test.describe('phase21-mesh-cleanup', () => {
  test('shows the cleanup panel and reports actionable diagnostics when no source model is available', async ({
    page,
    request
  }) => {
    const uniqueSuffix = Date.now();
    const projectId = `phase21-proof-${uniqueSuffix}`;
    const sceneId = 'mesh-cleanup-scene';
    const shotId = 'sh010';
    const assetLabel = `NoraCleanup-${uniqueSuffix}`;
    await seedSceneScaffold(request, projectId, sceneId, shotId);

    const createAssetResponse = await request.post('/api/assets', {
      data: {
        action: 'create',
        projectId,
        sceneId,
        kind: 'character',
        label: assetLabel,
        description: 'Personaje base para probar cleanup de meshes.'
      }
    });
    expect(createAssetResponse.ok()).toBeTruthy();
    const createAssetPayload = (await createAssetResponse.json()) as {
      accepted: boolean;
      assetId: string;
    };
    expect(createAssetPayload.accepted).toBe(true);

    const setReadyResponse = await request.post('/api/assets', {
      data: {
        action: 'update',
        projectId,
        sceneId,
        kind: 'character',
        assetId: createAssetPayload.assetId,
        stage: 'model_3d',
        stageState: 'ready'
      }
    });
    expect(setReadyResponse.ok()).toBeTruthy();

    await page.goto(`/workspaces/assets?projectId=${projectId}&sceneId=${sceneId}`);

    await expect(page.getByTestId('mesh-cleanup-asset-id')).toBeVisible();
    await page.getByTestId('mesh-cleanup-asset-id').selectOption(createAssetPayload.assetId);
    await page.getByTestId('mesh-cleanup-mode').selectOption('auto');
    await page.getByTestId('mesh-cleanup-source-model-path').fill('');
    await page.getByTestId('mesh-cleanup-submit').click();

    await expect(page.getByTestId('mesh-cleanup-error')).toContainText('source_model_path');
  });
});
