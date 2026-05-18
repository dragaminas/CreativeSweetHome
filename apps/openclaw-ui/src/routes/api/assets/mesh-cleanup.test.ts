import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { startMeshCleanupRunMock } = vi.hoisted(() => ({
  startMeshCleanupRunMock: vi.fn()
}));

vi.mock('$lib/server/runner-bridge', () => ({
  startAssetReferenceRun: vi.fn(),
  startAsset3dRun: vi.fn(),
  startMeshCleanupRun: startMeshCleanupRunMock
}));

import { GET, POST } from './+server';

describe('mesh cleanup route', () => {
  beforeEach(() => {
    startMeshCleanupRunMock.mockReset();
  });

  it('handles mesh_cleanup by reusing blender cleanup_pre_rig_humanoid and marks asset as rig-ready', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-mesh-cleanup-route-'));
    process.env.STUDIO_DIR = tempStudioDir;

    const projectId = 'pilot-feature';
    const sceneId = 'opening-alley';

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

      const candidatePath = path.join(
        tempStudioDir,
        'Assets3D',
        projectId,
        createPayload.assetId,
        'comfyui',
        'output',
        `${createPayload.assetId}__mesh_candidate__v001.glb`
      );
      await fs.mkdir(path.dirname(candidatePath), { recursive: true });
      await fs.writeFile(candidatePath, 'mesh-candidate', 'utf8');

      startMeshCleanupRunMock.mockResolvedValue({
        runner_id: 'blender',
        operation_kind: 'operate',
        target_id: 'cleanup_pre_rig_humanoid',
        run_id: 'cleanup-20260518-190000',
        accepted: true,
        status: 'pass',
        message: 'Cleanup pre-rig completado con Blender y remesh publicado con Instant Meshes.',
        artifact_refs: [
          `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/cleanup/cleanup-20260518-190000/input/${createPayload.assetId}__source__v001.glb`,
          `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/cleanup/cleanup-20260518-190000/output/${createPayload.assetId}__cleaned__v001.glb`,
          `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/cleanup/cleanup-20260518-190000/output/${createPayload.assetId}__remeshed__v001.obj`,
          `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/cleanup/cleanup-20260518-190000/cleanup-report.md`
        ],
        manifest_path: `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/cleanup/cleanup-20260518-190000/manifests/run.json`,
        summary_path: `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/cleanup/cleanup-20260518-190000/manifests/summary.json`,
        evidence_path: `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/cleanup/cleanup-20260518-190000/cleanup-report.md`,
        progress_events: [
          { step_id: 'blender', state: 'done', message: 'Cleanup Blender finalizado.' },
          { step_id: 'instant_meshes', state: 'done', message: 'Remesh publicado.' }
        ],
        warnings: [],
        command_logs: []
      });

      const cleanupResponse = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'mesh_cleanup',
            projectId,
            sceneId,
            kind: 'character',
            assetId: createPayload.assetId,
            mode: 'auto'
          })
        })
      } as never);

      expect(cleanupResponse.status).toBe(200);
      const cleanupPayload = (await cleanupResponse.json()) as {
        accepted: boolean;
        status: string;
        run: { target_id: string };
      };
      expect(cleanupPayload.accepted).toBe(true);
      expect(cleanupPayload.status).toBe('pass');
      expect(cleanupPayload.run.target_id).toBe('cleanup_pre_rig_humanoid');
      expect(startMeshCleanupRunMock).toHaveBeenCalledTimes(1);
      expect(startMeshCleanupRunMock.mock.calls[0]?.[0]).toMatchObject({
        projectId,
        sceneId,
        assetId: createPayload.assetId,
        sourceModelPath: candidatePath,
        mode: 'auto'
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

  it('rejects mesh_cleanup when source_model_path cannot be resolved', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'openclaw-mesh-cleanup-route-missing-source-')
    );
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
            description: 'Piloto principal de la escena.'
          })
        })
      } as never);
      expect(createResponse.status).toBe(201);
      const createPayload = (await createResponse.json()) as { assetId: string };

      const response = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'mesh_cleanup',
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            kind: 'character',
            assetId: createPayload.assetId
          })
        })
      } as never);

      expect(response.status).toBe(400);
      const payload = (await response.json()) as { status: string; message: string };
      expect(payload.status).toBe('fail_compile');
      expect(payload.message).toContain('source_model_path');
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });
});
