import { describe, expect, it } from 'vitest';

import { buildAssetReferenceBriefText, buildSharedBrief } from './brief-translator';

describe('buildSharedBrief', () => {
  it('creates translations for all planned consumers', () => {
    const brief = buildSharedBrief({
      projectId: 'demo',
      workspaceId: 'scene',
      intent: 'Definir apertura de la escena',
      narrative:
        'Una violinista cruza un teatro vacio con un foco cenital y un tono de suspenso elegante.',
      constraints: ['clip breve', 'continuidad del vestuario'],
      references: ['concept art del teatro']
    });

    expect(brief.briefId).toBe('demo:scene');
    expect(brief.consumerBriefs.map((entry) => entry.consumerId)).toEqual([
      'comfyui',
      'kimodo',
      'blender',
      'davinci-resolve'
    ]);
    expect(brief.extractedKeywords).toContain('violinista');
    expect(brief.checkpointLabels).toContain('canonical runner handoff ready');
  });

  it('builds a backend-ready brief text for asset reference generation', () => {
    const text = buildAssetReferenceBriefText({
      projectId: 'pilot-project',
      sceneId: 'opening-alley',
      assetKind: 'character',
      assetId: 'chr-001',
      assetLabel: 'Nora',
      assetDescription: 'Piloto principal de la escena.',
      brief: 'Retrato nocturno con neones y lluvia.',
      references: ['turnaround frontal', 'moodboard lluvia'],
      notes: 'Mantener continuidad visual.'
    });

    expect(text).toContain('project_id: pilot-project');
    expect(text).toContain('scene_id: opening-alley');
    expect(text).toContain('asset_kind: character');
    expect(text).toContain('asset_id: chr-001');
    expect(text).toContain('asset_label: Nora');
    expect(text).toContain('asset_description: Piloto principal de la escena.');
    expect(text).toContain('creative_brief: Retrato nocturno con neones y lluvia.');
    expect(text).toContain('existing_references: turnaround frontal | moodboard lluvia');
    expect(text).toContain('notes: Mantener continuidad visual.');
  });
});
