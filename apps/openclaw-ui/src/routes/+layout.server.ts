import { loadRunnerCatalog } from '$lib/server/runner-bridge';
import { buildProductShell } from '$lib/server/product-shell';
import { loadStudioState } from '$lib/server/studio-state';

export async function load() {
  const [runnerCatalog, studio] = await Promise.all([
    loadRunnerCatalog(),
    loadStudioState()
  ]);

  return {
    runnerCatalog,
    shell: buildProductShell(runnerCatalog.runners),
    studio
  };
}
