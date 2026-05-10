import { describe, expect, it } from 'vitest';

import { buildSharedBrief } from './brief-translator';

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
});
