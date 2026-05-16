import { SHELL_PREVIEW_INPUT, buildSharedBrief } from '$lib/server/brief-translator';
import { loadOpenClawProjectSnapshots } from '$lib/server/openclaw-projects';

export async function load() {
  const projectLoad = await loadOpenClawProjectSnapshots({
    seedIfMissing: process.env.NODE_ENV !== 'production'
  });

  return {
    briefPreview: buildSharedBrief(SHELL_PREVIEW_INPUT),
    projectSnapshots: projectLoad.snapshots,
    projectWarnings: projectLoad.warnings
  };
}
