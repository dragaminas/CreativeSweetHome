import type { PageServerLoad } from './$types';

import { listAssets, getAssetReadiness } from '$lib/server/asset-catalog';
import type { ListAssetsResult } from '$lib/server/asset-catalog';

function searchParam(url: string, key: string): string {
  return new URL(url, 'http://localhost').searchParams.get(key) ?? '';
}

function resolveDefaultScene(
  projectNavigation: { projectNavigation?: Array<{ elementUrl: string; scenesNavigation?: Array<{ elementUrl: string }> }> } | undefined
): { projectId: string; sceneId: string } {
  const projects = projectNavigation?.projectNavigation || [];
  const firstProject = projects[0];
  const firstScene = firstProject?.scenesNavigation?.[0];

  const projectId = searchParam(firstProject?.elementUrl || '', 'projectId') || 'default';
  const sceneId = searchParam(firstScene?.elementUrl || '', 'sceneId') || 'scene-draft';

  return { projectId, sceneId };
}

export const load: PageServerLoad = async ({ parent }) => {
  const parentData = await parent();
  const { projectId, sceneId } = resolveDefaultScene(parentData.projectNavigation);

  let assetCatalog: ListAssetsResult = {
    status: 'empty',
    message: 'No catalog found.',
    projectId,
    sceneId,
    total: 0,
    assets: []
  };

  let assetReadiness = null;

  try {
    assetCatalog = await listAssets({ projectId, sceneId });
  } catch {
    // Silently fail - catalog will show empty
  }

  try {
    assetReadiness = await getAssetReadiness(projectId, sceneId);
  } catch {
    assetReadiness = null;
  }

  return {
    projectId,
    sceneId,
    assetCatalog,
    assetReadiness
  };
};
