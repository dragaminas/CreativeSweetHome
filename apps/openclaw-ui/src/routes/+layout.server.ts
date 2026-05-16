import { buildNavigationPanelFromSnapshots } from '$lib/navigation/project-editor-route-data';
import { loadOpenClawProjectSnapshots } from '$lib/server/openclaw-projects';
import { loadRunnerCatalog } from '$lib/server/runner-bridge';
import { buildProductShell } from '$lib/server/product-shell';
import { loadStudioState } from '$lib/server/studio-state';

export async function load() {
  const [runnerCatalog, studio, projectLoad] = await Promise.all([
    loadRunnerCatalog(),
    loadStudioState(),
    loadOpenClawProjectSnapshots({ seedIfMissing: process.env.NODE_ENV !== 'production' })
  ]);

  return {
    runnerCatalog,
    shell: buildProductShell(runnerCatalog.runners),
    studio,
    projectNavigation: buildNavigationPanelFromSnapshots(projectLoad.snapshots),
    projectWarnings: projectLoad.warnings
  };
}
