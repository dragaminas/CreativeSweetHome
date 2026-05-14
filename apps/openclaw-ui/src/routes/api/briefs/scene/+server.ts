import type { RequestHandler } from './$types';

import { json } from '@sveltejs/kit';

import { asRecord, asString } from '$lib/server/http';
import { parseSceneList, persistSceneBrief } from '$lib/server/scene-brief';

function hasAnySignal(payload: {
  intent: string;
  tone: string;
  narrative: string;
  characters: string[];
  objects: string[];
  constraints: string[];
}): boolean {
  return Boolean(
    payload.intent ||
      payload.tone ||
      payload.narrative ||
      payload.characters.length ||
      payload.objects.length ||
      payload.constraints.length
  );
}

function statusMessage(status: 'accepted' | 'incomplete' | 'ambiguous'): string {
  if (status === 'accepted') {
    return 'Scene brief accepted y listo para los siguientes handoffs.';
  }

  if (status === 'ambiguous') {
    return 'Scene brief ambiguous: refina tono, intencion o constraints para mayor claridad.';
  }

  return 'Scene brief incomplete: faltan campos guiados requeridos.';
}

export const POST: RequestHandler = async ({ request }) => {
  const body = asRecord(await request.json());

  const intent = asString(body.intent);
  const tone = asString(body.tone);
  const narrative = asString(body.narrative);
  const characters = parseSceneList(body.characters);
  const objects = parseSceneList(body.objects);
  const constraints = parseSceneList(body.constraints);
  const references = parseSceneList(body.references);

  if (
    !hasAnySignal({
      intent,
      tone,
      narrative,
      characters,
      objects,
      constraints
    })
  ) {
    return json(
      {
        accepted: false,
        status: 'fail_compile',
        message:
          'Es obligatorio enviar al menos un campo guiado del scene brief (intent, tone, narrative, characters, objects o constraints).'
      },
      { status: 400 }
    );
  }

  try {
    const persisted = await persistSceneBrief({
      projectId: asString(body.projectId, 'default'),
      sceneId: asString(body.sceneId),
      intent,
      tone,
      narrative,
      characters,
      objects,
      constraints,
      references
    });

    const status = persisted.artifact.checkpoint.status;

    return json({
      accepted: status === 'accepted',
      status,
      message: statusMessage(status),
      artifact: persisted.artifact,
      filePath: persisted.filePath
    });
  } catch (error) {
    return json(
      {
        accepted: false,
        status: 'fail_runtime',
        message:
          error instanceof Error
            ? `No fue posible persistir el scene brief: ${error.message}`
            : 'No fue posible persistir el scene brief.'
      },
      { status: 500 }
    );
  }
};
