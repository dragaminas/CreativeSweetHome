import type { RequestHandler } from './$types';

import { json } from '@sveltejs/kit';

import { loadRunnerCatalog } from '$lib/server/runner-bridge';

export const GET: RequestHandler = async () => {
  const catalog = await loadRunnerCatalog();
  return json(catalog);
};
