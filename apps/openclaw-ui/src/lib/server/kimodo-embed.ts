import fs from 'node:fs/promises';
import path from 'node:path';

import type { EmbedWorkspaceSeam } from '$lib/types/product';
import { resolveRepoContext } from './env';

type KimodoEmbedBridgeStatus = 'ready' | 'needs_review';

interface CharacterCatalogEntry {
  assetId?: string;
  label?: string;
  stage?: string;
  stageState?: string;
}

interface CharacterCatalogShape {
  assets?: CharacterCatalogEntry[];
}

export interface PrepareKimodoEmbedContextInput {
  projectId: string;
  sceneId: string;
  shotId: string;
  characterId: string;
  requestedBy?: string;
  channel?: string;
}

export interface KimodoEmbedContext {
  schemaVersion: 1;
  createdAt: string;
  contextId: string;
  workspaceId: 'kimodo';
  projectId: string;
  sceneId: string;
  shotId: string;
  characterId: string;
  characterLabel: string;
  outputRoot: string;
  inputRoot: string;
  logsRoot: string;
  manifestsRoot: string;
  sceneManifestPath: string;
  assetsManifestPath: string;
  shotManifestPath: string;
  shotBriefPath: string;
  characterCatalogPath: string;
  sameOriginPath: '/workspaces/kimodo/embed';
  upstreamUrl: string | null;
  requestedBy: string;
  channel: string;
  consistency: {
    status: KimodoEmbedBridgeStatus;
    missing: string[];
    notes: string[];
  };
}

export interface PrepareKimodoEmbedContextResult {
  accepted: boolean;
  status: KimodoEmbedBridgeStatus;
  message: string;
  context: KimodoEmbedContext;
  contextPath: string;
  statePath: string;
  embedUrl: string;
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

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readCharacterCatalog(
  catalogPath: string,
  characterId: string
): Promise<{ label: string; stage: string; stageState: string; found: boolean }> {
  if (!(await pathExists(catalogPath))) {
    return {
      label: characterId,
      stage: 'unknown',
      stageState: 'pending',
      found: false
    };
  }

  try {
    const parsed = JSON.parse(await fs.readFile(catalogPath, 'utf8')) as CharacterCatalogShape;
    const assets = Array.isArray(parsed.assets) ? parsed.assets : [];
    const match = assets.find((asset) => normalizeWhitespace(asset.assetId || '') === characterId);

    if (!match) {
      return {
        label: characterId,
        stage: 'unknown',
        stageState: 'pending',
        found: false
      };
    }

    return {
      label: normalizeWhitespace(match.label || characterId) || characterId,
      stage: normalizeWhitespace(match.stage || 'unknown') || 'unknown',
      stageState: normalizeWhitespace(match.stageState || 'pending') || 'pending',
      found: true
    };
  } catch {
    return {
      label: characterId,
      stage: 'unknown',
      stageState: 'pending',
      found: false
    };
  }
}

function buildEmbedUrl(
  projectId: string,
  sceneId: string,
  shotId: string,
  characterId: string
): string {
  const query = new URLSearchParams({
    projectId,
    sceneId,
    shotId,
    characterId
  });
  return `/workspaces/kimodo/embed?${query.toString()}`;
}

function bridgeMessage(status: KimodoEmbedBridgeStatus): string {
  if (status === 'ready') {
    return 'Contexto Kimodo listo y persistido en rutas canonicas.';
  }

  return 'Contexto Kimodo persistido con revisiones pendientes en prerequisitos canonicos.';
}

export function loadKimodoEmbedSeam(): EmbedWorkspaceSeam {
  const context = resolveRepoContext();
  const upstreamUrl = process.env.OPENCLAW_KIMODO_EMBED_URL?.trim() || null;

  return {
    workspaceId: 'kimodo',
    sameOriginPath: '/workspaces/kimodo/embed',
    outputRoot: path.join(context.studioDir, 'Exports'),
    upstreamUrl,
    contextKeys: [
      'project_id',
      'scene_id',
      'shot_id',
      'character_id',
      'asset_state',
      'output_root',
      'context_path'
    ],
    notes: [
      'Bridge backend canónico listo para persistir contexto y estado de Kimodo.',
      'La misma seam reutiliza rutas de Shots/Exports sin abrir un runner o proxy paralelo.'
    ],
    stateLabel: upstreamUrl ? 'Upstream configured' : 'Backend bridge ready',
    stateTone: 'positive'
  };
}

export async function prepareKimodoEmbedContext(
  input: PrepareKimodoEmbedContextInput
): Promise<PrepareKimodoEmbedContextResult> {
  const context = resolveRepoContext();
  const upstreamUrl = process.env.OPENCLAW_KIMODO_EMBED_URL?.trim() || null;
  const createdAt = new Date().toISOString();

  const projectId = sanitizeId(input.projectId, 'default');
  const sceneId = sanitizeId(input.sceneId, 'scene-draft');
  const shotId = sanitizeId(input.shotId, 'sh010');
  const characterId = sanitizeId(input.characterId, 'chr-001');

  const sceneRoot = path.join(context.studioDir, 'Scenes', projectId, sceneId);
  const shotRoot = path.join(sceneRoot, 'shots', shotId);
  const manifestsRoot = path.join(shotRoot, 'manifests');
  const outputBaseRoot = path.join(context.exportsDir, projectId, shotId, 'kimodo');
  const inputRoot = path.join(outputBaseRoot, 'input');
  const outputRoot = path.join(outputBaseRoot, 'output');
  const logsRoot = path.join(outputBaseRoot, 'logs');

  const sceneManifestPath = path.join(sceneRoot, 'manifests', 'scene-storage.json');
  const assetsManifestPath = path.join(sceneRoot, 'manifests', 'assets.json');
  const shotManifestPath = path.join(shotRoot, 'manifests', 'shot.json');
  const shotBriefPath = path.join(shotRoot, 'briefs', 'shot-brief.json');
  const characterCatalogPath = path.join(sceneRoot, 'manifests', 'character-catalog.json');
  const contextPath = path.join(manifestsRoot, 'kimodo-embed-context.json');
  const statePath = path.join(manifestsRoot, 'kimodo-animation-state.json');

  await fs.mkdir(manifestsRoot, { recursive: true });
  await fs.mkdir(inputRoot, { recursive: true });
  await fs.mkdir(outputRoot, { recursive: true });
  await fs.mkdir(logsRoot, { recursive: true });

  const missing: string[] = [];
  const notes: string[] = [];

  if (!(await pathExists(sceneManifestPath))) {
    missing.push('scene_storage_manifest');
    notes.push('No se encontro scene-storage.json para la escena.');
  }
  if (!(await pathExists(assetsManifestPath))) {
    missing.push('assets_manifest');
    notes.push('No se encontro assets.json para la escena.');
  }
  if (!(await pathExists(shotManifestPath))) {
    missing.push('shot_manifest');
    notes.push('No se encontro shot.json para la toma.');
  }
  if (!(await pathExists(shotBriefPath))) {
    missing.push('shot_brief');
    notes.push('No se encontro shot-brief.json para la toma.');
  }

  const character = await readCharacterCatalog(characterCatalogPath, characterId);
  if (!character.found) {
    missing.push('character_catalog_entry');
    notes.push(`No se encontro ${characterId} en character-catalog.json.`);
  }

  const status: KimodoEmbedBridgeStatus = missing.length === 0 ? 'ready' : 'needs_review';
  if (notes.length === 0) {
    notes.push('Contexto de escena/shot/personaje verificado para bridge de Kimodo.');
  }

  const contextId = `${projectId}:${sceneId}:${shotId}:${characterId}`;

  const payload: KimodoEmbedContext = {
    schemaVersion: 1,
    createdAt,
    contextId,
    workspaceId: 'kimodo',
    projectId,
    sceneId,
    shotId,
    characterId,
    characterLabel: character.label,
    outputRoot,
    inputRoot,
    logsRoot,
    manifestsRoot,
    sceneManifestPath,
    assetsManifestPath,
    shotManifestPath,
    shotBriefPath,
    characterCatalogPath,
    sameOriginPath: '/workspaces/kimodo/embed',
    upstreamUrl,
    requestedBy: input.requestedBy || 'openclaw-ui',
    channel: input.channel || 'web-ui',
    consistency: {
      status,
      missing,
      notes
    }
  };

  const initialAnimationState = {
    schemaVersion: 1,
    createdAt,
    workspaceId: 'kimodo',
    status: 'pending_animation',
    projectId,
    sceneId,
    shotId,
    characterId,
    characterLabel: character.label,
    contextPath,
    outputRoot,
    notes
  };

  await fs.writeFile(contextPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.writeFile(statePath, `${JSON.stringify(initialAnimationState, null, 2)}\n`, 'utf8');

  return {
    accepted: status === 'ready',
    status,
    message: bridgeMessage(status),
    context: payload,
    contextPath,
    statePath,
    embedUrl: buildEmbedUrl(projectId, sceneId, shotId, characterId)
  };
}
