import type { ProductShellModel, RunnerDescriptionRecord, WorkspaceDefinition } from '$lib/types/product';

function evidenceRootsFor(
  runnerIds: string[],
  runnerMap: Map<string, RunnerDescriptionRecord>
): string[] {
  return runnerIds
    .map((runnerId) => runnerMap.get(runnerId)?.default_evidence_root)
    .filter((value): value is string => Boolean(value));
}

export function buildWorkspaceCatalog(
  runnerCatalog: RunnerDescriptionRecord[]
): WorkspaceDefinition[] {
  const runnerMap = new Map(
    runnerCatalog.map((runner) => [runner.runner_id, runner] as const)
  );

  const workspaces: WorkspaceDefinition[] = [
    {
      id: 'scene',
      label: 'Scene authoring',
      phase: '16',
      path: '/workspaces/scene',
      routeRole: 'authoring',
      stateLabel: 'Next phase',
      stateTone: 'warning',
      summary:
        'Captura la intencion humana y la traduce a un brief estructurado antes de tocar motores creativos.',
      boundary:
        'El shell se queda con la captura y la traduccion; los prompts concretos viven despues en consumidores reales.',
      runnerIds: [],
      evidenceRoots: [],
      notes: [
        'Preparado para phase 16 sobre la misma app',
        'Sin persistencia ad hoc fuera de STUDIO_DIR'
      ]
    },
    {
      id: 'assets',
      label: 'Asset pipeline',
      phase: '18',
      path: '/workspaces/assets',
      routeRole: 'pipeline',
      stateLabel: 'Planned',
      stateTone: 'info',
      summary:
        'Define la futura capa de catalogo, referencias y estados de assets sobre layouts filesystem-first.',
      boundary:
        'La UI no crea una base de datos paralela; reusa Assets3D, Exports y manifiestos canonicos.',
      runnerIds: [],
      evidenceRoots: [],
      notes: [
        'Reservado para phases 18-20',
        'Reutiliza briefs y rutas canonicas del shell'
      ]
    },
    {
      id: 'kimodo',
      label: 'Kimodo',
      phase: '24',
      path: '/workspaces/kimodo',
      routeRole: 'embedded',
      stateLabel: 'Embed seam',
      stateTone: 'info',
      summary:
        'Reserva el seam same-origin donde Kimodo quedara embebido con contexto de escena, shot y personaje.',
      boundary:
        'El shell aporta contexto y rutas; no reescribe la UI nativa de authoring de motion.',
      runnerIds: [],
      evidenceRoots: [],
      notes: [
        'IFrame same-origin listo para un proxy futuro',
        'Sin sensacion de sitio externo dentro del producto'
      ],
      embedPath: '/workspaces/kimodo/embed'
    },
    {
      id: 'blender',
      label: 'Blender',
      phase: '21-28',
      path: '/workspaces/blender',
      routeRole: 'assisted',
      stateLabel: runnerMap.has('blender') ? 'Available' : 'Bridge missing',
      stateTone: runnerMap.has('blender') ? 'positive' : 'warning',
      summary:
        'Expone operaciones asistidas de Blender sobre el runner canonico, sin abrir una capa de control ad hoc.',
      boundary:
        'El producto muestra targets, estado y evidencia; Blender sigue siendo herramienta local asistida.',
      runnerIds: ['blender'],
      evidenceRoots: evidenceRootsFor(['blender'], runnerMap),
      notes: [
        'Base para cleanup, rigging, composicion y refine asistido',
        'Los run_id y artefactos siguen siendo canonicos'
      ]
    },
    {
      id: 'comfyui',
      label: 'ComfyUI engine',
      phase: '19, 29-30',
      path: '/workspaces/comfyui',
      routeRole: 'engine',
      stateLabel: runnerMap.has('comfyui') ? 'Available' : 'Bridge missing',
      stateTone: runnerMap.has('comfyui') ? 'positive' : 'warning',
      summary:
        'Mantiene ComfyUI detras de presets de producto, progreso legible y cancelacion canonicamente trazable.',
      boundary:
        'La UI principal nunca expone el canvas general como experiencia primaria del producto.',
      runnerIds: ['comfyui'],
      evidenceRoots: evidenceRootsFor(['comfyui'], runnerMap),
      notes: [
        'Preparado para presets, previews y errores legibles',
        'La adaptacion HTTP reutiliza el runner canonico existente'
      ]
    },
    {
      id: 'resolve',
      label: 'DaVinci Resolve',
      phase: '31-33',
      path: '/workspaces/resolve',
      routeRole: 'assisted',
      stateLabel: 'Planned',
      stateTone: 'muted',
      summary:
        'Marca la frontera futura para assembly, refine y export final sin inventar otro frontend.',
      boundary:
        'Resolve llegara como backend y workspace asistido dentro del mismo shell y la misma taxonomia de evidencia.',
      runnerIds: [],
      evidenceRoots: [],
      notes: [
        'Ruta reservada para phases 31-33',
        'El shell ya conoce donde encajara el editor final'
      ]
    }
  ];

  return workspaces;
}

export function buildProductShell(
  runnerCatalog: RunnerDescriptionRecord[]
): ProductShellModel {
  return {
    title: 'OpenClaw Studio',
    subtitle:
      'Shell de producto en SvelteKit para orquestar briefs, runners y workspaces embebidos sin duplicar contratos.',
    workspaces: buildWorkspaceCatalog(runnerCatalog)
  };
}
