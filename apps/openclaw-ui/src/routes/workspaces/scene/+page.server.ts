import { SHELL_PREVIEW_INPUT, buildSharedBrief } from '$lib/server/brief-translator';

export function load() {
  return {
    briefPreview: buildSharedBrief(SHELL_PREVIEW_INPUT)
  };
}
