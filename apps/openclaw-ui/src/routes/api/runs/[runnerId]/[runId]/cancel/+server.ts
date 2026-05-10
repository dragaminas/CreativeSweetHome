import type { RequestHandler } from './$types';

import { json } from '@sveltejs/kit';

import { asRecord, asString } from '$lib/server/http';
import { cancelRun } from '$lib/server/runner-bridge';

export const POST: RequestHandler = async ({ params, request }) => {
  const payload = asRecord(await request.json());

  return json(
    await cancelRun(
      params.runnerId,
      params.runId,
      asString(payload.requested_by, 'openclaw-ui'),
      asString(payload.channel, 'web-ui')
    )
  );
};
