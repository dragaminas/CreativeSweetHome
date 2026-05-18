import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { startRunMock } = vi.hoisted(() => ({ startRunMock: vi.fn() }));

vi.mock('$lib/server/runner-bridge', () => ({
  startAssetReferenceRun: startRunMock,
  startAsset3dRun: vi.fn()
}));

import { DELETE, GET, POST } from './+server';

describe('asset catalog route', () => {
  beforeEach(() => {
    startRunMock.mockReset();
  });

  it('keeps tags and references when update omits those fields', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-assets-route-update-'));
    process.env.STUDIO_DIR = tempStudioDir;

    try {
      const createResponse = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            kind: 'character',
            label: 'Nora',
            tags: ['lead'],
            references: ['turnaround-nora']
          })
        })
      } as never);

      expect(createResponse.status).toBe(201);

      const createPayload = (await createResponse.json()) as {
        accepted: boolean;
        assetId: string;
      };

      expect(createPayload.accepted).toBe(true);

      const updateResponse = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            kind: 'character',
            assetId: createPayload.assetId,
            stageState: 'ready'
          })
        })
      } as never);

      expect(updateResponse.status).toBe(200);

      const listResponse = await GET({
        url: new URL(
          'http://localhost/api/assets?projectId=pilot-feature&sceneId=opening-alley&kind=character'
        )
      } as never);

      expect(listResponse.status).toBe(200);

      const listPayload = (await listResponse.json()) as {
        total: number;
        assets: Array<{ tags: string[]; references: string[] }>;
      };

      expect(listPayload.total).toBe(1);
      expect(listPayload.assets[0]?.tags).toEqual(['lead']);
      expect(listPayload.assets[0]?.references).toEqual(['turnaround-nora']);
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });

  it('lists characters and objects together when kind filter is absent', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-assets-route-list-all-'));
    process.env.STUDIO_DIR = tempStudioDir;

    try {
      const createCharacter = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            kind: 'character',
            label: 'Nora'
          })
        })
      } as never);
      expect(createCharacter.status).toBe(201);

      const createObject = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            kind: 'object',
            label: 'Dron'
          })
        })
      } as never);
      expect(createObject.status).toBe(201);

      const listResponse = await GET({
        url: new URL('http://localhost/api/assets?projectId=pilot-feature&sceneId=opening-alley')
      } as never);

      expect(listResponse.status).toBe(200);

      const listPayload = (await listResponse.json()) as {
        total: number;
        assets: Array<{ kind: string; label: string }>;
      };

      expect(listPayload.total).toBe(2);
      expect(listPayload.assets.map((asset) => `${asset.kind}:${asset.label}`)).toEqual(
        expect.arrayContaining(['character:Nora', 'object:Dron'])
      );
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });

  it('does not reuse deleted asset ids', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-assets-route-id-'));
    process.env.STUDIO_DIR = tempStudioDir;

    try {
      const createFirst = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            kind: 'character',
            label: 'Nora'
          })
        })
      } as never);
      const firstPayload = (await createFirst.json()) as { assetId: string };

      const createSecond = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            kind: 'character',
            label: 'Dax'
          })
        })
      } as never);
      const secondPayload = (await createSecond.json()) as { assetId: string };

      expect(firstPayload.assetId).toBe('chr-001');
      expect(secondPayload.assetId).toBe('chr-002');

      const deleteResponse = await DELETE({
        url: new URL(
          `http://localhost/api/assets?projectId=pilot-feature&sceneId=opening-alley&kind=character&assetId=${firstPayload.assetId}`
        ),
        request: new Request('http://localhost/api/assets', { method: 'DELETE' })
      } as never);

      expect(deleteResponse.status).toBe(200);

      const createThird = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            kind: 'character',
            label: 'Ivo'
          })
        })
      } as never);

      expect(createThird.status).toBe(201);

      const thirdPayload = (await createThird.json()) as { assetId: string };
      expect(thirdPayload.assetId).toBe('chr-003');
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });

  it('keeps scene relation index synced in assets.json after create/delete', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-assets-route-rel-'));
    process.env.STUDIO_DIR = tempStudioDir;

    const projectId = 'pilot-feature';
    const sceneId = 'opening-alley';
    const assetsIndexPath = path.join(
      tempStudioDir,
      'Scenes',
      projectId,
      sceneId,
      'manifests',
      'assets.json'
    );

    try {
      await fs.mkdir(path.dirname(assetsIndexPath), { recursive: true });
      await fs.writeFile(
        assetsIndexPath,
        `${JSON.stringify(
          {
            schemaVersion: 2,
            projectId,
            sceneId,
            shotOrder: ['sh010'],
            assetOrder: {
              characters: [],
              objects: [],
              locations: []
            },
            shots: {
              sh010: {
                assetIds: [],
                locationIds: []
              }
            },
            assets: {}
          },
          null,
          2
        )}\n`,
        'utf8'
      );

      const createResponse = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId,
            sceneId,
            kind: 'character',
            label: 'Nora'
          })
        })
      } as never);

      expect(createResponse.status).toBe(201);
      const createPayload = (await createResponse.json()) as { assetId: string };

      const relationAfterCreate = JSON.parse(await fs.readFile(assetsIndexPath, 'utf8')) as {
        assetOrder: { characters: string[] };
        assets: Record<string, { kind: string; sceneIds: string[]; shotIds: string[] }>;
      };
      expect(relationAfterCreate.assetOrder.characters).toContain(createPayload.assetId);
      expect(relationAfterCreate.assets[createPayload.assetId]).toMatchObject({
        kind: 'character',
        sceneIds: [sceneId]
      });

      const deleteResponse = await DELETE({
        url: new URL(
          `http://localhost/api/assets?projectId=${projectId}&sceneId=${sceneId}&kind=character&assetId=${createPayload.assetId}`
        ),
        request: new Request('http://localhost/api/assets', { method: 'DELETE' })
      } as never);
      expect(deleteResponse.status).toBe(200);

      const relationAfterDelete = JSON.parse(await fs.readFile(assetsIndexPath, 'utf8')) as {
        assetOrder: { characters: string[] };
        assets: Record<string, unknown>;
      };
      expect(relationAfterDelete.assetOrder.characters).not.toContain(createPayload.assetId);
      expect(relationAfterDelete.assets[createPayload.assetId]).toBeUndefined();
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });

  it('starts canonical comfyui operate run for reference_generate and updates stage state', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-assets-route-ref-generate-'));
    process.env.STUDIO_DIR = tempStudioDir;

    const projectId = 'pilot-feature';
    const sceneId = 'opening-alley';

    startRunMock.mockResolvedValue({
      runner_id: 'comfyui',
      operation_kind: 'operate',
      target_id: 'asset-reference-generate',
      run_id: 'operate-20260517-123000',
      accepted: true,
      status: 'soft_pass_with_fallback',
      message: 'Solicitud registrada para generar referencias.',
      artifact_refs: [
        `${tempStudioDir}/Scenes/${projectId}/${sceneId}/assets/characters/chr-001/references/requests/operate-20260517-123000__request.json`
      ],
      manifest_path: `${tempStudioDir}/Validation/comfyui/operate/operate-20260517-123000/manifests/run.json`,
      summary_path: `${tempStudioDir}/Validation/comfyui/operate/operate-20260517-123000/manifests/summary.json`,
      evidence_path: `${tempStudioDir}/Validation/comfyui/operate/operate-20260517-123000/evidence/summary.md`,
      progress_events: [
        {
          step_id: 'request-accepted',
          state: 'done',
          message: 'Run accepted.'
        }
      ],
      metadata: {
        progress_events: [
          {
            step_id: 'request-accepted',
            state: 'done',
            message: 'Run accepted.'
          }
        ]
      }
    });

    try {
      const createResponse = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId,
            sceneId,
            kind: 'character',
            label: 'Nora',
            description: 'Piloto principal de la escena.'
          })
        })
      } as never);
      expect(createResponse.status).toBe(201);
      const createPayload = (await createResponse.json()) as { assetId: string };

      const generateResponse = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'reference_generate',
            projectId,
            sceneId,
            kind: 'character',
            assetId: createPayload.assetId,
            brief: 'Retrato nocturno con lluvia y neon.',
            presetId: 'uc-img-02-frame-baseline-preview'
          })
        })
      } as never);

      expect(generateResponse.status).toBe(200);
      const generatePayload = (await generateResponse.json()) as {
        accepted: boolean;
        status: string;
        run: { run_id: string; target_id: string; progress_events: Array<{ step_id: string }> };
      };
      expect(generatePayload.accepted).toBe(true);
      expect(generatePayload.status).toBe('soft_pass_with_fallback');
      expect(generatePayload.run.run_id).toBe('operate-20260517-123000');
      expect(generatePayload.run.target_id).toBe('asset-reference-generate');
      expect(generatePayload.run.progress_events[0]?.step_id).toBe('request-accepted');
      expect(startRunMock).toHaveBeenCalledTimes(1);
      expect(startRunMock.mock.calls[0]?.[0]).toMatchObject({
        mode: 'generate',
        projectId,
        sceneId,
        assetKind: 'character',
        assetId: createPayload.assetId,
        presetId: 'uc-img-02-frame-baseline-preview'
      });

      const listResponse = await GET({
        url: new URL(
          `http://localhost/api/assets?projectId=${projectId}&sceneId=${sceneId}&kind=character`
        )
      } as never);
      expect(listResponse.status).toBe(200);
      const listPayload = (await listResponse.json()) as {
        assets: Array<{ assetId: string; stage: string; stageState: string }>;
      };
      const asset = listPayload.assets.find((entry) => entry.assetId === createPayload.assetId);
      expect(asset?.stage).toBe('reference_image');
      expect(asset?.stageState).toBe('in_progress');
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });

  it('rejects reference_import without source paths', async () => {
    const response = await POST({
      request: new Request('http://localhost/api/assets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'reference_import',
          projectId: 'pilot-feature',
          sceneId: 'opening-alley',
          kind: 'character',
          assetId: 'chr-001',
          referenceSourcePaths: []
        })
      })
    } as never);

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { status: string; message: string };
    expect(payload.status).toBe('fail_compile');
    expect(payload.message).toContain('reference_source_paths');
  });
});
