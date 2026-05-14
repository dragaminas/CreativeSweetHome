import { SHELL_PREVIEW_INPUT, buildSharedBrief } from '$lib/server/brief-translator';

export function load() {
  return {
    briefPreview: buildSharedBrief(SHELL_PREVIEW_INPUT),
    sceneFormDefaults: {
      projectId: 'default',
      sceneId: '',
      intent: '',
      tone: '',
      narrative: '',
      characters: '',
      objects: '',
      constraints: '',
      references: ''
    }
  };
}
