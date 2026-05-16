import fs from 'node:fs/promises';
import path from 'node:path';

import { resolveRepoContext } from './env';

export type SceneStorageScaffoldStatus = 'created' | 'collision' | 'missing_prerequisites';

export interface CreateSceneStorageScaffoldInput {
  projectId: string;
  sceneId: string;
  initialShotId?: string;
}

export interface CreateSceneStorageScaffoldOptions {
  studioDir?: string;
  assets3dDir?: string;
  now?: Date;
}

export interface SceneStorageScaffoldResult {
  status: SceneStorageScaffoldStatus;
  message: string;
  projectId: string;
  sceneId: string;
  initialShotId: string;
  briefPath: string;
  sceneRoot: string;
  assetsRoot: string;
  exportRoot: string;
  createdPaths: string[];
  collisionPaths: string[];
  manifestPaths: string[];
}

interface SceneBriefArtifactShape {
  projectId?: string;
  sceneId?: string;
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

async function ensureDirectory(
  targetPath: string,
  result: SceneStorageScaffoldResult,
  trackCollision = true
): Promise<void> {
  const exists = await pathExists(targetPath);

  if (exists) {
    if (trackCollision) {
      result.collisionPaths.push(targetPath);
    }
    return;
  }

  await fs.mkdir(targetPath, { recursive: true });
  result.createdPaths.push(targetPath);
}

async function writeManifest(
  targetPath: string,
  payload: Record<string, unknown>,
  result: SceneStorageScaffoldResult
): Promise<void> {
  const exists = await pathExists(targetPath);

  if (exists) {
    result.collisionPaths.push(targetPath);
    result.manifestPaths.push(targetPath);
    return;
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  result.createdPaths.push(targetPath);
  result.manifestPaths.push(targetPath);
}

async function readSceneBrief(briefPath: string): Promise<SceneBriefArtifactShape | null> {
  if (!(await pathExists(briefPath))) {
    return null;
  }

  const raw = await fs.readFile(briefPath, 'utf8');

  try {
    return JSON.parse(raw) as SceneBriefArtifactShape;
  } catch {
    return null;
  }
}

function exportsSubdirs(exportRoot: string): string[] {
  return [
    path.join(exportRoot, 'blender', 'frames'),
    path.join(exportRoot, 'blender', 'controls'),
    path.join(exportRoot, 'blender', 'refs'),
    path.join(exportRoot, 'blender', 'manifests'),
    path.join(exportRoot, 'comfyui', 'input'),
    path.join(exportRoot, 'comfyui', 'output'),
    path.join(exportRoot, 'comfyui', 'temp'),
    path.join(exportRoot, 'comfyui', 'logs')
  ];
}

function sceneStorageMessage(status: SceneStorageScaffoldStatus): string {
  if (status === 'created') {
    return 'Scene scaffold creado a partir del scene brief guardado.';
  }

  if (status === 'collision') {
    return 'Se detectaron colisiones: revisa rutas ya existentes antes de volver a scaffoldear.';
  }

  return 'Falta el scene brief prerequisite. Guarda primero el scene brief de esta escena.';
}

export async function createSceneStorageScaffold(
  input: CreateSceneStorageScaffoldInput,
  options: CreateSceneStorageScaffoldOptions = {}
): Promise<SceneStorageScaffoldResult> {
  const context = resolveRepoContext();
  const studioDir = options.studioDir || context.studioDir;
  const assets3dBaseDir =
    options.assets3dDir ||
    (options.studioDir
      ? process.env.OPENCLAW_ALLOWED_3D_ASSETS_DIR || path.join(studioDir, 'Assets3D')
      : context.assets3dDir);
  const nowIso = (options.now || new Date()).toISOString();

  const projectId = sanitizeId(input.projectId, 'default');
  const sceneId = sanitizeId(input.sceneId, 'scene-draft');
  const initialShotId = sanitizeId(input.initialShotId, 'sh010');

  const sceneRoot = path.join(studioDir, 'Scenes', projectId, sceneId);
  const briefPath = path.join(sceneRoot, 'briefs', 'scene-brief.json');
  const assetsRoot = path.join(assets3dBaseDir, projectId);
  const exportRoot = path.join(studioDir, 'Exports', projectId, initialShotId);

  const result: SceneStorageScaffoldResult = {
    status: 'created',
    message: '',
    projectId,
    sceneId,
    initialShotId,
    briefPath,
    sceneRoot,
    assetsRoot,
    exportRoot,
    createdPaths: [],
    collisionPaths: [],
    manifestPaths: []
  };

  const sceneBrief = await readSceneBrief(briefPath);

  if (!sceneBrief) {
    result.status = 'missing_prerequisites';
    result.message = `${sceneStorageMessage('missing_prerequisites')} (${briefPath})`;
    return result;
  }

  await ensureDirectory(path.join(sceneRoot, 'manifests'), result);
  await ensureDirectory(path.join(sceneRoot, 'assets'), result);
  await ensureDirectory(path.join(sceneRoot, 'assets', 'characters'), result);
  await ensureDirectory(path.join(sceneRoot, 'assets', 'objects'), result);
  await ensureDirectory(path.join(sceneRoot, 'shots'), result);
  await ensureDirectory(path.join(sceneRoot, 'shots', initialShotId), result);
  await ensureDirectory(path.join(sceneRoot, 'shots', initialShotId, 'briefs'), result);
  await ensureDirectory(path.join(sceneRoot, 'shots', initialShotId, 'manifests'), result);

  await ensureDirectory(assets3dBaseDir, result, false);
  await ensureDirectory(assetsRoot, result, false);
  await ensureDirectory(path.join(studioDir, 'Exports'), result, false);
  await ensureDirectory(path.join(studioDir, 'Exports', projectId), result, false);
  await ensureDirectory(exportRoot, result);

  for (const subdir of exportsSubdirs(exportRoot)) {
    await ensureDirectory(subdir, result);
  }

  const sceneManifestPath = path.join(sceneRoot, 'manifests', 'scene-storage.json');
  const assetsManifestPath = path.join(sceneRoot, 'manifests', 'assets.json');
  const shotManifestPath = path.join(
    sceneRoot,
    'shots',
    initialShotId,
    'manifests',
    'shot.json'
  );

  await writeManifest(
    sceneManifestPath,
    {
      schemaVersion: 1,
      createdAt: nowIso,
      projectId,
      sceneId,
      initialShotId,
      sourceBriefPath: briefPath,
      assetsRoot,
      exportRoot,
      shotManifestPath,
      assetsManifestPath,
      sceneBriefRef: {
        projectId: sceneBrief.projectId || projectId,
        sceneId: sceneBrief.sceneId || sceneId
      }
    },
    result
  );

  await writeManifest(
    assetsManifestPath,
    {
      schemaVersion: 2,
      createdAt: nowIso,
      projectId,
      sceneId,
      shotOrder: [initialShotId],
      assetOrder: {
        characters: [],
        objects: [],
        locations: []
      },
      shots: {
        [initialShotId]: {
          assetIds: [],
          locationIds: []
        }
      },
      assets: {},
      notes: {
        purpose:
          'Indice relacional de escena-shots-assets. El tracking de madurez vive en los catalogos de assets.'
      }
    },
    result
  );

  await writeManifest(
    shotManifestPath,
    {
      schemaVersion: 1,
      createdAt: nowIso,
      projectId,
      sceneId,
      shotId: initialShotId,
      status: 'draft',
      exportsRoot: exportRoot,
      blenderBridge: {
        framesDir: path.join(exportRoot, 'blender', 'frames'),
        controlsDir: path.join(exportRoot, 'blender', 'controls'),
        refsDir: path.join(exportRoot, 'blender', 'refs'),
        manifestsDir: path.join(exportRoot, 'blender', 'manifests')
      },
      comfyuiBridge: {
        inputDir: path.join(exportRoot, 'comfyui', 'input'),
        outputDir: path.join(exportRoot, 'comfyui', 'output'),
        tempDir: path.join(exportRoot, 'comfyui', 'temp'),
        logsDir: path.join(exportRoot, 'comfyui', 'logs')
      }
    },
    result
  );

  if (result.collisionPaths.length > 0) {
    result.status = 'collision';
    result.message = sceneStorageMessage('collision');
    return result;
  }

  result.status = 'created';
  result.message = sceneStorageMessage('created');
  return result;
}
