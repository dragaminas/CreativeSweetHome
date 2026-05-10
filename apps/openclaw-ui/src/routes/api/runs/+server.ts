import type { RequestHandler } from './$types';

import { json } from '@sveltejs/kit';

import { asNullableString, asRecord, asString } from '$lib/server/http';
import { startRun } from '$lib/server/runner-bridge';

export const POST: RequestHandler = async ({ request }) => {
  const payload = asRecord(await request.json());
  const runnerId = asString(payload.runner_id);
  const operationKind = asString(payload.operation_kind);

  if (!runnerId || !operationKind) {
    return json(
      {
        accepted: false,
        status: 'fail_compile',
        message: 'runner_id y operation_kind son obligatorios.'
      },
      { status: 400 }
    );
  }

  const response = await startRun({
    runner_id: runnerId,
    operation_kind: operationKind,
    target_id: asNullableString(payload.target_id),
    requested_by: asString(payload.requested_by, 'openclaw-ui'),
    channel: asString(payload.channel, 'web-ui'),
    run_id: asString(payload.run_id),
    inputs: asRecord(payload.inputs),
    options: asRecord(payload.options)
  });

  return json(response);
};
