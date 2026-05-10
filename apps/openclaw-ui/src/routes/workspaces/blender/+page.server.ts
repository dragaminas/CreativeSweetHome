import { describeRunner, listRunnerTargets } from '$lib/server/runner-bridge';

export async function load() {
  const [runner, targets] = await Promise.allSettled([
    describeRunner('blender'),
    listRunnerTargets('blender', 'operate')
  ]);

  return {
    runner: runner.status === 'fulfilled' ? runner.value : null,
    targets: targets.status === 'fulfilled' ? targets.value : [],
    error:
      runner.status === 'rejected' || targets.status === 'rejected'
        ? 'No fue posible leer el runner canonico de Blender desde la UI.'
        : null
  };
}
