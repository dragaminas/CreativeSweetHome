import type { RequestHandler } from './$types';

import { json } from '@sveltejs/kit';

import { asRecord, asString } from '$lib/server/http';
import { createSceneStorageScaffold } from '$lib/server/scene-storage';

export const POST: RequestHandler = async ({ request }) => {
  const body = asRecord(await request.json());

  const projectId = asString(body.projectId);
  const sceneId = asString(body.sceneId);
  const initialShotId = asString(body.initialShotId, 'sh010');

  if (!projectId || !sceneId) {
    return json(
      {
        accepted: false,
        status: 'fail_compile',
        message: 'projectId y sceneId son obligatorios para crear el scene scaffold.'
      },
      { status: 400 }
    );
  }

  try {
    const scaffold = await createSceneStorageScaffold({
      projectId,
      sceneId,
      initialShotId
    });

    if (scaffold.status === 'missing_prerequisites') {
      return json(
        {
          accepted: false,
          status: scaffold.status,
          message: scaffold.message,
          scaffold
        },
        { status: 409 }
      );
    }

    if (scaffold.status === 'collision') {
      return json(
        {
          accepted: false,
          status: scaffold.status,
          message: scaffold.message,
          scaffold
        },
        { status: 409 }
      );
    }

    return json({
      accepted: true,
      status: scaffold.status,
      message: scaffold.message,
      scaffold
    });
  } catch (error) {
    return json(
      {
        accepted: false,
        status: 'fail_runtime',
        message:
          error instanceof Error
            ? `No fue posible crear el scene scaffold: ${error.message}`
            : 'No fue posible crear el scene scaffold.'
      },
      { status: 500 }
    );
  }
};
