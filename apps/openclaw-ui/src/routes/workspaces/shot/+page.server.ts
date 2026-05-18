import type { PageServerLoad } from './$types';

function searchParam(url: string, key: string): string {
  return new URL(url, 'http://localhost').searchParams.get(key) ?? '';
}

function resolveDefaultShot(
  projectNavigation:
    | {
        projectNavigation?: Array<{
          elementUrl: string;
          scenesNavigation?: Array<{ elementUrl: string; shotsNavigation?: Array<{ elementUrl: string }> }>;
        }>;
      }
    | undefined
): { projectId: string; sceneId: string; shotId: string } {
  const projects = projectNavigation?.projectNavigation || [];
  const firstProject = projects[0];
  const firstScene = firstProject?.scenesNavigation?.[0];
  const firstShot = firstScene?.shotsNavigation?.[0];

  const projectId = searchParam(firstProject?.elementUrl || '', 'projectId') || 'default';
  const sceneId = searchParam(firstScene?.elementUrl || '', 'sceneId') || 'scene-draft';
  const shotId = searchParam(firstShot?.elementUrl || '', 'shotId') || 'sh010';

  return { projectId, sceneId, shotId };
}

export const load: PageServerLoad = async ({ parent }) => {
  const parentData = await parent();
  const defaults = resolveDefaultShot(parentData.projectNavigation);

  return {
    shotFormDefaults: {
      projectId: defaults.projectId,
      sceneId: defaults.sceneId,
      shotId: defaults.shotId,
      intent: '',
      framing: '',
      durationMs: '4200',
      narrative: '',
      characters: '',
      constraints: '',
      references: ''
    }
  };
};
