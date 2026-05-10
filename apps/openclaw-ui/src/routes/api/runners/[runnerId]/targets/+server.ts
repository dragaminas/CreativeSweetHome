import type { RequestHandler } from './$types';

import { json } from '@sveltejs/kit';

import { listRunnerTargets } from '$lib/server/runner-bridge';

export const GET: RequestHandler = async ({ params, url }) => {
  const operationKind = url.searchParams.get('operation_kind');

  if (!operationKind) {
    return json(
      {
        accepted: false,
        status: 'fail_compile',
        message: 'operation_kind es requerido.'
      },
      { status: 400 }
    );
  }

  const targets = await listRunnerTargets(params.runnerId, operationKind);
  return json({
    runner_id: params.runnerId,
    operation_kind: operationKind,
    targets
  });
};
