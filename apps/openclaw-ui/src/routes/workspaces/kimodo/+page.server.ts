import { loadKimodoEmbedSeam } from '$lib/server/kimodo-embed';

export function load() {
  return {
    embed: loadKimodoEmbedSeam()
  };
}
