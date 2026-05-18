import fs from 'node:fs/promises';
import path from 'node:path';

import type { SharedBrief } from '$lib/types/product';

import { buildSharedBrief } from './brief-translator';
import { resolveRepoContext } from './env';

const AMBIGUOUS_MARKERS = ['quizas', 'quizá', 'tal vez', 'no se', 'no sé', 'etc', 'algo', 'whatever', '???'];

export type ShotCheckpointStatus = 'accepted' | 'incomplete' | 'ambiguous';
export type ShotConsistencyStatus = 'consistent' | 'needs_review';

export interface ShotBriefInput {
  intent: string;
  framing: string;
  durationMs: number;
  narrative?: string;
  projectId?: string;
  sceneId?: string;
  shotId?: string;
  characters?: unknown;
  constraints?: unknown;
  references?: unknown;
}

export interface ShotBriefSource {
  intent: string;
  framing: string;
  durationMs: number;
  narrative: string;
  characters: string[];
  constraints: string[];
  references: string[];
}

export interface ShotCheckpointFeedback {
  status: ShotCheckpointStatus;
  label: string;
  notes: string[];
}

export interface ShotConsistencyFeedback {
  status: ShotConsistencyStatus;
  notes: string[];
  sceneManifestPath: string;
  assetsManifestPath: string;
  shotManifestPath: string;
  availableCharacterIds: string[];
  availableCharacterLabels: string[];
  missingCharacters: string[];
}

export interface ShotBriefArtifact {
  schemaVersion: 1;
  createdAt: string;
  briefId: string;
  projectId: string;
  sceneId: string;
  shotId: string;
  workspaceId: 'shot';
  source: ShotBriefSource;
  checkpoint: ShotCheckpointFeedback;
  consistency: ShotConsistencyFeedback;
  sharedBrief: SharedBrief;
}

export interface PersistedShotBrief {
  artifact: ShotBriefArtifact;
  filePath: string;
}

export interface PersistShotBriefOptions {
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

function normalizeDurationMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  return 0;
}

export function parseShotList(value: unknown): string[] {
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

function hasAmbiguousLanguage(source: ShotBriefSource): boolean {
  const normalized = [
    source.intent,
    source.framing,
    source.narrative,
    ...source.characters,
    ...source.constraints
  ]
    .join(' ')
    .toLowerCase();

  return AMBIGUOUS_MARKERS.some((marker) => normalized.includes(marker));
}

function collectMissingFields(source: ShotBriefSource): string[] {
  const missing: string[] = [];

  if (!source.intent) {
    missing.push('intent');
  }

  if (!source.framing) {
    missing.push('framing');
  }

  if (!source.durationMs) {
    missing.push('durationMs');
  }

  if (!source.characters.length) {
    missing.push('characters');
  }

  if (!source.constraints.length) {
    missing.push('constraints');
  }

  return missing;
}

function evaluateCheckpoint(source: ShotBriefSource): ShotCheckpointFeedback {
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
        'Se detecto lenguaje ambiguo. Refina intencion, framing y constraints para habilitar handoffs confiables.'
      ]
    };
  }

  return {
    status: 'accepted',
    label: 'Brief aceptado',
    notes: ['El shot brief tiene estructura suficiente para animacion, composicion y render.']
  };
}

function buildNarrative(source: ShotBriefSource): string {
  if (source.narrative) {
    return source.narrative;
  }

  const characterSeed = source.characters.join(', ') || 'personajes sin definir';

  return `${source.intent} Framing: ${source.framing}. Duracion: ${source.durationMs}ms. Personajes: ${characterSeed}.`;
}

function pendingConsistency(
  projectId: string,
  sceneId: string,
  shotId: string,
  studioDir: string
): ShotConsistencyFeedback {
  const sceneRoot = path.join(studioDir, 'Scenes', projectId, sceneId);

  return {
    status: 'needs_review',
    notes: ['Consistencia pendiente de validar.'],
    sceneManifestPath: path.join(sceneRoot, 'manifests', 'scene-storage.json'),
    assetsManifestPath: path.join(sceneRoot, 'manifests', 'assets.json'),
    shotManifestPath: path.join(sceneRoot, 'shots', shotId, 'manifests', 'shot.json'),
    availableCharacterIds: [],
    availableCharacterLabels: [],
    missingCharacters: []
  };
}

export function buildShotBriefArtifact(
  input: ShotBriefInput,
  options: { now?: Date; consistency?: ShotConsistencyFeedback; studioDir?: string } = {}
): ShotBriefArtifact {
  const projectId = sanitizeId(input.projectId, 'default');
  const sceneId = sanitizeId(input.sceneId, 'scene-draft');
  const shotId = sanitizeId(input.shotId, 'sh010');
  const studioDir = options.studioDir || resolveRepoContext().studioDir;

  const source: ShotBriefSource = {
    intent: normalizeWhitespace(input.intent || ''),
    framing: normalizeWhitespace(input.framing || ''),
    durationMs: normalizeDurationMs(input.durationMs),
    narrative: normalizeWhitespace(input.narrative || ''),
    characters: parseShotList(input.characters),
    constraints: parseShotList(input.constraints),
    references: parseShotList(input.references)
  };

  const checkpoint = evaluateCheckpoint(source);
  const narrative = buildNarrative(source);

  return {
    schemaVersion: 1,
    createdAt: (options.now || new Date()).toISOString(),
    briefId: `${projectId}:${sceneId}:${shotId}`,
    projectId,
    sceneId,
    shotId,
    workspaceId: 'shot',
    source,
    checkpoint,
    consistency: options.consistency || pendingConsistency(projectId, sceneId, shotId, studioDir),
    sharedBrief: buildSharedBrief({
      projectId,
      workspaceId: 'shot',
      intent: source.intent,
      narrative,
      constraints: source.constraints,
      references: source.references
    })
  };
}

function normalizeLookup(values: string[]): Set<string> {
  return new Set(values.map((value) => normalizeWhitespace(value).toLowerCase()).filter(Boolean));
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

interface CharacterCatalogShape {
  assets?: Array<{ assetId?: string; label?: string }>;
}

async function readCharacterCatalog(catalogPath: string): Promise<{ ids: string[]; labels: string[] }> {
  if (!(await pathExists(catalogPath))) {
    return { ids: [], labels: [] };
  }

  try {
    const parsed = JSON.parse(await fs.readFile(catalogPath, 'utf8')) as CharacterCatalogShape;
    const entries = Array.isArray(parsed.assets) ? parsed.assets : [];
    const ids = entries
      .map((entry) => (typeof entry.assetId === 'string' ? normalizeWhitespace(entry.assetId) : ''))
      .filter(Boolean);
    const labels = entries
      .map((entry) => (typeof entry.label === 'string' ? normalizeWhitespace(entry.label) : ''))
      .filter(Boolean);
    return {
      ids: Array.from(new Set(ids)),
      labels: Array.from(new Set(labels))
    };
  } catch {
    return { ids: [], labels: [] };
  }
}

async function evaluateConsistency(
  projectId: string,
  sceneId: string,
  shotId: string,
  characters: string[],
  studioDir: string
): Promise<ShotConsistencyFeedback> {
  const sceneRoot = path.join(studioDir, 'Scenes', projectId, sceneId);
  const sceneManifestPath = path.join(sceneRoot, 'manifests', 'scene-storage.json');
  const assetsManifestPath = path.join(sceneRoot, 'manifests', 'assets.json');
  const shotManifestPath = path.join(sceneRoot, 'shots', shotId, 'manifests', 'shot.json');
  const characterCatalogPath = path.join(sceneRoot, 'manifests', 'character-catalog.json');

  const notes: string[] = [];

  if (!(await pathExists(sceneManifestPath))) {
    notes.push('No se encontro el scene scaffold canonico para esta escena.');
  }

  if (!(await pathExists(assetsManifestPath))) {
    notes.push('No se encontro el manifest relacional de assets (assets.json).');
  }

  if (!(await pathExists(shotManifestPath))) {
    notes.push('No se encontro el manifest canonico de la toma (shot.json).');
  }

  const characterCatalog = await readCharacterCatalog(characterCatalogPath);

  if (characterCatalog.ids.length === 0 && characterCatalog.labels.length === 0) {
    notes.push('No se encontro catalogo de personajes para validar consistencia.');
  }

  const lookup = normalizeLookup([...characterCatalog.ids, ...characterCatalog.labels]);
  const requestedCharacters = parseShotList(characters);
  const missingCharacters = requestedCharacters.filter(
    (character) => !lookup.has(normalizeWhitespace(character).toLowerCase())
  );

  if (missingCharacters.length > 0) {
    notes.push(`Personajes no encontrados en el catalogo de la escena: ${missingCharacters.join(', ')}.`);
  }

  return {
    status: notes.length === 0 ? 'consistent' : 'needs_review',
    notes:
      notes.length === 0
        ? ['Consistencia validada entre escena, shot y personajes catalogados.']
        : notes,
    sceneManifestPath,
    assetsManifestPath,
    shotManifestPath,
    availableCharacterIds: characterCatalog.ids,
    availableCharacterLabels: characterCatalog.labels,
    missingCharacters
  };
}

function shotBriefPath(studioDir: string, artifact: ShotBriefArtifact): string {
  return path.join(
    studioDir,
    'Scenes',
    artifact.projectId,
    artifact.sceneId,
    'shots',
    artifact.shotId,
    'briefs',
    'shot-brief.json'
  );
}

export async function persistShotBrief(
  input: ShotBriefInput,
  options: PersistShotBriefOptions = {}
): Promise<PersistedShotBrief> {
  const studioDir = options.studioDir || resolveRepoContext().studioDir;

  const draft = buildShotBriefArtifact(input, { now: options.now, studioDir });
  const consistency = await evaluateConsistency(
    draft.projectId,
    draft.sceneId,
    draft.shotId,
    draft.source.characters,
    studioDir
  );
  const artifact = buildShotBriefArtifact(input, {
    now: options.now,
    consistency,
    studioDir
  });

  const filePath = shotBriefPath(studioDir, artifact);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');

  return { artifact, filePath };
}
