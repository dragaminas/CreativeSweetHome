import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { startAsset3dRunMock } = vi.hoisted(() => ({ startAsset3dRunMock: vi.fn() }));

vi.mock('$lib/server/runner-bridge', () => ({
  startAssetReferenceRun: vi.fn(),
  startAsset3dRun: startAsset3dRunMock
}));

import { GET, POST } from './+server';

describe('asset 3d route', () => {
  beforeEach(() => {
    startAsset3dRunMock.mockReset();
  });

  it('handles asset_3d_import through comfyui operate and moves asset to model_3d stage', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-asset-3d-route-import-'));
    process.env.STUDIO_DIR = tempStudioDir;

    const projectId = 'pilot-feature';
    const sceneId = 'opening-alley';

    startAsset3dRunMock.mockResolvedValue({
      runner_id: 'comfyui',
      operation_kind: 'operate',
      target_id: 'asset-3d-import',
      run_id: 'operate-asset3d-import-20260517-130000',
      accepted: true,
      status: 'pass',
      message: 'Candidato 3D importado y publicado en Assets3D para handoff a Blender.',
      artifact_refs: [
        `${tempStudioDir}/Assets3D/${projectId}/chr-001/input/chr-001__source__001.glb`,
        `${tempStudioDir}/Assets3D/${projectId}/chr-001/comfyui/output/chr-001__mesh_candidate__v001.glb`,
        `${tempStudioDir}/Assets3D/${projectId}/chr-001/blender/imports/chr-001__mesh_candidate__v001.glb`
      ],
      manifest_path: `${tempStudioDir}/Validation/comfyui/operate/operate-asset3d-import-20260517-130000/manifests/run.json`,
      summary_path: `${tempStudioDir}/Validation/comfyui/operate/operate-asset3d-import-20260517-130000/manifests/summary.json`,
      evidence_path: `${tempStudioDir}/Validation/comfyui/operate/operate-asset3d-import-20260517-130000/evidence/summary.md`,
      progress_events: [{ step_id: 'publish-asset-3d-candidate', state: 'done', message: 'Candidato publicado.' }]
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

      const importResponse = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'asset_3d_import',
            projectId,
            sceneId,
            kind: 'character',
            assetId: createPayload.assetId,
            sourceModelPath: '/tmp/source-model.glb'
          })
        })
      } as never);

      expect(importResponse.status).toBe(200);
      const importPayload = (await importResponse.json()) as {
        accepted: boolean;
        status: string;
        run: { target_id: string };
      };
      expect(importPayload.accepted).toBe(true);
      expect(importPayload.status).toBe('pass');
      expect(importPayload.run.target_id).toBe('asset-3d-import');
      expect(startAsset3dRunMock).toHaveBeenCalledTimes(1);
      expect(startAsset3dRunMock.mock.calls[0]?.[0]).toMatchObject({
        mode: 'import',
        projectId,
        sceneId,
        assetKind: 'character',
        assetId: createPayload.assetId,
        sourceModelPath: '/tmp/source-model.glb'
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
      expect(asset?.stage).toBe('model_3d');
      expect(asset?.stageState).toBe('ready');
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });

  it('handles asset_3d_generate through comfyui operate and marks asset as in_progress for model_3d', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-asset-3d-route-generate-'));
    process.env.STUDIO_DIR = tempStudioDir;

    const projectId = 'pilot-feature';
    const sceneId = 'opening-alley';

    startAsset3dRunMock.mockResolvedValue({
      runner_id: 'comfyui',
      operation_kind: 'operate',
      target_id: 'asset-3d-generate',
      run_id: 'operate-asset3d-generate-20260517-130000',
      accepted: true,
      status: 'soft_pass_with_fallback',
      message: 'Solicitud de modelado 3D registrada.',
      artifact_refs: [
        `${tempStudioDir}/Assets3D/${projectId}/chr-001/comfyui/requests/operate-asset3d-generate-20260517-130000__request.json`
      ],
      manifest_path: `${tempStudioDir}/Validation/comfyui/operate/operate-asset3d-generate-20260517-130000/manifests/run.json`,
      summary_path: `${tempStudioDir}/Validation/comfyui/operate/operate-asset3d-generate-20260517-130000/manifests/summary.json`,
      evidence_path: `${tempStudioDir}/Validation/comfyui/operate/operate-asset3d-generate-20260517-130000/evidence/summary.md`,
      progress_events: [{ step_id: 'persist-asset-3d-request', state: 'done', message: 'Solicitud registrada.' }]
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
            action: 'asset_3d_generate',
            projectId,
            sceneId,
            kind: 'character',
            assetId: createPayload.assetId,
            brief: 'Personaje estilizado para modelado rapido con Trellis2.'
          })
        })
      } as never);

      expect(generateResponse.status).toBe(200);
      const generatePayload = (await generateResponse.json()) as {
        accepted: boolean;
        status: string;
        run: { target_id: string };
      };
      expect(generatePayload.accepted).toBe(true);
      expect(generatePayload.status).toBe('soft_pass_with_fallback');
      expect(generatePayload.run.target_id).toBe('asset-3d-generate');

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
      expect(asset?.stage).toBe('model_3d');
      expect(asset?.stageState).toBe('in_progress');
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });

  it('rejects asset_3d_import without source_model_path', async () => {
    const response = await POST({
      request: new Request('http://localhost/api/assets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'asset_3d_import',
          projectId: 'pilot-feature',
          sceneId: 'opening-alley',
          kind: 'character',
          assetId: 'chr-001'
        })
      })
    } as never);

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { status: string; message: string };
    expect(payload.status).toBe('fail_compile');
    expect(payload.message).toContain('source_model_path');
  });
});
