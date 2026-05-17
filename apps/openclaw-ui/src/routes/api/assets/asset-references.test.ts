import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { startRunMock } = vi.hoisted(() => ({ startRunMock: vi.fn() }));

vi.mock('$lib/server/runner-bridge', () => ({
  startAssetReferenceRun: startRunMock
}));

import { GET, POST } from './+server';

describe('asset references route', () => {
  beforeEach(() => {
    startRunMock.mockReset();
  });

  it('handles reference_generate through comfyui operate and moves asset to reference_image stage', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-asset-references-route-'));
    process.env.STUDIO_DIR = tempStudioDir;

    const projectId = 'pilot-feature';
    const sceneId = 'opening-alley';

    startRunMock.mockResolvedValue({
      runner_id: 'comfyui',
      operation_kind: 'operate',
      target_id: 'asset-reference-generate',
      run_id: 'operate-20260517-130000',
      accepted: true,
      status: 'soft_pass_with_fallback',
      message: 'Solicitud registrada para generar referencias.',
      artifact_refs: [
        `${tempStudioDir}/Scenes/${projectId}/${sceneId}/assets/characters/chr-001/references/requests/operate-20260517-130000__request.json`
      ],
      manifest_path: `${tempStudioDir}/Validation/comfyui/operate/operate-20260517-130000/manifests/run.json`,
      summary_path: `${tempStudioDir}/Validation/comfyui/operate/operate-20260517-130000/manifests/summary.json`,
      evidence_path: `${tempStudioDir}/Validation/comfyui/operate/operate-20260517-130000/evidence/summary.md`,
      progress_events: [{ step_id: 'request-accepted', state: 'done', message: 'Run accepted.' }]
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
});
