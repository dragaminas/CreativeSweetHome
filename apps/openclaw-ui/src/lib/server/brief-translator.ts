import type { ConsumerBrief, SharedBrief, SharedBriefInput, StructuredBriefFields } from '$lib/types/product';

const STOP_WORDS = new Set([
  'a',
  'al',
  'and',
  'con',
  'de',
  'del',
  'el',
  'en',
  'esta',
  'este',
  'for',
  'la',
  'las',
  'los',
  'para',
  'por',
  'que',
  'the',
  'una',
  'uno',
  'y'
]);

export const SHELL_PREVIEW_INPUT: SharedBriefInput = {
  projectId: 'phase15-shell',
  workspaceId: 'scene',
  intent: 'Preparar una escena principal de apertura',
  narrative:
    'Una piloto adolescente cruza un callejon lluvioso con un dron casero siguiendola y quiere un tono artesanal, nocturno y cinematografico.',
  constraints: ['clip corto de apertura', 'continuidad visual entre personaje y dron'],
  references: ['turnaround del personaje', 'moodboard de lluvia nocturna']
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function firstSentence(value: string): string {
  const match = normalizeWhitespace(value).match(/^(.*?[.!?])(?:\s|$)/);
  return match ? match[1] : normalizeWhitespace(value);
}

function extractKeywords(fields: StructuredBriefFields): string[] {
  const raw = [fields.intent, fields.narrative, ...fields.constraints, ...fields.references]
    .join(' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  const tokens = raw
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 3 && !STOP_WORDS.has(token));

  return [...new Set(tokens)].slice(0, 8);
}

function buildStructure(input: SharedBriefInput): StructuredBriefFields {
  return {
    intent: normalizeWhitespace(input.intent),
    narrative: normalizeWhitespace(input.narrative),
    constraints: (input.constraints || []).map(normalizeWhitespace).filter(Boolean),
    references: (input.references || []).map(normalizeWhitespace).filter(Boolean),
    projectId: input.projectId || 'default',
    workspaceId: input.workspaceId || 'shell'
  };
}

function buildConsumerBriefs(fields: StructuredBriefFields, keywords: string[]): ConsumerBrief[] {
  const focus = keywords.slice(0, 4).join(', ') || 'contexto base';
  const narrativeSeed = firstSentence(fields.narrative);

  return [
    {
      consumerId: 'comfyui',
      label: 'ComfyUI engine brief',
      routeHint: '/workspaces/comfyui',
      operationHint: 'Mantener presets visibles a producto, no exponer el canvas crudo.',
      summary: `Traducir la escena a prompt controlado, presets de producto y checkpoints visibles para ${fields.projectId}.`,
      focusPoints: [
        `Prompt seed: ${narrativeSeed}`,
        `Keywords dominantes: ${focus}`,
        `References declaradas: ${fields.references.length || 0}`,
        'Publicar previews, artefactos finales y evidencia bajo el contrato de runner'
      ]
    },
    {
      consumerId: 'kimodo',
      label: 'Kimodo motion brief',
      routeHint: '/workspaces/kimodo',
      operationHint: 'Entregar contexto de escena, shot, personaje y salida sin reimplementar authoring.',
      summary: 'Preparar contexto de animacion y blocking para que Kimodo viva embebido bajo el shell del producto.',
      focusPoints: [
        `Intencion narrativa: ${fields.intent}`,
        'Transportar personaje, beat de movimiento y tono como contexto canonicamente legible',
        'Mantener la salida dentro de rutas de Studio controladas por el producto'
      ]
    },
    {
      consumerId: 'blender',
      label: 'Blender assist brief',
      routeHint: '/workspaces/blender',
      operationHint: 'Activar operaciones asistidas y handoffs 3D sin inventar un runner paralelo.',
      summary: 'Convertir el mismo brief en tareas de cleanup, composicion o refinamiento asistido.',
      focusPoints: [
        `Scope de proyecto: ${fields.projectId}`,
        'Relacionar assets, rigs y evidencias con los mismos IDs y rutas de producto',
        'Usar rutas de BlenderProjects y Assets3D ya soportadas por el repo'
      ]
    },
    {
      consumerId: 'davinci-resolve',
      label: 'Resolve assembly brief',
      routeHint: '/workspaces/resolve',
      operationHint: 'Reservar una frontera editorial futura sin bloquear el shell actual.',
      summary: 'Empaquetar continuidad visual, orden de tomas y restricciones editoriales para una futura capa de Resolve.',
      focusPoints: [
        `Narrativa resumida: ${narrativeSeed}`,
        `Restricciones explicitadas: ${fields.constraints.join(', ') || 'ninguna'}`,
        'Conservar evidencia y enlaces a artefactos para montage y refine posterior'
      ]
    }
  ];
}

export function buildSharedBrief(input: SharedBriefInput): SharedBrief {
  const structure = buildStructure(input);
  const extractedKeywords = extractKeywords(structure);
  const summary = `${structure.intent}. ${firstSentence(structure.narrative)}`;
  const briefId = `${structure.projectId}:${structure.workspaceId}`;
  const slug = slugify(
    `${structure.projectId}-${structure.workspaceId}-${extractedKeywords.slice(0, 3).join('-')}`
  );

  return {
    briefId,
    slug,
    summary,
    normalizedNarrative: normalizeWhitespace(
      `${structure.intent}. ${structure.narrative}`
    ),
    extractedKeywords,
    checkpointLabels: [
      'intent captured',
      'consumer translation available',
      'canonical runner handoff ready',
      'filesystem-first outputs reserved'
    ],
    structure,
    consumerBriefs: buildConsumerBriefs(structure, extractedKeywords)
  };
}
