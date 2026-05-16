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

  it('omits missing relation references and records warnings', async () => {
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

  it('seeds the default pilot project tree when requested', async () => {
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
