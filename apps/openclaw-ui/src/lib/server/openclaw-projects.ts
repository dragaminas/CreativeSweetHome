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
    createStageState('base_animation', 'pending'),
    createStageState('asset_animation', 'pending'),
    createStageState('animation_composition', 'pending'),
    createStageState('composition_render', 'pending')
  ];
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
