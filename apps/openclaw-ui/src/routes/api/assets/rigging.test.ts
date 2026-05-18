import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { startRiggingRunMock } = vi.hoisted(() => ({
  startRiggingRunMock: vi.fn()
}));

vi.mock('$lib/server/runner-bridge', () => ({
  startAssetReferenceRun: vi.fn(),
  startAsset3dRun: vi.fn(),
  startMeshCleanupRun: vi.fn(),
  startRiggingRun: startRiggingRunMock
}));

import { GET, POST } from './+server';

describe('rigging route', () => {
  beforeEach(() => {
    startRiggingRunMock.mockReset();
  });

  it('handles create_rig_humanoid by reusing blender operate and preserves canonical model_3d stage', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-rigging-route-'));
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

      const preparedModelPath = path.join(
        tempStudioDir,
        'Assets3D',
        projectId,
        createPayload.assetId,
        'cleanup',
        'cleanup-20260518-190000',
        'output',
        `${createPayload.assetId}__remeshed__v001.obj`
      );
      await fs.mkdir(path.dirname(preparedModelPath), { recursive: true });
      await fs.writeFile(
        preparedModelPath,
        ['o Triangle', 'v 0.0 0.0 0.0', 'v 1.0 0.0 0.0', 'v 0.0 1.0 0.0', 'f 1 2 3'].join('\n'),
        'utf8'
      );

      startRiggingRunMock.mockResolvedValue({
        runner_id: 'blender',
        operation_kind: 'operate',
        target_id: 'create_rig_humanoid',
        run_id: 'rigging-20260518-191500',
        accepted: true,
        status: 'pass',
        message: 'Rigging completado con Rigify y export listo para benchmark.',
        artifact_refs: [
          `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/rigging/rigging-20260518-191500/output/${createPayload.assetId}__rigged__v001.glb`,
          `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/rigging/rigging-20260518-191500/output/${createPayload.assetId}__rigged__v001.fbx`,
          `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/rigging/rigging-20260518-191500/rigging-report.md`
        ],
        manifest_path: `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/rigging/rigging-20260518-191500/manifests/run.json`,
        summary_path: `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/rigging/rigging-20260518-191500/manifests/summary.json`,
        evidence_path: `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/rigging/rigging-20260518-191500/rigging-report.md`,
        rigging_report_path: `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/rigging/rigging-20260518-191500/rigging-report.md`,
        prepared_model_path: preparedModelPath,
        rigged_glb_path: `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/rigging/rigging-20260518-191500/output/${createPayload.assetId}__rigged__v001.glb`,
        rigged_fbx_path: `${tempStudioDir}/Assets3D/${projectId}/${createPayload.assetId}/rigging/rigging-20260518-191500/output/${createPayload.assetId}__rigged__v001.fbx`,
        validation_artifact_paths: [],
        progress_events: [{ step_id: 'rigify-generate-rig', state: 'done', message: 'Rig generado.' }],
        warnings: [],
        command_logs: []
      });

      const riggingResponse = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create_rig_humanoid',
            projectId,
            sceneId,
            kind: 'character',
            assetId: createPayload.assetId,
            mode: 'auto'
          })
        })
      } as never);

      expect(riggingResponse.status).toBe(200);
      const riggingPayload = (await riggingResponse.json()) as {
        accepted: boolean;
        status: string;
        run: { target_id: string };
      };
      expect(riggingPayload.accepted).toBe(true);
      expect(riggingPayload.status).toBe('pass');
      expect(riggingPayload.run.target_id).toBe('create_rig_humanoid');
      expect(startRiggingRunMock).toHaveBeenCalledTimes(1);
      expect(startRiggingRunMock.mock.calls[0]?.[0]).toMatchObject({
        projectId,
        sceneId,
        assetId: createPayload.assetId,
        preparedModelPath,
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

  it('rejects create_rig_humanoid when prepared_model_path cannot be resolved from cleanup handoff', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-rigging-route-missing-source-'));
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
            action: 'create_rig_humanoid',
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
      expect(payload.message).toContain('prepared_model_path');
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });
});
