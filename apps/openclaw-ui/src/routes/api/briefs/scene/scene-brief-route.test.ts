import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { POST } from './+server';

describe('POST /api/briefs/scene', () => {
  it('persists a guided brief and returns checkpoint feedback', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-scene-brief-route-'));
    process.env.STUDIO_DIR = tempStudioDir;

    try {
      const response = await POST({
        request: new Request('http://localhost/api/briefs/scene', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            intent: 'Abrir la historia con una persecucion corta.',
            tone: 'Nocturno y artesanal.',
            narrative:
              'Una piloto adolescente cruza un callejon lluvioso mientras un dron casero la sigue.',
            characters: ['Nora', 'dron casero'],
            objects: ['moto electrica', 'neones'],
            constraints: ['clip corto', 'continuidad entre personaje y dron']
          })
        })
      } as never);

      expect(response.status).toBe(200);

      const payload = (await response.json()) as {
        accepted: boolean;
        status: string;
        artifact: { briefId: string };
        filePath: string;
      };

      expect(payload.accepted).toBe(true);
      expect(payload.status).toBe('accepted');
      expect(payload.artifact.briefId).toBe('pilot-feature:opening-alley');
      expect(payload.filePath).toContain('/Scenes/pilot-feature/opening-alley/briefs/scene-brief.json');

      const saved = await fs.readFile(payload.filePath, 'utf8');
      expect(saved).toContain('"checkpoint"');
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });

  it('returns incomplete feedback when required guided fields are missing', async () => {
    const response = await POST({
      request: new Request('http://localhost/api/briefs/scene', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          projectId: 'pilot-feature',
          intent: '',
          tone: 'Nocturno',
          characters: [],
          objects: ['callejon'],
          constraints: []
        })
      })
    } as never);

    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      accepted: boolean;
      status: string;
      message: string;
      artifact: { checkpoint: { status: string } };
    };

    expect(payload.accepted).toBe(false);
    expect(payload.status).toBe('incomplete');
    expect(payload.artifact.checkpoint.status).toBe('incomplete');
    expect(payload.message).toMatch(/incomplete/i);
  });

  it('fails with 400 when the request body is empty', async () => {
    const response = await POST({
      request: new Request('http://localhost/api/briefs/scene', {
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
    expect(payload.message).toMatch(/obligatorio/i);
  });
});
