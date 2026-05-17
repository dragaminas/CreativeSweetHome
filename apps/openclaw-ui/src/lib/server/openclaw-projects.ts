import fs from 'node:fs/promises';
import path from 'node:path';

import type {
  AssetDefinition,
  AssetKind,
  DomainSnapshot,
  Location,
  PipelineStage,
  Project,
  ProjectStage,
  Scene,
  SceneStage,
  Script,
  Shot,
  ShotStage,
  StageState
} from '../types/project';
import { resolveRepoContext } from './env';

export interface OpenClawProjectsLoadOptions {
  projectsDir?: string;
  seedIfMissing?: boolean;
  now?: Date;
}

export interface OpenClawProjectsLoadResult {
  rootDir: string;
  snapshots: DomainSnapshot[];
  warnings: string[];
}

interface ProjectManifest {
  id: string;
  name: string;
  description?: string;
  scriptIds?: string[];
}

interface SceneManifest {
  id: string;
  name: string;
  description?: string;
  scriptId?: string;
}

interface ShotManifest {
  id: string;
  name: string;
  description?: string;
  order?: number;
  durationMs?: number;
  frameRate?: Shot['frameRate'];
  locationId?: string;
  framing?: Shot['framing'];
}

interface AssetManifest {
  id: string;
  name: string;
  description?: string;
  kind: AssetKind;
  tags?: string[];
}

interface RelationManifest {
  schemaVersion: 1;
  projectId: string;
  sceneOrder: string[];
  assetOrder: {
    characters: string[];
    objects: string[];
    locations: string[];
  };
  scenes: Record<string, { shotOrder: string[]; assetIds: string[]; locationIds: string[] }>;
  shots: Record<string, { sceneId: string; assetIds: string[] }>;
  assets: Record<string, { kind: AssetKind; sceneIds: string[]; shotIds: string[] }>;
}

interface SceneBriefManifest {
  projectId?: string;
  sceneId?: string;
  source?: {
    intent?: string;
    narrative?: string;
  };
}

interface SceneStorageManifest {
  projectId?: string;
  sceneId?: string;
  initialShotId?: string;
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
  assets?: Record<string, { kind?: AssetKind; sceneIds?: string[]; shotIds?: string[] }>;
}

interface ShotStorageManifest {
  shotId?: string;
  status?: string;
}

interface CatalogAssetEntry {
  assetId: string;
  label?: string;
  description?: string;
  stage?: PipelineStage;
  stageState?: 'pending' | 'in_progress' | 'ready' | 'failed';
  tags?: string[];
}

interface AssetCatalogManifest {
  kind?: AssetKind;
  assets?: CatalogAssetEntry[];
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function createStageState<TStage extends string>(
  stage: TStage,
  status: StageState<TStage>['status']
): StageState<TStage> {
  return {
    stage,
    status,
    latestArtifactIds: [],
    blockers: []
  };
}

function createProjectPipeline(): StageState<ProjectStage>[] {
  return [
    createStageState('project_setup', 'ready'),
    createStageState('asset_production', 'pending'),
    createStageState('shot_production', 'pending'),
    createStageState('scene_postproduction', 'pending'),
    createStageState('delivery', 'pending')
  ];
}

function createScenePipeline(): StageState<SceneStage>[] {
  return [
    createStageState('scene_brief', 'ready'),
    createStageState('scene_scaffold', 'pending'),
    createStageState('scene_assembly', 'pending'),
    createStageState('scene_refine', 'pending'),
    createStageState('final_scene_export', 'pending')
  ];
}

function createShotPipeline(): StageState<ShotStage>[] {
  return [
    createStageState('shot_brief', 'ready'),
    createStageState('animation_composition', 'pending'),
    createStageState('composition_render', 'pending'),
    createStageState('base_video_export', 'pending'),
    createStageState('initial_image', 'pending'),
    createStageState('shot_generation', 'pending')
  ];
}

function createAssetPipeline(): StageState<PipelineStage>[] {
  return [
    createStageState('description', 'ready'),
    createStageState('reference_image', 'pending'),
    createStageState('model_3d', 'pending'),
    createStageState('default_benchmark_animation', 'pending'),
    createStageState('asset_correction_through_benchmark_animation', 'pending')
  ];
}

function titleFromSlug(raw: string): string {
  return raw
    .split('-')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function toStageStatus(
  stageState: CatalogAssetEntry['stageState'] | undefined
): StageState<PipelineStage>['status'] {
  if (stageState === 'ready') {
    return 'ready';
  }
  if (stageState === 'in_progress') {
    return 'running';
  }
  if (stageState === 'failed') {
    return 'failed';
  }
  return 'pending';
}

function createAssetPipelineFromCatalog(entry: CatalogAssetEntry): StageState<PipelineStage>[] {
  const pipeline = createAssetPipeline();
  const stage = entry.stage ?? 'description';
  const stageIndex = pipeline.findIndex((item) => item.stage === stage);
  const targetIndex = stageIndex === -1 ? 0 : stageIndex;

  for (let index = 0; index < targetIndex; index += 1) {
    pipeline[index] = {
      ...pipeline[index],
      status: 'ready'
    };
  }

  pipeline[targetIndex] = {
    ...pipeline[targetIndex],
    status: toStageStatus(entry.stageState)
  };

  if (pipeline[0]) {
    pipeline[0] = {
      ...pipeline[0],
      status: pipeline[0].status === 'pending' ? 'ready' : pipeline[0].status
    };
  }

  return pipeline;
}

function createScenePipelineFromStorage(
  hasBrief: boolean,
  hasScaffold: boolean
): StageState<SceneStage>[] {
  const pipeline = createScenePipeline();
  pipeline[0] = {
    ...pipeline[0],
    status: hasBrief ? 'ready' : 'pending'
  };
  pipeline[1] = {
    ...pipeline[1],
    status: hasScaffold ? 'ready' : 'pending'
  };
  return pipeline;
}

function nowIso(value?: Date): string {
  return (value ?? new Date()).toISOString();
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function defaultScript(projectId: string, stamp: string): Script {
  return {
    id: 'script-main',
    name: 'Pilot Script',
    description: 'Filesystem-backed script scaffold.',
    createdAt: stamp,
    updatedAt: stamp,
    projectId,
    version: 1,
    status: 'approved',
    beats: []
  };
}

function coalesceFrameRate(value: ShotManifest['frameRate']): Shot['frameRate'] {
  return value ?? 24;
}

function coalesceFraming(value: ShotManifest['framing']): Shot['framing'] {
  return (
    value ?? {
      shotSize: 'ms'
    }
  );
}

async function loadProjectSnapshot(
  rootDir: string,
  folderName: string,
  stamp: string,
  warnings: string[]
): Promise<DomainSnapshot | null> {
  const projectDir = path.join(rootDir, folderName);
  const projectManifest = await readJsonFile<ProjectManifest>(path.join(projectDir, 'project.json'));
  const relations = await readJsonFile<RelationManifest>(path.join(projectDir, 'relations.json'));

  if (!projectManifest || !relations) {
    warnings.push(`Skipping ${folderName}: missing project.json or relations.json.`);
    return null;
  }

  const sceneManifests = new Map<string, SceneManifest>();
  const shotManifests = new Map<string, ShotManifest>();
  const assetManifests = new Map<string, AssetManifest>();

  for (const sceneId of relations.sceneOrder) {
    const scenePath = path.join(projectDir, 'scenes', sceneId, 'scene.json');
    const scene = await readJsonFile<SceneManifest>(scenePath);
    if (!scene) {
      warnings.push(`Project ${projectManifest.id} references missing scene ${sceneId}.`);
      continue;
    }
    sceneManifests.set(sceneId, scene);

    const sceneRelation = relations.scenes[sceneId];
    if (!sceneRelation) {
      continue;
    }

    for (const shotId of sceneRelation.shotOrder) {
      const shotPath = path.join(projectDir, 'scenes', sceneId, 'shots', shotId, 'shot.json');
      const shot = await readJsonFile<ShotManifest>(shotPath);
      if (!shot) {
        warnings.push(`Project ${projectManifest.id} references missing shot ${shotId}.`);
        continue;
      }
      shotManifests.set(shotId, shot);
    }
  }

  const orderedAssetIds = [
    ...relations.assetOrder.characters,
    ...relations.assetOrder.objects,
    ...relations.assetOrder.locations
  ];

  for (const assetId of orderedAssetIds) {
    const relationAsset = relations.assets[assetId];
    if (!relationAsset) {
      warnings.push(`Project ${projectManifest.id} has missing relation entry for asset ${assetId}.`);
      continue;
    }

    const assetPath = path.join(
      projectDir,
      'assets',
      `${relationAsset.kind}s`,
      assetId,
      'asset.json'
    );
    const asset = await readJsonFile<AssetManifest>(assetPath);
    if (!asset) {
      warnings.push(`Project ${projectManifest.id} references missing asset ${assetId}.`);
      continue;
    }
    assetManifests.set(assetId, asset);
  }

  const existingSceneIds = relations.sceneOrder.filter((sceneId) => sceneManifests.has(sceneId));
  const existingAssetIds = orderedAssetIds.filter((assetId) => assetManifests.has(assetId));
  const locationAssetIds = existingAssetIds.filter(
    (assetId) => assetManifests.get(assetId)?.kind === 'location'
  );

  const project: Project = {
    id: projectManifest.id,
    name: projectManifest.name,
    description: projectManifest.description,
    createdAt: stamp,
    updatedAt: stamp,
    scriptIds: projectManifest.scriptIds ?? ['script-main'],
    sceneIds: existingSceneIds,
    assetIds: existingAssetIds,
    locationIds: locationAssetIds,
    pipeline: createProjectPipeline()
  };

  const scenes: Scene[] = existingSceneIds.map((sceneId) => {
    const sceneManifest = sceneManifests.get(sceneId)!;
    const sceneRelation = relations.scenes[sceneId] ?? {
      shotOrder: [],
      assetIds: [],
      locationIds: []
    };
    const existingShotIds = sceneRelation.shotOrder.filter((shotId) => shotManifests.has(shotId));
    const existingSceneAssetIds = sceneRelation.assetIds.filter((assetId) =>
      assetManifests.has(assetId)
    );
    const existingLocationIds = sceneRelation.locationIds.filter(
      (locationId) => assetManifests.get(locationId)?.kind === 'location'
    );

    return {
      id: sceneManifest.id,
      name: sceneManifest.name,
      description: sceneManifest.description,
      createdAt: stamp,
      updatedAt: stamp,
      projectId: project.id,
      scriptId: sceneManifest.scriptId ?? project.scriptIds[0] ?? 'script-main',
      shotIds: existingShotIds,
      locationIds: existingLocationIds,
      assetIds: existingSceneAssetIds,
      artifacts: [],
      operations: [],
      pipeline: createScenePipeline()
    };
  });

  const shots: Shot[] = Array.from(shotManifests.values()).map((shotManifest) => {
    const shotRelation = relations.shots[shotManifest.id];
    const sceneId = shotRelation?.sceneId ?? scenes[0]?.id ?? '';
    const locationId = shotManifest.locationId ?? relations.scenes[sceneId]?.locationIds[0] ?? '';

    return {
      id: shotManifest.id,
      name: shotManifest.name,
      description: shotManifest.description,
      createdAt: stamp,
      updatedAt: stamp,
      projectId: project.id,
      sceneId,
      locationId,
      order: shotManifest.order ?? 1,
      durationMs: shotManifest.durationMs ?? 4000,
      frameRate: coalesceFrameRate(shotManifest.frameRate),
      framing: coalesceFraming(shotManifest.framing),
      assetBindings: (shotRelation?.assetIds ?? [])
        .filter((assetId) => assetManifests.has(assetId))
        .map((assetId) => ({
          assetId,
          role: 'primary',
          requiredStage: 'model_3d' as PipelineStage,
          actions: []
        })),
      artifacts: [],
      operations: [],
      pipeline: createShotPipeline()
    };
  });

  const assets: AssetDefinition[] = existingAssetIds.map((assetId) => {
    const assetManifest = assetManifests.get(assetId)!;
    const relationAsset = relations.assets[assetId];
    const firstSceneId = relationAsset?.sceneIds.find((sceneId) => sceneManifests.has(sceneId));

    return {
      id: assetManifest.id,
      name: assetManifest.name,
      description: assetManifest.description,
      createdAt: stamp,
      updatedAt: stamp,
      projectId: project.id,
      sceneId: firstSceneId ?? scenes[0]?.id ?? '',
      kind: assetManifest.kind,
      tags: assetManifest.tags ?? [],
      artifacts: [],
      operations: [],
      pipeline: createAssetPipeline()
    };
  });

  const locations: Location[] = assets
    .filter((asset) => asset.kind === 'location')
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      description: asset.description,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      projectId: asset.projectId,
      sceneId: asset.sceneId,
      setAssetIds: [],
      zones: [],
      constraints: [],
      artifacts: []
    }));

  return {
    project,
    scripts: [defaultScript(project.id, stamp)],
    scenes,
    shots,
    assets,
    locations
  };
}

async function listDirectoryNames(rootDir: string): Promise<string[]> {
  if (!(await pathExists(rootDir))) {
    return [];
  }

  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

function uniqueIds(values: Array<string | undefined>): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    if (!value) {
      continue;
    }
    unique.add(value);
  }
  return Array.from(unique);
}

function sceneNameFromBrief(
  sceneId: string,
  sceneBrief: SceneBriefManifest | null
): string {
  const intent = sceneBrief?.source?.intent?.trim();
  if (intent) {
    return intent;
  }
  return titleFromSlug(sceneId) || sceneId;
}

function projectNameFromId(projectId: string): string {
  const normalized = titleFromSlug(projectId);
  return normalized || projectId;
}

async function readAssetCatalogEntries(
  sceneRoot: string,
  kind: AssetKind
): Promise<CatalogAssetEntry[]> {
  const manifestPath = path.join(sceneRoot, 'manifests', `${kind}-catalog.json`);
  const manifest = await readJsonFile<AssetCatalogManifest>(manifestPath);
  if (!manifest || !Array.isArray(manifest.assets)) {
    return [];
  }

  return manifest.assets;
}

function buildLocationAsset(
  projectId: string,
  sceneId: string,
  locationId: string,
  stamp: string
): AssetDefinition {
  return {
    id: locationId,
    name: titleFromSlug(locationId) || locationId,
    description: 'Location referenced from scene relation index.',
    createdAt: stamp,
    updatedAt: stamp,
    projectId,
    sceneId,
    kind: 'location',
    tags: ['location'],
    artifacts: [],
    operations: [],
    pipeline: createAssetPipeline()
  };
}

function buildLocation(projectId: string, sceneId: string, locationId: string, stamp: string): Location {
  return {
    id: locationId,
    name: titleFromSlug(locationId) || locationId,
    description: 'Scene location loaded from canonical scene manifests.',
    createdAt: stamp,
    updatedAt: stamp,
    projectId,
    sceneId,
    setAssetIds: [],
    zones: [],
    constraints: [],
    artifacts: []
  };
}

async function loadStudioProjectSnapshots(
  studioDir: string,
  stamp: string,
  warnings: string[]
): Promise<DomainSnapshot[]> {
  const scenesRoot = path.join(studioDir, 'Scenes');
  const projectIds = await listDirectoryNames(scenesRoot);
  const snapshots: DomainSnapshot[] = [];

  for (const projectId of projectIds) {
    const projectRoot = path.join(scenesRoot, projectId);
    const sceneIds = await listDirectoryNames(projectRoot);
    if (sceneIds.length === 0) {
      continue;
    }

    const scenes: Scene[] = [];
    const shotsById = new Map<string, Shot>();
    const assetsById = new Map<string, AssetDefinition>();
    const locationsById = new Map<string, Location>();

    for (const sceneId of sceneIds) {
      const sceneRoot = path.join(projectRoot, sceneId);
      const sceneBrief = await readJsonFile<SceneBriefManifest>(
        path.join(sceneRoot, 'briefs', 'scene-brief.json')
      );
      const sceneStorage = await readJsonFile<SceneStorageManifest>(
        path.join(sceneRoot, 'manifests', 'scene-storage.json')
      );
      const assetsIndex = await readJsonFile<SceneAssetsIndexManifest>(
        path.join(sceneRoot, 'manifests', 'assets.json')
      );

      const shotDirs = await listDirectoryNames(path.join(sceneRoot, 'shots'));
      const manifestShotOrder = assetsIndex?.shotOrder ?? [];
      const shotIds = uniqueIds([...manifestShotOrder, ...shotDirs, sceneStorage?.initialShotId]);

      const indexedSceneAssetIds = uniqueIds([
        ...(assetsIndex?.assetOrder?.characters ?? []),
        ...(assetsIndex?.assetOrder?.objects ?? []),
        ...(assetsIndex?.assetOrder?.locations ?? [])
      ]);
      const indexedLocationIds = uniqueIds([
        ...(assetsIndex?.assetOrder?.locations ?? []),
        ...Object.values(assetsIndex?.shots ?? {}).flatMap((shot) => shot.locationIds ?? [])
      ]);

      for (const shotId of shotIds) {
        const shotManifest = await readJsonFile<ShotStorageManifest>(
          path.join(sceneRoot, 'shots', shotId, 'manifests', 'shot.json')
        );
        const shotIndex = assetsIndex?.shots?.[shotId];
        const shotAssetIds = uniqueIds([
          ...(shotIndex?.assetIds ?? []),
          ...(shotIndex?.locationIds ?? [])
        ]);

        shotsById.set(shotId, {
          id: shotId,
          name: `Shot ${shotId.toUpperCase()}`,
          description: shotManifest?.status
            ? `Shot status: ${shotManifest.status}`
            : 'Shot loaded from canonical scene manifests.',
          createdAt: stamp,
          updatedAt: stamp,
          projectId,
          sceneId,
          locationId: shotIndex?.locationIds?.[0] ?? indexedLocationIds[0] ?? '',
          order: manifestShotOrder.indexOf(shotId) >= 0 ? manifestShotOrder.indexOf(shotId) + 1 : 1,
          durationMs: 4000,
          frameRate: 24,
          framing: coalesceFraming(undefined),
          assetBindings: shotAssetIds.map((assetId) => ({
            assetId,
            role: 'primary',
            requiredStage: 'model_3d',
            actions: []
          })),
          artifacts: [],
          operations: [],
          pipeline: createShotPipeline()
        });
      }

      const characterEntries = await readAssetCatalogEntries(sceneRoot, 'character');
      const objectEntries = await readAssetCatalogEntries(sceneRoot, 'object');

      for (const [kind, entries] of [
        ['character', characterEntries],
        ['object', objectEntries]
      ] as const) {
        for (const entry of entries) {
          if (!entry.assetId) {
            continue;
          }
          assetsById.set(entry.assetId, {
            id: entry.assetId,
            name: entry.label?.trim() || entry.assetId,
            description: entry.description?.trim() || '',
            createdAt: stamp,
            updatedAt: stamp,
            projectId,
            sceneId,
            kind,
            tags: entry.tags ?? [],
            artifacts: [],
            operations: [],
            pipeline: createAssetPipelineFromCatalog(entry)
          });
        }
      }

      for (const locationId of indexedLocationIds) {
        if (!assetsById.has(locationId)) {
          assetsById.set(locationId, buildLocationAsset(projectId, sceneId, locationId, stamp));
        }
        if (!locationsById.has(locationId)) {
          locationsById.set(locationId, buildLocation(projectId, sceneId, locationId, stamp));
        }
      }

      const sceneShotIds = shotIds.filter((shotId) => shotsById.has(shotId));
      const sceneAssetIds = uniqueIds([
        ...indexedSceneAssetIds,
        ...characterEntries.map((entry) => entry.assetId),
        ...objectEntries.map((entry) => entry.assetId),
        ...indexedLocationIds
      ]).filter((assetId) => assetsById.has(assetId));

      scenes.push({
        id: sceneId,
        name: sceneNameFromBrief(sceneId, sceneBrief),
        description:
          sceneBrief?.source?.narrative?.trim() || 'Scene loaded from canonical scene manifests.',
        createdAt: stamp,
        updatedAt: stamp,
        projectId,
        scriptId: 'script-main',
        shotIds: sceneShotIds,
        locationIds: indexedLocationIds,
        assetIds: sceneAssetIds,
        artifacts: [],
        operations: [],
        pipeline: createScenePipelineFromStorage(Boolean(sceneBrief), Boolean(sceneStorage || assetsIndex))
      });
    }

    if (scenes.length === 0) {
      warnings.push(
        `Project ${projectId} has no scene manifests under ${path.join(scenesRoot, projectId)}.`
      );
      continue;
    }

    const orderedSceneIds = scenes.map((scene) => scene.id);
    const orderedShots = Array.from(shotsById.values()).filter((shot) =>
      orderedSceneIds.includes(shot.sceneId)
    );
    const orderedAssets = Array.from(assetsById.values());
    const orderedLocations = Array.from(locationsById.values());

    const project: Project = {
      id: projectId,
      name: projectNameFromId(projectId),
      description: `Project loaded from ${path.join(studioDir, 'Scenes', projectId)}.`,
      createdAt: stamp,
      updatedAt: stamp,
      scriptIds: ['script-main'],
      sceneIds: orderedSceneIds,
      assetIds: orderedAssets.map((asset) => asset.id),
      locationIds: orderedLocations.map((location) => location.id),
      pipeline: createProjectPipeline()
    };

    snapshots.push({
      project,
      scripts: [defaultScript(project.id, stamp)],
      scenes,
      shots: orderedShots,
      assets: orderedAssets,
      locations: orderedLocations
    });
  }

  return snapshots;
}

function relationFromSnapshot(snapshot: DomainSnapshot): RelationManifest {
  const characterIds = snapshot.assets
    .filter((asset) => asset.kind === 'character')
    .map((asset) => asset.id);
  const objectIds = snapshot.assets
    .filter((asset) => asset.kind === 'object')
    .map((asset) => asset.id);
  const locationIds = snapshot.assets
    .filter((asset) => asset.kind === 'location')
    .map((asset) => asset.id);

  const scenes: RelationManifest['scenes'] = {};
  for (const scene of snapshot.scenes) {
    scenes[scene.id] = {
      shotOrder: scene.shotIds,
      assetIds: scene.assetIds,
      locationIds: scene.locationIds
    };
  }

  const shots: RelationManifest['shots'] = {};
  for (const shot of snapshot.shots) {
    shots[shot.id] = {
      sceneId: shot.sceneId,
      assetIds: shot.assetBindings.map((binding) => binding.assetId)
    };
  }

  const assets: RelationManifest['assets'] = {};
  for (const asset of snapshot.assets) {
    const sceneIds = snapshot.scenes
      .filter((scene) => scene.assetIds.includes(asset.id))
      .map((scene) => scene.id);
    const shotIds = snapshot.shots
      .filter((shot) => shot.assetBindings.some((binding) => binding.assetId === asset.id))
      .map((shot) => shot.id);
    assets[asset.id] = {
      kind: asset.kind,
      sceneIds,
      shotIds
    };
  }

  return {
    schemaVersion: 1,
    projectId: snapshot.project.id,
    sceneOrder: snapshot.project.sceneIds,
    assetOrder: {
      characters: characterIds,
      objects: objectIds,
      locations: locationIds
    },
    scenes,
    shots,
    assets
  };
}

async function reconcileOpenClawProjectionFromSnapshots(
  rootDir: string,
  snapshots: DomainSnapshot[],
  warnings: string[]
): Promise<void> {
  for (const snapshot of snapshots) {
    const projectDir = path.join(rootDir, snapshot.project.id);
    const relations = relationFromSnapshot(snapshot);

    await writeJson(path.join(projectDir, 'project.json'), {
      id: snapshot.project.id,
      name: snapshot.project.name,
      description: snapshot.project.description,
      scriptIds: snapshot.project.scriptIds
    });

    await writeJson(path.join(projectDir, 'relations.json'), relations);

    for (const scene of snapshot.scenes) {
      await writeJson(path.join(projectDir, 'scenes', scene.id, 'scene.json'), {
        id: scene.id,
        name: scene.name,
        description: scene.description,
        scriptId: scene.scriptId
      });
    }

    for (const shot of snapshot.shots) {
      await writeJson(path.join(projectDir, 'scenes', shot.sceneId, 'shots', shot.id, 'shot.json'), {
        id: shot.id,
        name: shot.name,
        description: shot.description,
        order: shot.order,
        durationMs: shot.durationMs,
        frameRate: shot.frameRate,
        locationId: shot.locationId,
        framing: shot.framing
      });
    }

    for (const asset of snapshot.assets) {
      await writeJson(
        path.join(projectDir, 'assets', `${asset.kind}s`, asset.id, 'asset.json'),
        {
          id: asset.id,
          name: asset.name,
          description: asset.description,
          kind: asset.kind,
          tags: asset.tags
        }
      );
    }
  }

  const projectedProjectIds = new Set(snapshots.map((snapshot) => snapshot.project.id));
  const legacyProjectIds = await listDirectoryNames(rootDir);
  for (const legacyProjectId of legacyProjectIds) {
    if (!projectedProjectIds.has(legacyProjectId)) {
      warnings.push(
        `Legacy projection ${legacyProjectId} has no matching canonical data under STUDIO_DIR/Scenes.`
      );
    }
  }
}

export async function seedDefaultOpenClawProjectTree(rootDir: string, now = new Date()): Promise<void> {
  const stamp = nowIso(now);
  const projectDir = path.join(rootDir, 'pilot-project');

  await writeJson(path.join(projectDir, 'project.json'), {
    id: 'pilot-project',
    name: 'Pilot Project',
    description: 'Filesystem-backed pilot project.',
    scriptIds: ['script-main']
  });

  await writeJson(path.join(projectDir, 'relations.json'), {
    schemaVersion: 1,
    projectId: 'pilot-project',
    sceneOrder: ['sc001'],
    assetOrder: {
      characters: ['asset-nora'],
      objects: [],
      locations: ['loc-alley']
    },
    scenes: {
      sc001: {
        shotOrder: ['sh010'],
        assetIds: ['asset-nora', 'loc-alley'],
        locationIds: ['loc-alley']
      }
    },
    shots: {
      sh010: {
        sceneId: 'sc001',
        assetIds: ['asset-nora', 'loc-alley']
      }
    },
    assets: {
      'asset-nora': {
        kind: 'character',
        sceneIds: ['sc001'],
        shotIds: ['sh010']
      },
      'loc-alley': {
        kind: 'location',
        sceneIds: ['sc001'],
        shotIds: ['sh010']
      }
    }
  });

  await writeJson(path.join(projectDir, 'scenes', 'sc001', 'scene.json'), {
    id: 'sc001',
    name: 'Opening Alley',
    description: 'Initial scene scaffolded from filesystem.',
    scriptId: 'script-main',
    seededAt: stamp
  });

  await writeJson(path.join(projectDir, 'scenes', 'sc001', 'shots', 'sh010', 'shot.json'), {
    id: 'sh010',
    name: 'Shot 010',
    description: 'Nora enters the rainy alley.',
    order: 1,
    durationMs: 4800,
    frameRate: 24,
    locationId: 'loc-alley',
    framing: {
      shotSize: 'ms',
      cameraAngle: 'eye',
      cameraMove: 'dolly',
      lensMm: 35
    },
    seededAt: stamp
  });

  await writeJson(path.join(projectDir, 'assets', 'characters', 'asset-nora', 'asset.json'), {
    id: 'asset-nora',
    name: 'Nora',
    description: 'Main character of the opening chase.',
    kind: 'character',
    tags: ['lead', 'phase16'],
    seededAt: stamp
  });

  await writeJson(path.join(projectDir, 'assets', 'locations', 'loc-alley', 'asset.json'), {
    id: 'loc-alley',
    name: 'Rainy Alley',
    description: 'Neon-lit alley used in the opening beat.',
    kind: 'location',
    tags: ['location', 'phase16'],
    seededAt: stamp
  });

  await fs.mkdir(path.join(projectDir, 'assets', 'objects'), { recursive: true });
}

export async function loadOpenClawProjectSnapshots(
  options: OpenClawProjectsLoadOptions = {}
): Promise<OpenClawProjectsLoadResult> {
  const context = resolveRepoContext();
  const rootDir = options.projectsDir ?? context.openclawProjectsDir;
  const warnings: string[] = [];
  const stamp = nowIso(options.now);
  const studioSnapshots = await loadStudioProjectSnapshots(context.studioDir, stamp, warnings);

  if (studioSnapshots.length > 0) {
    await fs.mkdir(rootDir, { recursive: true });
    await reconcileOpenClawProjectionFromSnapshots(rootDir, studioSnapshots, warnings);
    return {
      rootDir,
      snapshots: studioSnapshots,
      warnings
    };
  }

  if (!(await pathExists(rootDir))) {
    if (options.seedIfMissing) {
      await seedDefaultOpenClawProjectTree(rootDir, options.now);
    } else {
      return {
        rootDir,
        snapshots: [],
        warnings
      };
    }
  }

  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const projectDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const snapshots: DomainSnapshot[] = [];

  for (const folderName of projectDirs) {
    const projectSnapshot = await loadProjectSnapshot(rootDir, folderName, stamp, warnings);
    if (projectSnapshot) {
      snapshots.push(projectSnapshot);
    }
  }

  return {
    rootDir,
    snapshots,
    warnings
  };
}
