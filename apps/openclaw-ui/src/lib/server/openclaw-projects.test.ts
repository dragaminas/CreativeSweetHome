import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  loadOpenClawProjectSnapshots,
  seedDefaultOpenClawProjectTree
} from './openclaw-projects';

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function withTempStudioDir<T>(run: (studioDir: string) => Promise<T>): Promise<T> {
  const previousStudioDir = process.env.STUDIO_DIR;
  const studioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-studio-'));
  process.env.STUDIO_DIR = studioDir;
  try {
    return await run(studioDir);
  } finally {
    if (previousStudioDir === undefined) {
      delete process.env.STUDIO_DIR;
    } else {
      process.env.STUDIO_DIR = previousStudioDir;
    }
  }
}

async function createPilotProject(rootDir: string): Promise<void> {
  const projectDir = path.join(rootDir, 'pilot-project');

  await writeJson(path.join(projectDir, 'project.json'), {
    id: 'pilot-project',
    name: 'Pilot Project',
    description: 'Filesystem-backed pilot project.',
    scriptIds: ['script-main']
  });

  await writeJson(path.join(projectDir, 'relations.json'), {
    schemaVersion: 1,
    projectId: 'pilot-project',
    sceneOrder: ['sc001'],
    assetOrder: {
      characters: ['asset-nora'],
      objects: [],
      locations: ['loc-alley']
    },
    scenes: {
      sc001: {
        shotOrder: ['sh010'],
        assetIds: ['asset-nora', 'loc-alley'],
        locationIds: ['loc-alley']
      }
    },
    shots: {
      sh010: {
        sceneId: 'sc001',
        assetIds: ['asset-nora', 'loc-alley']
      }
    },
    assets: {
      'asset-nora': {
        kind: 'character',
        sceneIds: ['sc001'],
        shotIds: ['sh010']
      },
      'loc-alley': {
        kind: 'location',
        sceneIds: ['sc001'],
        shotIds: ['sh010']
      }
    }
  });

  await writeJson(path.join(projectDir, 'scenes', 'sc001', 'scene.json'), {
    id: 'sc001',
    name: 'Opening Alley',
    description: 'Initial scene scaffolded from filesystem.',
    scriptId: 'script-main'
  });

  await writeJson(path.join(projectDir, 'scenes', 'sc001', 'shots', 'sh010', 'shot.json'), {
    id: 'sh010',
    name: 'Shot 010',
    description: 'Nora enters the rainy alley.',
    order: 1,
    durationMs: 4800,
    frameRate: 24,
    locationId: 'loc-alley',
    framing: {
      shotSize: 'ms',
      cameraAngle: 'eye',
      cameraMove: 'dolly',
      lensMm: 35
    }
  });

  await writeJson(path.join(projectDir, 'assets', 'characters', 'asset-nora', 'asset.json'), {
    id: 'asset-nora',
    name: 'Nora',
    description: 'Main character of the opening chase.',
    kind: 'character'
  });

  await writeJson(path.join(projectDir, 'assets', 'locations', 'loc-alley', 'asset.json'), {
    id: 'loc-alley',
    name: 'Rainy Alley',
    description: 'Neon-lit alley used in the opening beat.',
    kind: 'location'
  });

  await fs.mkdir(path.join(projectDir, 'assets', 'objects'), { recursive: true });
}

describe('openclaw project filesystem loader', () => {
  it('loads project folders into canonical domain snapshots', async () => {
    await withTempStudioDir(async () => {
      const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-projects-'));
      await createPilotProject(rootDir);

      const result = await loadOpenClawProjectSnapshots({ projectsDir: rootDir });

      expect(result.rootDir).toBe(rootDir);
      expect(result.warnings).toEqual([]);
      expect(result.snapshots).toHaveLength(1);
      expect(result.snapshots[0]?.project.name).toBe('Pilot Project');
      expect(result.snapshots[0]?.project.sceneIds).toEqual(['sc001']);
      expect(result.snapshots[0]?.project.assetIds).toEqual(['asset-nora', 'loc-alley']);
      expect(result.snapshots[0]?.project.locationIds).toEqual(['loc-alley']);
      expect(result.snapshots[0]?.scenes[0]?.shotIds).toEqual(['sh010']);
      expect(result.snapshots[0]?.assets.map((asset) => asset.kind)).toEqual([
        'character',
        'location'
      ]);
    });
  });

  it('omits missing relation references and records warnings', async () => {
    await withTempStudioDir(async () => {
      const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-projects-missing-ref-'));
      await createPilotProject(rootDir);

      const relationsPath = path.join(rootDir, 'pilot-project', 'relations.json');
      const raw = JSON.parse(await fs.readFile(relationsPath, 'utf8')) as {
        sceneOrder: string[];
      };
      raw.sceneOrder = ['sc001', 'missing-scene'];
      await writeJson(relationsPath, raw);

      const result = await loadOpenClawProjectSnapshots({ projectsDir: rootDir });

      expect(result.snapshots[0]?.project.sceneIds).toEqual(['sc001']);
      expect(result.warnings.some((warning) => warning.includes('missing-scene'))).toBe(true);
    });
  });

  it('seeds the default pilot project tree when requested', async () => {
    await withTempStudioDir(async () => {
      const rootDir = path.join(
        await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-projects-seed-')),
        'projects'
      );

      await seedDefaultOpenClawProjectTree(rootDir, new Date('2026-05-16T09:00:00.000Z'));
      const result = await loadOpenClawProjectSnapshots({ projectsDir: rootDir });

      expect(result.snapshots[0]?.project.id).toBe('pilot-project');
      await expect(
        fs.access(path.join(rootDir, 'pilot-project', 'relations.json'))
      ).resolves.toBeUndefined();
      await expect(
        fs.access(path.join(rootDir, 'pilot-project', 'assets', 'objects'))
      ).resolves.toBeUndefined();
    });
  });

  it('prefers STUDIO_DIR scene manifests and reconciles openclaw-projects as derived projection', async () => {
    await withTempStudioDir(async (studioDir) => {
      const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-projects-reconcile-'));
      const projectId = 'pilot-feature';
      const sceneId = 'opening-alley';
      const shotId = 'sh010';

      await writeJson(
        path.join(studioDir, 'Scenes', projectId, sceneId, 'briefs', 'scene-brief.json'),
        {
          projectId,
          sceneId,
          source: {
            intent: 'Opening Alley'
          }
        }
      );
      await writeJson(path.join(studioDir, 'Scenes', projectId, sceneId, 'manifests', 'scene-storage.json'), {
        projectId,
        sceneId,
        initialShotId: shotId
      });
      await writeJson(path.join(studioDir, 'Scenes', projectId, sceneId, 'manifests', 'assets.json'), {
        schemaVersion: 2,
        projectId,
        sceneId,
        shotOrder: [shotId],
        assetOrder: {
          characters: ['chr-001'],
          objects: ['obj-001'],
          locations: []
        },
        shots: {
          [shotId]: {
            assetIds: ['chr-001', 'obj-001'],
            locationIds: []
          }
        },
        assets: {}
      });
      await writeJson(
        path.join(studioDir, 'Scenes', projectId, sceneId, 'shots', shotId, 'manifests', 'shot.json'),
        {
          shotId,
          status: 'draft'
        }
      );
      await writeJson(
        path.join(studioDir, 'Scenes', projectId, sceneId, 'manifests', 'character-catalog.json'),
        {
          schemaVersion: 1,
          projectId,
          sceneId,
          kind: 'character',
          assets: [
            {
              assetId: 'chr-001',
              kind: 'character',
              label: 'Nora',
              description: 'Lead character.',
              stage: 'model_3d',
              stageState: 'ready',
              tags: []
            }
          ]
        }
      );
      await writeJson(
        path.join(studioDir, 'Scenes', projectId, sceneId, 'manifests', 'object-catalog.json'),
        {
          schemaVersion: 1,
          projectId,
          sceneId,
          kind: 'object',
          assets: [
            {
              assetId: 'obj-001',
              kind: 'object',
              label: 'Drone',
              description: 'Tracking drone.',
              stage: 'reference_image',
              stageState: 'in_progress',
              tags: []
            }
          ]
        }
      );

      const result = await loadOpenClawProjectSnapshots({ projectsDir: rootDir });

      expect(result.snapshots).toHaveLength(1);
      expect(result.snapshots[0]?.project.id).toBe(projectId);
      expect(result.snapshots[0]?.project.sceneIds).toEqual([sceneId]);
      expect(result.snapshots[0]?.scenes[0]?.shotIds).toEqual([shotId]);
      expect(result.snapshots[0]?.project.assetIds).toEqual(expect.arrayContaining(['chr-001', 'obj-001']));

      await expect(
        fs.access(path.join(rootDir, projectId, 'project.json'))
      ).resolves.toBeUndefined();
      await expect(
        fs.access(path.join(rootDir, projectId, 'relations.json'))
      ).resolves.toBeUndefined();
      await expect(
        fs.access(path.join(rootDir, projectId, 'scenes', sceneId, 'shots', shotId, 'shot.json'))
      ).resolves.toBeUndefined();
    });
  });
});
