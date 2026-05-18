import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createSceneStorageScaffold } from '$lib/server/scene-storage';
import { persistSceneBrief } from '$lib/server/scene-brief';

import { POST } from './+server';

describe('POST /api/briefs/shot', () => {
  it('persists a guided shot brief and returns checkpoint + consistency feedback', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-shot-brief-route-'));
    process.env.STUDIO_DIR = tempStudioDir;

    try {
      await persistSceneBrief({
        projectId: 'pilot-feature',
        sceneId: 'opening-alley',
        intent: 'Preparar escena para test de shot brief.',
        tone: 'Nocturno cinematografico.',
        narrative: 'Nora corre por un callejon.',
        characters: ['Nora'],
        objects: ['dron'],
        constraints: ['continuidad visual']
      });
      await createSceneStorageScaffold({
        projectId: 'pilot-feature',
        sceneId: 'opening-alley',
        initialShotId: 'sh010'
      });

      const response = await POST({
        request: new Request('http://localhost/api/briefs/shot', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            shotId: 'sh010',
            intent: 'Entrada de Nora al callejon.',
            framing: 'Plano medio con desplazamiento lateral.',
            durationMs: 4000,
            characters: ['Nora'],
            constraints: ['24fps', 'sin saltos de continuidad'],
            references: ['shotdeck-rain-night']
          })
        })
      } as never);

      expect(response.status).toBe(200);

      const payload = (await response.json()) as {
        accepted: boolean;
        status: string;
        artifact: { briefId: string; consistency: { status: string } };
        filePath: string;
      };

      expect(payload.accepted).toBe(true);
      expect(payload.status).toBe('accepted');
      expect(payload.artifact.briefId).toBe('pilot-feature:opening-alley:sh010');
      expect(payload.artifact.consistency.status).toBe('needs_review');
      expect(payload.filePath).toContain('/Scenes/pilot-feature/opening-alley/shots/sh010/briefs/shot-brief.json');

      const saved = await fs.readFile(payload.filePath, 'utf8');
      expect(saved).toContain('"consistency"');
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });

  it('returns 400 when required fields are missing', async () => {
    const response = await POST({
      request: new Request('http://localhost/api/briefs/shot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          projectId: 'pilot-feature',
          sceneId: 'opening-alley',
          shotId: 'sh010'
        })
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
    expect(payload.message).toMatch(/intent/i);
  });
});
