import fs from 'node:fs/promises';
import path from 'node:path';

import { resolveRepoContext } from './env';

export type AssetKind = 'character' | 'object';

export const ASSET_MATURITY_STAGES = [
  'description',
  'reference_image',
  'model_3d',
  'default_benchmark_animation',
  'asset_correction_through_benchmark_animation'
] as const;

export type AssetStage = (typeof ASSET_MATURITY_STAGES)[number];

export type AssetStageState = 'pending' | 'in_progress' | 'ready' | 'failed';

export interface AssetEntry {
  assetId: string;
  kind: AssetKind;
  label: string;
  description: string;
  stage: AssetStage;
  stageState: AssetStageState;
  tags: string[];
  references: string[];
  manifestPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetCatalogManifest {
  schemaVersion: number;
  projectId: string;
  sceneId: string;
  kind: AssetKind;
  assets: AssetEntry[];
  readiness: Record<AssetStage, AssetStageState>;
  updatedAt: string;
}

export interface CreateAssetInput {
  projectId: string;
  sceneId: string;
  kind: AssetKind;
  label: string;
  description?: string;
  tags?: string[];
  references?: string[];
}

export interface UpdateAssetInput {
  projectId: string;
  sceneId: string;
  kind: AssetKind;
  assetId: string;
  label?: string;
  description?: string;
  stage?: AssetStage;
  stageState?: AssetStageState;
  tags?: string[];
  references?: string[];
}

export interface DeleteAssetInput {
  projectId: string;
  sceneId: string;
  kind: AssetKind;
  assetId: string;
}

export interface ListAssetsInput {
  projectId: string;
  sceneId: string;
  kind?: AssetKind;
}

export interface AssetCatalogResult {
  status: 'created' | 'updated' | 'deleted' | 'not_found' | 'collision' | 'fail_compile' | 'fail_runtime';
  message: string;
  projectId: string;
  sceneId: string;
  kind: AssetKind;
  assetId?: string;
  manifestPath?: string;
  asset?: AssetEntry;
}

export interface ListAssetsResult {
  status: 'ok' | 'empty' | 'fail_compile' | 'fail_runtime';
  message: string;
  projectId: string;
  sceneId: string;
  kind?: AssetKind;
  total: number;
  assets: AssetEntry[];
  manifestPath?: string;
}

interface CatalogManifestShape {
  schemaVersion: number;
  projectId: string;
  sceneId: string;
  kind: AssetKind;
  assets: AssetEntry[];
  readiness: Record<AssetStage, AssetStageState>;
  updatedAt: string;
}

interface SceneAssetsIndexManifest {
  schemaVersion?: number;
  projectId?: string;
  sceneId?: string;
  shotOrder?: string[];
  assetOrder?: {
    characters?: string[];
    objects?: string[];
    locations?: string[];
  };
  shots?: Record<string, { assetIds?: string[]; locationIds?: string[] }>;
  assets?: Record<string, { kind?: AssetKind | 'location'; sceneIds?: string[]; shotIds?: string[] }>;
}

const LEGACY_STAGE_MAP: Record<string, AssetStage> = {
  description: 'description',
  reference_image: 'reference_image',
  model_3d: 'model_3d',
  base_animation: 'default_benchmark_animation',
  asset_animation: 'asset_correction_through_benchmark_animation',
  animation_composition: 'asset_correction_through_benchmark_animation',
  composition_render: 'asset_correction_through_benchmark_animation',
  default_benchmark_animation: 'default_benchmark_animation',
  asset_correction_through_benchmark_animation: 'asset_correction_through_benchmark_animation'
};

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

function uniqueIds(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function generateAssetId(kind: AssetKind, index: number): string {
  const prefix = kind === 'character' ? 'chr' : 'obj';
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

function parseAssetIdIndex(assetId: string, kind: AssetKind): number | null {
  const prefix = kind === 'character' ? 'chr' : 'obj';
  const match = new RegExp(`^${prefix}-(\\d+)$`).exec(assetId);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

function nextAssetIndex(assets: AssetEntry[], kind: AssetKind): number {
  const maxIndex = assets.reduce((max, entry) => {
    const parsed = parseAssetIdIndex(entry.assetId, kind);
    if (parsed === null || Number.isNaN(parsed)) {
      return max;
    }
    return Math.max(max, parsed);
  }, 0);

  return maxIndex + 1;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readCatalogManifest(
  manifestPath: string
): Promise<CatalogManifestShape | null> {
  if (!(await pathExists(manifestPath))) {
    return null;
  }

  const raw = await fs.readFile(manifestPath, 'utf8');

  try {
    const parsed = JSON.parse(raw) as CatalogManifestShape;
    const assets = Array.isArray(parsed.assets)
      ? parsed.assets.map((entry) => ({
          ...entry,
          stage: normalizeAssetStage(entry.stage),
          stageState: normalizeStageState(entry.stageState)
        }))
      : [];

    return {
      ...parsed,
      assets,
      readiness: buildReadiness(assets)
    };
  } catch {
    return null;
  }
}

async function writeCatalogManifest(
  manifestPath: string,
  data: CatalogManifestShape
): Promise<void> {
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function defaultReadiness(): Record<AssetStage, AssetStageState> {
  return ASSET_MATURITY_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = 'pending';
      return acc;
    },
    {} as Record<AssetStage, AssetStageState>
  );
}

function normalizeAssetStage(stage: unknown): AssetStage {
  if (typeof stage !== 'string') {
    return 'description';
  }

  return LEGACY_STAGE_MAP[stage] || 'description';
}

function normalizeStageState(stageState: unknown): AssetStageState {
  if (
    stageState === 'pending' ||
    stageState === 'in_progress' ||
    stageState === 'ready' ||
    stageState === 'failed'
  ) {
    return stageState;
  }

  return 'pending';
}

function stageReadiness(
  assets: AssetEntry[],
  stage: AssetStage
): AssetStageState {
  const stageAssets = assets.filter((a) => normalizeAssetStage(a.stage) === stage);
  if (stageAssets.length === 0) return 'pending';

  const hasReady = stageAssets.some((a) => normalizeStageState(a.stageState) === 'ready');
  const hasFailed = stageAssets.some((a) => normalizeStageState(a.stageState) === 'failed');

  if (hasReady) return 'ready';
  if (hasFailed) return 'failed';

  return 'in_progress';
}

function buildReadiness(assets: AssetEntry[]): Record<AssetStage, AssetStageState> {
  return ASSET_MATURITY_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = stageReadiness(assets, stage);
      return acc;
    },
    {} as Record<AssetStage, AssetStageState>
  );
}

function catalogPath(
  projectId: string,
  sceneId: string,
  kind: AssetKind,
  studioDir?: string
): string {
  const context = resolveRepoContext();
  const baseDir = studioDir || context.studioDir;
  return path.join(
    baseDir,
    'Scenes',
    projectId,
    sceneId,
    'manifests',
    `${kind}-catalog.json`
  );
}

function assetStorageDirForKind(kind: AssetKind): 'characters' | 'objects' {
  return kind === 'character' ? 'characters' : 'objects';
}

function sceneAssetsIndexPath(projectId: string, sceneId: string, studioDir?: string): string {
  const context = resolveRepoContext();
  const baseDir = studioDir || context.studioDir;
  return path.join(baseDir, 'Scenes', projectId, sceneId, 'manifests', 'assets.json');
}

async function readSceneAssetsIndex(
  projectId: string,
  sceneId: string
): Promise<SceneAssetsIndexManifest | null> {
  const manifestPath = sceneAssetsIndexPath(projectId, sceneId);
  if (!(await pathExists(manifestPath))) {
    return null;
  }

  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    return JSON.parse(raw) as SceneAssetsIndexManifest;
  } catch {
    return null;
  }
}

async function writeSceneAssetsIndex(
  projectId: string,
  sceneId: string,
  manifest: SceneAssetsIndexManifest
): Promise<void> {
  const manifestPath = sceneAssetsIndexPath(projectId, sceneId);
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function syncSceneAssetsIndexAfterCreate(
  projectId: string,
  sceneId: string,
  kind: AssetKind,
  assetId: string
): Promise<void> {
  const relation = await readSceneAssetsIndex(projectId, sceneId);
  if (!relation) {
    return;
  }

  const assetOrder = relation.assetOrder || {};
  const characters = new Set(assetOrder.characters ?? []);
  const objects = new Set(assetOrder.objects ?? []);

  if (kind === 'character') {
    characters.add(assetId);
  } else {
    objects.add(assetId);
  }

  relation.assetOrder = {
    characters: Array.from(characters),
    objects: Array.from(objects),
    locations: assetOrder.locations ?? []
  };

  relation.assets = relation.assets || {};
  relation.assets[assetId] = {
    kind,
    sceneIds: uniqueIds([...(relation.assets[assetId]?.sceneIds ?? []), sceneId]),
    shotIds: uniqueIds(relation.assets[assetId]?.shotIds ?? [])
  };

  await writeSceneAssetsIndex(projectId, sceneId, relation);
}

async function syncSceneAssetsIndexAfterDelete(
  projectId: string,
  sceneId: string,
  kind: AssetKind,
  assetId: string
): Promise<void> {
  const relation = await readSceneAssetsIndex(projectId, sceneId);
  if (!relation) {
    return;
  }

  const assetOrder = relation.assetOrder || {};
  relation.assetOrder = {
    characters: (assetOrder.characters ?? []).filter((entry) => entry !== assetId),
    objects: (assetOrder.objects ?? []).filter((entry) => entry !== assetId),
    locations: assetOrder.locations ?? []
  };

  if (relation.shots) {
    for (const shot of Object.values(relation.shots)) {
      shot.assetIds = (shot.assetIds ?? []).filter((entry) => entry !== assetId);
    }
  }

  if (relation.assets) {
    delete relation.assets[assetId];
  }

  await writeSceneAssetsIndex(projectId, sceneId, relation);
}

export async function listAssets(
  input: ListAssetsInput
): Promise<ListAssetsResult> {
  const projectId = sanitizeId(input.projectId, 'default');
  const sceneId = sanitizeId(input.sceneId, 'scene-draft');
  const kind = input.kind;

  if (kind) {
    const manifestPath = catalogPath(projectId, sceneId, kind);

    if (!(await pathExists(manifestPath))) {
      return {
        status: 'empty',
        message: `No se encontro catalogo para ${kind} en esta escena.`,
        projectId,
        sceneId,
        kind,
        total: 0,
        assets: []
      };
    }

    const catalog = await readCatalogManifest(manifestPath);

    if (!catalog) {
      return {
        status: 'fail_compile',
        message: 'No se pudo parsear el catalogo de assets.',
        projectId,
        sceneId,
        kind,
        total: 0,
        assets: []
      };
    }

    return {
      status: catalog.assets.length > 0 ? 'ok' : 'empty',
      message: catalog.assets.length > 0
        ? `Se encontraron ${catalog.assets.length} asset(s).`
        : 'No se encontraron assets con ese filtro.',
      projectId,
      sceneId,
      kind,
      total: catalog.assets.length,
      assets: catalog.assets,
      manifestPath
    };
  }

  const manifests = (['character', 'object'] as AssetKind[]).map((assetKind) =>
    catalogPath(projectId, sceneId, assetKind)
  );

  const catalogs = await Promise.all(
    manifests.map(async (manifestPath) => {
      if (!(await pathExists(manifestPath))) {
        return { manifestPath, status: 'missing' as const, catalog: null };
      }

      const catalog = await readCatalogManifest(manifestPath);
      if (!catalog) {
        return { manifestPath, status: 'invalid' as const, catalog: null };
      }

      return { manifestPath, status: 'ok' as const, catalog };
    })
  );

  const invalidCatalog = catalogs.find((entry) => entry.status === 'invalid');
  if (invalidCatalog) {
    return {
      status: 'fail_compile',
      message: `No se pudo parsear el catalogo en ${invalidCatalog.manifestPath}.`,
      projectId,
      sceneId,
      total: 0,
      assets: []
    };
  }

  const assets = catalogs
    .filter((entry): entry is { manifestPath: string; status: 'ok'; catalog: CatalogManifestShape } =>
      entry.status === 'ok'
    )
    .flatMap((entry) => entry.catalog.assets);

  return {
    status: assets.length > 0 ? 'ok' : 'empty',
    message: assets.length > 0
      ? `Se encontraron ${assets.length} asset(s).`
      : 'No se encontraron assets con ese filtro.',
    projectId,
    sceneId,
    total: assets.length,
    assets
  };
}

export async function createAsset(
  input: CreateAssetInput
): Promise<AssetCatalogResult> {
  const context = resolveRepoContext();
  const projectId = sanitizeId(input.projectId, 'default');
  const sceneId = sanitizeId(input.sceneId, 'scene-draft');
  const kind = input.kind;
  const label = input.label.trim();

  if (!label) {
    return {
      status: 'fail_compile',
      message: 'El label del asset es obligatorio.',
      projectId,
      sceneId,
      kind
    };
  }

  const manifestPath = catalogPath(projectId, sceneId, kind);
  let catalog = await readCatalogManifest(manifestPath);

  if (!catalog) {
    catalog = {
      schemaVersion: 1,
      projectId,
      sceneId,
      kind,
      assets: [] as AssetEntry[],
      readiness: defaultReadiness(),
      updatedAt: new Date().toISOString()
    };
  }

  const existingIds = catalog.assets.map((a) => a.label.toLowerCase());
  if (existingIds.includes(label.toLowerCase())) {
    return {
      status: 'collision',
      message: `Ya existe un asset con el label "${label}".`,
      projectId,
      sceneId,
      kind,
      manifestPath
    };
  }

  let nextIndex = nextAssetIndex(catalog.assets, kind);
  let assetId = generateAssetId(kind, nextIndex);
  while (catalog.assets.some((entry) => entry.assetId === assetId)) {
    nextIndex += 1;
    assetId = generateAssetId(kind, nextIndex);
  }

  const now = new Date().toISOString();
  const entry: AssetEntry = {
    assetId,
    kind,
    label,
    description: input.description?.trim() || '',
    stage: 'description',
    stageState: 'pending',
    tags: input.tags || [],
    references: input.references || [],
    manifestPath: path.join(
      context.studioDir,
      'Scenes',
      projectId,
      sceneId,
      'assets',
      assetStorageDirForKind(kind),
      `${assetId}.json`
    ),
    createdAt: now,
    updatedAt: now
  };

  catalog.assets.push(entry);
  catalog.readiness = buildReadiness(catalog.assets);
  catalog.updatedAt = now;

  await writeCatalogManifest(manifestPath, catalog);
  await syncSceneAssetsIndexAfterCreate(projectId, sceneId, kind, assetId);

  return {
    status: 'created',
    message: `Asset "${label}" creado como ${assetId}.`,
    projectId,
    sceneId,
    kind,
    assetId,
    manifestPath,
    asset: entry
  };
}

export async function updateAsset(
  input: UpdateAssetInput
): Promise<AssetCatalogResult> {
  const projectId = sanitizeId(input.projectId, 'default');
  const sceneId = sanitizeId(input.sceneId, 'scene-draft');
  const kind = input.kind;
  const assetId = sanitizeId(input.assetId, '');

  if (!assetId) {
    return {
      status: 'fail_compile',
      message: 'assetId es obligatorio para actualizar un asset.',
      projectId,
      sceneId,
      kind
    };
  }

  const manifestPath = catalogPath(projectId, sceneId, kind);
  const catalog = await readCatalogManifest(manifestPath);

  if (!catalog) {
    return {
      status: 'not_found',
      message: `No se encontro catalogo para ${kind}.`,
      projectId,
      sceneId,
      kind
    };
  }

  const assetIndex = catalog.assets.findIndex((a) => a.assetId === assetId);

  if (assetIndex === -1) {
    return {
      status: 'not_found',
      message: `No se encontro el asset ${assetId} en el catalogo ${kind}.`,
      projectId,
      sceneId,
      kind,
      assetId
    };
  }

  const existing = catalog.assets[assetIndex];
  const now = new Date().toISOString();

  if (input.label !== undefined) {
    existing.label = input.label.trim() || existing.label;
  }
  if (input.description !== undefined) {
    existing.description = input.description.trim() || existing.description;
  }
  if (input.stage !== undefined) {
    existing.stage = normalizeAssetStage(input.stage);
  }
  if (input.stageState !== undefined) {
    existing.stageState = normalizeStageState(input.stageState);
  }
  if (input.tags !== undefined) {
    existing.tags = input.tags;
  }
  if (input.references !== undefined) {
    existing.references = input.references;
  }

  existing.updatedAt = now;

  catalog.assets[assetIndex] = existing;
  catalog.readiness = buildReadiness(catalog.assets);
  catalog.updatedAt = now;

  await writeCatalogManifest(manifestPath, catalog);

  return {
    status: 'updated',
    message: `Asset ${assetId} actualizado.`,
    projectId,
    sceneId,
    kind,
    assetId,
    manifestPath,
    asset: existing
  };
}

export async function deleteAsset(
  input: DeleteAssetInput
): Promise<AssetCatalogResult> {
  const projectId = sanitizeId(input.projectId, 'default');
  const sceneId = sanitizeId(input.sceneId, 'scene-draft');
  const kind = input.kind;
  const assetId = sanitizeId(input.assetId, '');

  if (!assetId) {
    return {
      status: 'fail_compile',
      message: 'assetId es obligatorio para eliminar un asset.',
      projectId,
      sceneId,
      kind
    };
  }

  const manifestPath = catalogPath(projectId, sceneId, kind);
  const catalog = await readCatalogManifest(manifestPath);

  if (!catalog) {
    return {
      status: 'not_found',
      message: `No se encontro catalogo para ${kind}.`,
      projectId,
      sceneId,
      kind
    };
  }

  const assetIndex = catalog.assets.findIndex((a) => a.assetId === assetId);

  if (assetIndex === -1) {
    return {
      status: 'not_found',
      message: `No se encontro el asset ${assetId} en el catalogo ${kind}.`,
      projectId,
      sceneId,
      kind,
      assetId
    };
  }

  const removed = catalog.assets.splice(assetIndex, 1)[0];
  const now = new Date().toISOString();

  catalog.readiness = buildReadiness(catalog.assets);
  catalog.updatedAt = now;

  await writeCatalogManifest(manifestPath, catalog);
  await syncSceneAssetsIndexAfterDelete(projectId, sceneId, kind, assetId);

  return {
    status: 'deleted',
    message: `Asset "${removed.label}" (${assetId}) eliminado del catalogo.`,
    projectId,
    sceneId,
    kind,
    assetId,
    manifestPath
  };
}

export async function getAssetReadiness(
  projectId: string,
  sceneId: string
): Promise<{
  characters: Record<AssetStage, AssetStageState>;
  objects: Record<AssetStage, AssetStageState>;
  overall: Record<AssetStage, AssetStageState>;
}> {
  const context = resolveRepoContext();
  const sceneDir = path.join(
    context.studioDir,
    'Scenes',
    sanitizeId(projectId, 'default'),
    sanitizeId(sceneId, 'scene-draft')
  );

  const charCatalog = await readCatalogManifest(
    path.join(sceneDir, 'manifests', 'character-catalog.json')
  );
  const objCatalog = await readCatalogManifest(
    path.join(sceneDir, 'manifests', 'object-catalog.json')
  );

  const charactersReadiness = charCatalog
    ? buildReadiness(charCatalog.assets)
    : defaultReadiness();

  const objectsReadiness = objCatalog
    ? buildReadiness(objCatalog.assets)
    : defaultReadiness();

  const overall: Record<AssetStage, AssetStageState> = {} as Record<AssetStage, AssetStageState>;

  for (const stage of Object.keys(charactersReadiness) as AssetStage[]) {
    const charState = charactersReadiness[stage];
    const objState = objectsReadiness[stage];

    if (charState === 'failed' || objState === 'failed') {
      overall[stage] = 'failed';
    } else if (charState === 'ready' && objState === 'ready') {
      overall[stage] = 'ready';
    } else if (charState === 'in_progress' || objState === 'in_progress') {
      overall[stage] = 'in_progress';
    } else if (charState === 'ready' || objState === 'ready') {
      overall[stage] = 'in_progress';
    } else {
      overall[stage] = 'pending';
    }
  }

  return {
    characters: charactersReadiness,
    objects: objectsReadiness,
    overall
  };
}
