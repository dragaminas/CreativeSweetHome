import type { RequestHandler } from './$types';

import { json } from '@sveltejs/kit';

import { buildSharedBrief } from '$lib/server/brief-translator';
import { asRecord, asString, asStringArray } from '$lib/server/http';

export const POST: RequestHandler = async ({ request }) => {
  const payload = asRecord(await request.json());
  const intent = asString(payload.intent);
  const narrative = asString(payload.narrative);

  if (!intent || !narrative) {
    return json(
      {
        accepted: false,
        status: 'fail_compile',
        message: 'intent y narrative son obligatorios.'
      },
      { status: 400 }
    );
  }

  return json(
    buildSharedBrief({
      intent,
      narrative,
      constraints: asStringArray(payload.constraints),
      references: asStringArray(payload.references),
      projectId: asString(payload.projectId, 'default'),
      workspaceId: asString(payload.workspaceId, 'scene')
    })
  );
};
