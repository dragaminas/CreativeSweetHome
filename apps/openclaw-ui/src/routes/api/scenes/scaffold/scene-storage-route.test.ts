import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { persistSceneBrief } from '$lib/server/scene-brief';

import { POST } from './+server';

describe('POST /api/scenes/scaffold', () => {
  it('creates the scaffold from a saved scene brief', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const previousAssets3dDir = process.env.OPENCLAW_ALLOWED_3D_ASSETS_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-scaffold-route-'));
    process.env.STUDIO_DIR = tempStudioDir;
    process.env.OPENCLAW_ALLOWED_3D_ASSETS_DIR = path.join(tempStudioDir, 'Assets3D');

    try {
      await persistSceneBrief({
        projectId: 'pilot-feature',
        sceneId: 'opening-alley',
        intent: 'Abrir con persecucion corta.',
        tone: 'Nocturno cinematografico.',
        narrative: 'Nora cruza un callejon lluvioso seguida por un dron.',
        characters: ['Nora'],
        objects: ['dron'],
        constraints: ['clip corto']
      });

      const response = await POST({
        request: new Request('http://localhost/api/scenes/scaffold', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            initialShotId: 'sh010'
          })
        })
      } as never);

      expect(response.status).toBe(200);

      const payload = (await response.json()) as {
        accepted: boolean;
        status: string;
        scaffold: {
          sceneRoot: string;
          manifestPaths: string[];
        };
      };

      expect(payload.accepted).toBe(true);
      expect(payload.status).toBe('created');
      expect(payload.scaffold.sceneRoot).toContain('/Scenes/pilot-feature/opening-alley');
      expect(payload.scaffold.manifestPaths.some((entry) => entry.endsWith('scene-storage.json'))).toBe(
        true
      );

      await expect(
        fs.access(path.join(payload.scaffold.sceneRoot, 'shots', 'sh010', 'manifests', 'shot.json'))
      ).resolves.toBeUndefined();
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }

      if (previousAssets3dDir === undefined) {
        delete process.env.OPENCLAW_ALLOWED_3D_ASSETS_DIR;
      } else {
        process.env.OPENCLAW_ALLOWED_3D_ASSETS_DIR = previousAssets3dDir;
      }
    }
  });

  it('returns a readable missing-prerequisites response when the brief is absent', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const previousAssets3dDir = process.env.OPENCLAW_ALLOWED_3D_ASSETS_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-scaffold-route-missing-'));
    process.env.STUDIO_DIR = tempStudioDir;
    process.env.OPENCLAW_ALLOWED_3D_ASSETS_DIR = path.join(tempStudioDir, 'Assets3D');

    try {
      const response = await POST({
        request: new Request('http://localhost/api/scenes/scaffold', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            projectId: 'pilot-feature',
            sceneId: 'missing-brief',
            initialShotId: 'sh010'
          })
        })
      } as never);

      expect(response.status).toBe(409);

      const payload = (await response.json()) as {
        accepted: boolean;
        status: string;
        message: string;
      };

      expect(payload.accepted).toBe(false);
      expect(payload.status).toBe('missing_prerequisites');
      expect(payload.message).toMatch(/scene brief/i);
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }

      if (previousAssets3dDir === undefined) {
        delete process.env.OPENCLAW_ALLOWED_3D_ASSETS_DIR;
      } else {
        process.env.OPENCLAW_ALLOWED_3D_ASSETS_DIR = previousAssets3dDir;
      }
    }
  });

  it('fails with 400 when projectId or sceneId is missing', async () => {
    const response = await POST({
      request: new Request('http://localhost/api/scenes/scaffold', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
      })
    } as never);

    expect(response.status).toBe(400);

    const payload = (await response.json()) as {
      accepted: boolean;
      status: string;
      message: string;
    };

    expect(payload.accepted).toBe(false);
    expect(payload.status).toBe('fail_compile');
    expect(payload.message).toMatch(/projectid/i);
  });
});
