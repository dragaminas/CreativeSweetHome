import type { RequestHandler } from './$types';

import { json } from '@sveltejs/kit';

import { getRunResult, getRunStatus } from '$lib/server/runner-bridge';

export const GET: RequestHandler = async ({ params, url }) => {
  const view = url.searchParams.get('view') || 'status';

  if (view === 'result') {
    return json(await getRunResult(params.runnerId, params.runId));
  }

  return json(await getRunStatus(params.runnerId, params.runId));
};
