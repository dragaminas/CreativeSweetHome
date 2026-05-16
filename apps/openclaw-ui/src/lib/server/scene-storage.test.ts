import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { persistSceneBrief } from './scene-brief';
import { createSceneStorageScaffold } from './scene-storage';

describe('scene-storage scaffolding', () => {
  it('creates a canonical scene scaffold and initial manifests from a saved brief', async () => {
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-scene-storage-'));

    await persistSceneBrief(
      {
        projectId: 'pilot-feature',
        sceneId: 'opening-alley',
        intent: 'Abrir con persecucion corta.',
        tone: 'Nocturno cinematografico.',
        narrative: 'Nora cruza un callejon lluvioso seguida por un dron.',
        characters: ['Nora'],
        objects: ['dron'],
        constraints: ['clip corto']
      },
      { studioDir: tempStudioDir, now: new Date('2026-05-14T10:00:00.000Z') }
    );

    const result = await createSceneStorageScaffold(
      {
        projectId: 'pilot-feature',
        sceneId: 'opening-alley',
        initialShotId: 'sh010'
      },
      {
        studioDir: tempStudioDir,
        assets3dDir: path.join(tempStudioDir, 'Assets3D'),
        now: new Date('2026-05-14T11:00:00.000Z')
      }
    );

    expect(result.status).toBe('created');

    const expectedSceneRoot = path.join(
      tempStudioDir,
      'Scenes',
      'pilot-feature',
      'opening-alley'
    );
    const expectedAssetsRoot = path.join(tempStudioDir, 'Assets3D', 'pilot-feature');
    const expectedExportRoot = path.join(tempStudioDir, 'Exports', 'pilot-feature', 'sh010');

    expect(result.sceneRoot).toBe(expectedSceneRoot);
    expect(result.assetsRoot).toBe(expectedAssetsRoot);
    expect(result.exportRoot).toBe(expectedExportRoot);

    await expect(fs.access(path.join(expectedSceneRoot, 'assets', 'characters'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(expectedSceneRoot, 'assets', 'objects'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(expectedSceneRoot, 'shots', 'sh010', 'manifests'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(expectedExportRoot, 'blender', 'manifests'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(expectedExportRoot, 'comfyui', 'output'))).resolves.toBeUndefined();

    const sceneManifestPath = path.join(expectedSceneRoot, 'manifests', 'scene-storage.json');
    const assetsManifestPath = path.join(expectedSceneRoot, 'manifests', 'assets.json');
    const shotManifestPath = path.join(expectedSceneRoot, 'shots', 'sh010', 'manifests', 'shot.json');

    expect(result.manifestPaths).toEqual(
      expect.arrayContaining([sceneManifestPath, assetsManifestPath, shotManifestPath])
    );

    const shotManifest = JSON.parse(await fs.readFile(shotManifestPath, 'utf8')) as {
      shotId: string;
      sceneId: string;
      projectId: string;
      exportsRoot: string;
    };

    expect(shotManifest.projectId).toBe('pilot-feature');
    expect(shotManifest.sceneId).toBe('opening-alley');
    expect(shotManifest.shotId).toBe('sh010');
    expect(shotManifest.exportsRoot).toBe(expectedExportRoot);

    const assetsManifest = JSON.parse(await fs.readFile(assetsManifestPath, 'utf8')) as {
      schemaVersion: number;
      shotOrder: string[];
      assetOrder: {
        characters: string[];
        objects: string[];
        locations: string[];
      };
      shots: Record<string, { assetIds: string[]; locationIds: string[] }>;
    };

    expect(assetsManifest.schemaVersion).toBe(2);
    expect(assetsManifest.shotOrder).toEqual(['sh010']);
    expect(assetsManifest.assetOrder).toEqual({
      characters: [],
      objects: [],
      locations: []
    });
    expect(assetsManifest.shots.sh010).toEqual({
      assetIds: [],
      locationIds: []
    });
  });

  it('reports collisions when the scaffold already exists', async () => {
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-scene-storage-collision-'));

    await persistSceneBrief(
      {
        projectId: 'pilot-feature',
        sceneId: 'opening-alley',
        intent: 'Abrir con persecucion corta.',
        tone: 'Nocturno cinematografico.',
        narrative: 'Nora cruza un callejon lluvioso seguida por un dron.',
        characters: ['Nora'],
        objects: ['dron'],
        constraints: ['clip corto']
      },
      { studioDir: tempStudioDir }
    );

    await createSceneStorageScaffold(
      {
        projectId: 'pilot-feature',
        sceneId: 'opening-alley',
        initialShotId: 'sh010'
      },
      {
        studioDir: tempStudioDir,
        assets3dDir: path.join(tempStudioDir, 'Assets3D')
      }
    );

    const secondRun = await createSceneStorageScaffold(
      {
        projectId: 'pilot-feature',
        sceneId: 'opening-alley',
        initialShotId: 'sh010'
      },
      {
        studioDir: tempStudioDir,
        assets3dDir: path.join(tempStudioDir, 'Assets3D')
      }
    );

    expect(secondRun.status).toBe('collision');
    expect(secondRun.collisionPaths.some((entry) => entry.endsWith('scene-storage.json'))).toBe(true);
  });

  it('reports missing prerequisites when the scene brief was not saved yet', async () => {
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-scene-storage-prereq-'));

    const result = await createSceneStorageScaffold(
      {
        projectId: 'pilot-feature',
        sceneId: 'opening-alley',
        initialShotId: 'sh010'
      },
      {
        studioDir: tempStudioDir,
        assets3dDir: path.join(tempStudioDir, 'Assets3D')
      }
    );

    expect(result.status).toBe('missing_prerequisites');
    expect(result.message).toMatch(/scene brief/i);
    expect(result.message).toMatch(/scene-brief\.json/i);
    expect(result.createdPaths).toEqual([]);
  });
});
