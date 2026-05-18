import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createAsset } from './asset-catalog';
import { prepareKimodoEmbedContext } from './kimodo-embed';
import { persistSceneBrief } from './scene-brief';
import { createSceneStorageScaffold } from './scene-storage';
import { persistShotBrief } from './shot-brief';
import { GET, POST } from '../../routes/workspaces/kimodo/embed/+server';

async function seedKimodoContextPrerequisites(
  studioDir: string,
  projectId: string,
  sceneId: string,
  shotId: string
): Promise<{ characterId: string; characterLabel: string }> {
  await persistSceneBrief(
    {
      projectId,
      sceneId,
      intent: 'Preparar escena para Kimodo.',
      tone: 'Cinematico.',
      narrative: 'Nora espera una marca para iniciar animacion.',
      characters: ['Nora'],
      objects: ['dron'],
      constraints: ['continuidad visual']
    },
    { studioDir, now: new Date('2026-05-18T20:00:00.000Z') }
  );

  await createSceneStorageScaffold(
    { projectId, sceneId, initialShotId: shotId },
    { studioDir, now: new Date('2026-05-18T20:01:00.000Z') }
  );

  const createAssetResult = await createAsset({
    projectId,
    sceneId,
    kind: 'character',
    label: 'Nora'
  });
  expect(createAssetResult.status).toBe('created');
  expect(createAssetResult.assetId).toBeTruthy();

  await persistShotBrief(
    {
      projectId,
      sceneId,
      shotId,
      intent: 'Nora levanta la mano y camina dos pasos.',
      framing: 'Plano medio frontal.',
      durationMs: 3600,
      characters: ['Nora'],
      constraints: ['24fps', 'sin cortes bruscos']
    },
    { studioDir, now: new Date('2026-05-18T20:02:00.000Z') }
  );

  return {
    characterId: createAssetResult.assetId || 'chr-001',
    characterLabel: 'Nora'
  };
}

describe('kimodo backend bridge', () => {
  it('persists canonical kimodo context + state for a shot-linked character', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-kimodo-backend-'));
    process.env.STUDIO_DIR = tempStudioDir;

    const projectId = 'pilot-feature';
    const sceneId = 'opening-alley';
    const shotId = 'sh010';

    try {
      const seeded = await seedKimodoContextPrerequisites(tempStudioDir, projectId, sceneId, shotId);

      const result = await prepareKimodoEmbedContext({
        projectId,
        sceneId,
        shotId,
        characterId: seeded.characterId
      });

      expect(result.accepted).toBe(true);
      expect(result.status).toBe('ready');
      expect(result.context.projectId).toBe(projectId);
      expect(result.context.sceneId).toBe(sceneId);
      expect(result.context.shotId).toBe(shotId);
      expect(result.context.characterId).toBe(seeded.characterId);
      expect(result.context.characterLabel).toBe(seeded.characterLabel);
      expect(result.context.outputRoot).toContain(`/Exports/${projectId}/${shotId}/kimodo/output`);
      expect(result.contextPath).toContain('/shots/sh010/manifests/kimodo-embed-context.json');
      expect(result.statePath).toContain('/shots/sh010/manifests/kimodo-animation-state.json');

      await expect(fs.access(result.contextPath)).resolves.toBeUndefined();
      await expect(fs.access(result.statePath)).resolves.toBeUndefined();

      const persistedContext = JSON.parse(await fs.readFile(result.contextPath, 'utf8')) as {
        consistency: { status: string; missing: string[] };
        outputRoot: string;
      };
      expect(persistedContext.consistency.status).toBe('ready');
      expect(persistedContext.consistency.missing).toEqual([]);
      expect(persistedContext.outputRoot).toBe(result.context.outputRoot);
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });

  it('returns compile failure when required embed context fields are missing', async () => {
    const response = await POST({
      request: new Request('http://localhost/workspaces/kimodo/embed', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId: 'pilot-feature' })
      }),
      url: new URL('http://localhost/workspaces/kimodo/embed')
    } as never);

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { status: string; accepted: boolean; message: string };
    expect(payload.accepted).toBe(false);
    expect(payload.status).toBe('fail_compile');
    expect(payload.message).toMatch(/shotId/i);
  });

  it('returns json context bridge payload from GET format=json', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-kimodo-backend-get-'));
    process.env.STUDIO_DIR = tempStudioDir;

    const projectId = 'pilot-feature';
    const sceneId = 'opening-alley';
    const shotId = 'sh010';

    try {
      const seeded = await seedKimodoContextPrerequisites(tempStudioDir, projectId, sceneId, shotId);

      const response = await GET({
        url: new URL(
          `http://localhost/workspaces/kimodo/embed?format=json&projectId=${projectId}&sceneId=${sceneId}&shotId=${shotId}&characterId=${seeded.characterId}`
        ),
        request: new Request(
          `http://localhost/workspaces/kimodo/embed?format=json&projectId=${projectId}&sceneId=${sceneId}&shotId=${shotId}&characterId=${seeded.characterId}`
        )
      } as never);

      expect(response.status).toBe(200);
      const payload = (await response.json()) as {
        accepted: boolean;
        status: string;
        contextPath: string;
        context: { sceneId: string; shotId: string };
      };
      expect(payload.accepted).toBe(true);
      expect(payload.status).toBe('ready');
      expect(payload.context.sceneId).toBe(sceneId);
      expect(payload.context.shotId).toBe(shotId);
      expect(payload.contextPath).toContain('/kimodo-embed-context.json');
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });
});
