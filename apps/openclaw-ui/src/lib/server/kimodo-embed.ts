import path from 'node:path';

import type { EmbedWorkspaceSeam } from '$lib/types/product';
import { resolveRepoContext } from './env';

export function loadKimodoEmbedSeam(): EmbedWorkspaceSeam {
  const context = resolveRepoContext();
  const upstreamUrl = process.env.OPENCLAW_KIMODO_EMBED_URL?.trim() || null;

  return {
    workspaceId: 'kimodo',
    sameOriginPath: '/workspaces/kimodo/embed',
    outputRoot: path.join(context.studioDir, 'Animations'),
    upstreamUrl,
    contextKeys: [
      'scene_id',
      'shot_id',
      'character_id',
      'asset_state',
      'output_root'
    ],
    notes: [
      'La ruta same-origin ya existe dentro del producto.',
      'Phase 24 podra reemplazar esta reserva por proxy o embed real sin cambiar la navegacion.'
    ],
    stateLabel: upstreamUrl ? 'Upstream configured' : 'Proxy reserved',
    stateTone: upstreamUrl ? 'positive' : 'info'
  };
}
