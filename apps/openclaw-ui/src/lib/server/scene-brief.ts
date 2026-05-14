import fs from 'node:fs/promises';
import path from 'node:path';

import type { SharedBrief } from '$lib/types/product';

import { buildSharedBrief } from './brief-translator';
import { resolveRepoContext } from './env';

const AMBIGUOUS_MARKERS = [
  'quizas',
  'quizá',
  'tal vez',
  'no se',
  'no sé',
  'etc',
  'algo',
  'whatever',
  '???'
];

export type SceneCheckpointStatus = 'accepted' | 'incomplete' | 'ambiguous';

export interface SceneBriefInput {
  intent: string;
  tone: string;
  narrative?: string;
  projectId?: string;
  sceneId?: string;
  characters?: unknown;
  objects?: unknown;
  constraints?: unknown;
  references?: unknown;
}

export interface SceneBriefSource {
  intent: string;
  tone: string;
  narrative: string;
  characters: string[];
  objects: string[];
  constraints: string[];
  references: string[];
}

export interface SceneCheckpointFeedback {
  status: SceneCheckpointStatus;
  label: string;
  notes: string[];
}

export interface SceneBriefArtifact {
  schemaVersion: 1;
  createdAt: string;
  briefId: string;
  projectId: string;
  sceneId: string;
  workspaceId: 'scene';
  source: SceneBriefSource;
  checkpoint: SceneCheckpointFeedback;
  sharedBrief: SharedBrief;
}

export interface PersistedSceneBrief {
  artifact: SceneBriefArtifact;
  filePath: string;
}

export interface PersistSceneBriefOptions {
  studioDir?: string;
  now?: Date;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function slugify(value: string): string {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeId(value: string | undefined, fallback: string): string {
  const normalized = slugify(value || '');
  return normalized || fallback;
}

export function parseSceneList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? normalizeWhitespace(entry) : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,]/g)
      .map((entry) => normalizeWhitespace(entry))
      .filter(Boolean);
  }

  return [];
}

function hasAmbiguousLanguage(source: SceneBriefSource): boolean {
  const normalized = [
    source.intent,
    source.tone,
    source.narrative,
    ...source.characters,
    ...source.objects,
    ...source.constraints
  ]
    .join(' ')
    .toLowerCase();

  return AMBIGUOUS_MARKERS.some((marker) => normalized.includes(marker));
}

function collectMissingFields(source: SceneBriefSource): string[] {
  const missing: string[] = [];

  if (!source.intent) {
    missing.push('intent');
  }

  if (!source.tone) {
    missing.push('tone');
  }

  if (!source.characters.length) {
    missing.push('characters');
  }

  if (!source.objects.length) {
    missing.push('objects');
  }

  if (!source.constraints.length) {
    missing.push('constraints');
  }

  return missing;
}

function evaluateCheckpoint(source: SceneBriefSource): SceneCheckpointFeedback {
  const missing = collectMissingFields(source);

  if (missing.length) {
    return {
      status: 'incomplete',
      label: 'Brief incompleto',
      notes: [`Faltan campos guiados requeridos: ${missing.join(', ')}.`]
    };
  }

  if (hasAmbiguousLanguage(source)) {
    return {
      status: 'ambiguous',
      label: 'Brief ambiguo',
      notes: [
        'Se detecto lenguaje ambiguo. Refina la intencion, el tono y los constraints para habilitar handoffs confiables.'
      ]
    };
  }

  return {
    status: 'accepted',
    label: 'Brief aceptado',
    notes: ['El brief tiene estructura suficiente para traduccion y handoff de pipeline.']
  };
}

function buildNarrative(source: SceneBriefSource): string {
  if (source.narrative) {
    return source.narrative;
  }

  const characterSeed = source.characters.join(', ') || 'personajes sin definir';
  const objectSeed = source.objects.join(', ') || 'objetos sin definir';
  return `${source.intent} Tono: ${source.tone}. Personajes: ${characterSeed}. Objetos: ${objectSeed}.`;
}

export function buildSceneBriefArtifact(
  input: SceneBriefInput,
  options: { now?: Date } = {}
): SceneBriefArtifact {
  const projectId = sanitizeId(input.projectId, 'default');
  const sceneId = sanitizeId(input.sceneId || input.intent, 'scene-draft');

  const source: SceneBriefSource = {
    intent: normalizeWhitespace(input.intent || ''),
    tone: normalizeWhitespace(input.tone || ''),
    narrative: normalizeWhitespace(input.narrative || ''),
    characters: parseSceneList(input.characters),
    objects: parseSceneList(input.objects),
    constraints: parseSceneList(input.constraints),
    references: parseSceneList(input.references)
  };

  const checkpoint = evaluateCheckpoint(source);
  const narrative = buildNarrative(source);

  return {
    schemaVersion: 1,
    createdAt: (options.now || new Date()).toISOString(),
    briefId: `${projectId}:${sceneId}`,
    projectId,
    sceneId,
    workspaceId: 'scene',
    source,
    checkpoint,
    sharedBrief: buildSharedBrief({
      projectId,
      workspaceId: 'scene',
      intent: source.intent,
      narrative,
      constraints: source.constraints,
      references: source.references
    })
  };
}

function sceneBriefPath(studioDir: string, artifact: SceneBriefArtifact): string {
  return path.join(
    studioDir,
    'Scenes',
    artifact.projectId,
    artifact.sceneId,
    'briefs',
    'scene-brief.json'
  );
}

export async function persistSceneBrief(
  input: SceneBriefInput,
  options: PersistSceneBriefOptions = {}
): Promise<PersistedSceneBrief> {
  const artifact = buildSceneBriefArtifact(input, { now: options.now });
  const studioDir = options.studioDir || resolveRepoContext().studioDir;
  const filePath = sceneBriefPath(studioDir, artifact);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');

  return { artifact, filePath };
}
