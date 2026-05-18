import type { RequestHandler } from './$types';

import { json } from '@sveltejs/kit';

import { asRecord, asString } from '$lib/server/http';
import { parseShotList, persistShotBrief } from '$lib/server/shot-brief';

function statusMessage(status: 'accepted' | 'incomplete' | 'ambiguous'): string {
  if (status === 'accepted') {
    return 'Shot brief accepted y listo para animacion/composicion.';
  }

  if (status === 'ambiguous') {
    return 'Shot brief ambiguous: refina intencion, framing o constraints para mayor claridad.';
  }

  return 'Shot brief incomplete: faltan campos guiados requeridos.';
}

export const POST: RequestHandler = async ({ request }) => {
  const body = asRecord(await request.json());

  const projectId = asString(body.projectId, 'default');
  const sceneId = asString(body.sceneId);
  const shotId = asString(body.shotId, 'sh010');
  const intent = asString(body.intent);
  const framing = asString(body.framing);
  const durationSource = body.durationMs;
  const durationMs =
    typeof durationSource === 'number'
      ? Math.round(durationSource)
      : Number.parseInt(asString(durationSource), 10);

  if (!sceneId || !shotId || !intent || !framing || !Number.isFinite(durationMs) || durationMs <= 0) {
    return json(
      {
        accepted: false,
        status: 'fail_compile',
        message:
          'projectId, sceneId, shotId, intent, framing y durationMs (> 0) son obligatorios para crear un shot brief.'
      },
      { status: 400 }
    );
  }

  try {
    const persisted = await persistShotBrief({
      projectId,
      sceneId,
      shotId,
      intent,
      framing,
      durationMs,
      narrative: asString(body.narrative),
      characters: parseShotList(body.characters),
      constraints: parseShotList(body.constraints),
      references: parseShotList(body.references)
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
            ? `No fue posible persistir el shot brief: ${error.message}`
            : 'No fue posible persistir el shot brief.'
      },
      { status: 500 }
    );
  }
};
