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
  Shot,
  ShotStage,
  StageState
} from '../../types/project';
import type {
  AddAssetToProjectCommand,
  AddSceneToProjectCommand,
  CommandDispatchResult,
  CommandResult,
  ProjectUiServices,
  RenameAssetCommand,
  RenameProjectCommand,
  SetAssetTypeCommand,
  UpdateAssetDescriptionCommand,
  UpdateProjectDescriptionCommand
} from '../../types/navigation/projectEdition/applicationServices';
import type { RenameEntityCommand, UpdateEntityDescriptionCommand } from '../../types/navigation/projectEdition/baseEdition';
import type {
  AddShotToSceneCommand,
  GenerateScenePreviewCommand,
  ReorderSceneShotsCommand,
  SetSceneAssetsCommand,
  SetSceneLocationsCommand,
  UpdateSceneScriptCommand
} from '../../types/navigation/projectEdition/sceneEdition';
import type {
  BindAssetToShotCommand,
  GenerateShotBaseAnimationCommand,
  GenerateShotBaseFrameCommand,
  GenerateShotPreviewCommand,
  OpenShotInVideoEditorCommand,
  SetShotLocationCommand,
  SetShotTimingCommand,
  UnbindAssetFromShotCommand,
  UpdateShotFramingCommand
} from '../../types/navigation/projectEdition/shotEdition';
import {
  buildAssetEditionFromSnapshot,
  buildNavigationPanelFromSnapshot,
  buildProjectEditionFromSnapshot,
  buildSceneEditionFromSnapshot,
  buildShotEditionFromSnapshot
} from '../adapters/project-edition-adapters';

const INITIAL_TIMESTAMP = new Date('2026-05-16T09:00:00.000Z').getTime();

export const DEFAULT_IN_MEMORY_PROJECT_ID = 'pilot-project';
export const DEFAULT_IN_MEMORY_SCENE_ID = 'sc001';

export interface InMemoryProjectUiServices extends ProjectUiServices {
  getSnapshot(): DomainSnapshot;
  reset(): void;
}

interface InMemoryServicesOptions {
  seedSnapshot?: DomainSnapshot;
}

function cloneSnapshot(snapshot: DomainSnapshot): DomainSnapshot {
  return structuredClone(snapshot);
}

function createStageState<TStage extends string>(stage: TStage, status: StageState<TStage>['status']): StageState<TStage> {
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
    createStageState('scene_scaffold', 'ready'),
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

function buildDefaultSnapshot(): DomainSnapshot {
  const now = new Date(INITIAL_TIMESTAMP).toISOString();

  const project: Project = {
    id: DEFAULT_IN_MEMORY_PROJECT_ID,
    name: 'Pilot Project',
    description: 'Mock project for deterministic UI seams.',
    createdAt: now,
    updatedAt: now,
    scriptIds: ['script-main'],
    sceneIds: [DEFAULT_IN_MEMORY_SCENE_ID],
    assetIds: ['asset-nora', 'loc-alley'],
    locationIds: ['loc-alley'],
    pipeline: createProjectPipeline()
  };

  const scene: Scene = {
    id: DEFAULT_IN_MEMORY_SCENE_ID,
    name: 'Opening Alley',
    description: 'Initial scene scaffolded from the phase16 brief.',
    createdAt: now,
    updatedAt: now,
    projectId: project.id,
    scriptId: 'script-main',
    shotIds: ['sh010'],
    locationIds: ['loc-alley'],
    assetIds: ['asset-nora', 'loc-alley'],
    artifacts: [],
    operations: [],
    pipeline: createScenePipeline()
  };

  const shot: Shot = {
    id: 'sh010',
    name: 'Shot 010',
    description: 'Nora enters the rainy alley.',
    createdAt: now,
    updatedAt: now,
    projectId: project.id,
    sceneId: scene.id,
    scriptBeatId: 'beat-001',
    locationId: 'loc-alley',
    order: 1,
    durationMs: 4800,
    frameRate: 24,
    framing: {
      shotSize: 'ms',
      cameraAngle: 'eye',
      cameraMove: 'dolly',
      lensMm: 35
    },
    assetBindings: [],
    artifacts: [],
    operations: [],
    pipeline: createShotPipeline()
  };

  const asset: AssetDefinition = {
    id: 'asset-nora',
    name: 'Nora',
    description: 'Main character of the opening chase.',
    createdAt: now,
    updatedAt: now,
    projectId: project.id,
    sceneId: scene.id,
    kind: 'character',
    tags: ['lead', 'phase16'],
    artifacts: [],
    operations: [],
    pipeline: createAssetPipeline()
  };

  const locationAsset: AssetDefinition = {
    id: 'loc-alley',
    name: 'Rainy Alley',
    description: 'Navigable location asset for the opening beat.',
    createdAt: now,
    updatedAt: now,
    projectId: project.id,
    sceneId: scene.id,
    kind: 'location',
    tags: ['location', 'phase16'],
    artifacts: [],
    operations: [],
    pipeline: createAssetPipeline()
  };

  const location: Location = {
    id: 'loc-alley',
    name: 'Rainy Alley',
    description: 'Neon-lit alley used in the opening beat.',
    createdAt: now,
    updatedAt: now,
    projectId: project.id,
    sceneId: scene.id,
    setAssetIds: ['asset-nora'],
    zones: [],
    constraints: ['wet surface continuity'],
    artifacts: []
  };

  return {
    project,
    scripts: [
      {
        id: 'script-main',
        name: 'Pilot Script',
        description: 'Baseline script for project scaffolding.',
        createdAt: now,
        updatedAt: now,
        projectId: project.id,
        version: 1,
        status: 'approved',
        beats: [
          {
            beatId: 'beat-001',
            order: 1,
            objective: 'Introduce Nora and establish urgency.',
            emotionalTone: 'tense',
            sceneId: scene.id,
            shotIds: [shot.id],
            requiredAssetIds: [asset.id],
            notes: 'Keep camera close to Nora.'
          }
        ]
      }
    ],
    scenes: [scene],
    shots: [shot],
    assets: [asset, locationAsset],
    locations: [location]
  };
}

function defaultAssetName(kind: AssetKind, index: number): string {
  if (kind === 'character') {
    return `Character ${index}`;
  }

  if (kind === 'location') {
    return `Location ${index}`;
  }

  return `Asset ${index}`;
}

export function createInMemoryProjectUiServices(
  options: InMemoryServicesOptions = {}
): InMemoryProjectUiServices {
  const seedSnapshot = cloneSnapshot(options.seedSnapshot ?? buildDefaultSnapshot());

  let snapshot = cloneSnapshot(seedSnapshot);
  let operationCounter = 1;
  let timeCounter = 1;

  const nextOperationId = (): string => {
    const operationId = `mock-op-${String(operationCounter).padStart(4, '0')}`;
    operationCounter += 1;
    return operationId;
  };

  const nextTimestamp = (): string => {
    const value = new Date(INITIAL_TIMESTAMP + timeCounter * 1000).toISOString();
    timeCounter += 1;
    return value;
  };

  const accepted = (message: string): CommandDispatchResult => ({
    accepted: true,
    message,
    operationId: nextOperationId()
  });

  const rejected = (message: string): CommandDispatchResult => ({
    accepted: false,
    message
  });

  const findScene = (sceneId: string) => snapshot.scenes.find((entry) => entry.id === sceneId);
  const findShot = (shotId: string) => snapshot.shots.find((entry) => entry.id === shotId);
  const findAsset = (assetId: string) => snapshot.assets.find((entry) => entry.id === assetId);
  const findLocation = (locationId: string) => snapshot.locations.find((entry) => entry.id === locationId);

  const touch = (entity: { updatedAt: string }) => {
    entity.updatedAt = nextTimestamp();
  };

  const ensureProject = (projectId: string): CommandDispatchResult | null => {
    if (snapshot.project.id !== projectId) {
      return rejected(`Unknown projectId: ${projectId}`);
    }

    return null;
  };

  const asResult = async (result: CommandDispatchResult): CommandResult => result;

  const services = {} as InMemoryProjectUiServices;

  services.navigationQueries = {
    getNavigationPanel: async (projectId: string) => buildNavigationPanelFromSnapshot(snapshot, projectId)
  };

  services.editionQueries = {
    getProjectEdition: async (projectId: string) =>
      buildProjectEditionFromSnapshot(snapshot, projectId, services),
    getSceneEdition: async (sceneId: string) =>
      buildSceneEditionFromSnapshot(snapshot, sceneId, services),
    getShotEdition: async (shotId: string) =>
      buildShotEditionFromSnapshot(snapshot, shotId, services),
    getAssetEdition: async (assetId: string) =>
      buildAssetEditionFromSnapshot(snapshot, assetId, services)
  };

  services.projectCommands = {
    renameProject: async (command: RenameProjectCommand) => {
      const projectError = ensureProject(command.projectId);
      if (projectError) {
        return asResult(projectError);
      }

      snapshot.project.name = command.name;
      touch(snapshot.project);
      return asResult(accepted(`Project renamed to ${command.name}.`));
    },
    updateProjectDescription: async (command: UpdateProjectDescriptionCommand) => {
      const projectError = ensureProject(command.projectId);
      if (projectError) {
        return asResult(projectError);
      }

      snapshot.project.description = command.description;
      touch(snapshot.project);
      return asResult(accepted('Project description updated.'));
    },
    addScene: async (command: AddSceneToProjectCommand) => {
      const projectError = ensureProject(command.projectId);
      if (projectError) {
        return asResult(projectError);
      }

      const nextIndex = snapshot.scenes.length + 1;
      const sceneId = command.sceneId ?? `sc${String(nextIndex).padStart(3, '0')}`;
      if (findScene(sceneId)) {
        return asResult(rejected(`Scene ${sceneId} already exists.`));
      }

      const locationId = `loc-${sceneId}`;
      const now = nextTimestamp();
      const scene: Scene = {
        id: sceneId,
        name: `Scene ${nextIndex}`,
        description: 'Seeded from in-memory project seam.',
        createdAt: now,
        updatedAt: now,
        projectId: snapshot.project.id,
        scriptId: snapshot.project.scriptIds[0] ?? 'script-main',
        shotIds: [],
        locationIds: [locationId],
        assetIds: [],
        artifacts: [],
        operations: [],
        pipeline: createScenePipeline()
      };

      const location: Location = {
        id: locationId,
        name: `Location ${nextIndex}`,
        description: 'Auto-generated scene location for UI prototyping.',
        createdAt: now,
        updatedAt: now,
        projectId: snapshot.project.id,
        sceneId,
        setAssetIds: [],
        zones: [],
        constraints: [],
        artifacts: []
      };

      snapshot.scenes.push(scene);
      snapshot.locations.push(location);
      snapshot.project.sceneIds.push(sceneId);
      snapshot.project.locationIds.push(locationId);
      touch(snapshot.project);

      return asResult(accepted(`Scene ${sceneId} added to project.`));
    },
    addAsset: async (command: AddAssetToProjectCommand) => {
      const projectError = ensureProject(command.projectId);
      if (projectError) {
        return asResult(projectError);
      }

      const nextIndex = snapshot.assets.length + 1;
      const assetId = command.assetId ?? `asset-${String(nextIndex).padStart(3, '0')}`;
      if (findAsset(assetId)) {
        return asResult(rejected(`Asset ${assetId} already exists.`));
      }

      const targetScene = snapshot.scenes[0];
      if (!targetScene) {
        return asResult(rejected('Cannot add asset without a scene in the snapshot.'));
      }

      const kind = command.assetType ?? 'object';
      const now = nextTimestamp();
      const asset: AssetDefinition = {
        id: assetId,
        name: defaultAssetName(kind, nextIndex),
        description: `In-memory ${kind} asset`,
        createdAt: now,
        updatedAt: now,
        projectId: snapshot.project.id,
        sceneId: targetScene.id,
        kind,
        tags: ['mock'],
        artifacts: [],
        operations: [],
        pipeline: createAssetPipeline()
      };

      snapshot.assets.push(asset);
      snapshot.project.assetIds.push(assetId);
      if (!targetScene.assetIds.includes(assetId)) {
        targetScene.assetIds.push(assetId);
      }
      touch(snapshot.project);
      touch(targetScene);

      return asResult(accepted(`Asset ${assetId} added to project.`));
    }
  };

  services.sceneCommands = {
    renameScene: async (command: RenameEntityCommand) => {
      const scene = findScene(command.entityId);
      if (!scene) {
        return asResult(rejected(`Unknown sceneId: ${command.entityId}`));
      }

      scene.name = command.name;
      touch(scene);
      return asResult(accepted(`Scene ${scene.id} renamed.`));
    },
    updateSceneDescription: async (command: UpdateEntityDescriptionCommand) => {
      const scene = findScene(command.entityId);
      if (!scene) {
        return asResult(rejected(`Unknown sceneId: ${command.entityId}`));
      }

      scene.description = command.description;
      touch(scene);
      return asResult(accepted(`Scene ${scene.id} description updated.`));
    },
    updateSceneScript: async (command: UpdateSceneScriptCommand) => {
      const scene = findScene(command.sceneId);
      if (!scene) {
        return asResult(rejected(`Unknown sceneId: ${command.sceneId}`));
      }

      scene.scriptId = command.scriptId;
      touch(scene);
      return asResult(accepted(`Scene ${scene.id} script updated.`));
    },
    setSceneAssets: async (command: SetSceneAssetsCommand) => {
      const scene = findScene(command.sceneId);
      if (!scene) {
        return asResult(rejected(`Unknown sceneId: ${command.sceneId}`));
      }

      scene.assetIds = [...command.assetIds];
      touch(scene);
      return asResult(accepted(`Scene ${scene.id} assets reassigned.`));
    },
    setSceneLocations: async (command: SetSceneLocationsCommand) => {
      const scene = findScene(command.sceneId);
      if (!scene) {
        return asResult(rejected(`Unknown sceneId: ${command.sceneId}`));
      }

      scene.locationIds = [...command.locationIds];
      touch(scene);
      return asResult(accepted(`Scene ${scene.id} locations reassigned.`));
    },
    addShotToScene: async (command: AddShotToSceneCommand) => {
      const scene = findScene(command.sceneId);
      if (!scene) {
        return asResult(rejected(`Unknown sceneId: ${command.sceneId}`));
      }

      const nextIndex = snapshot.shots.length + 1;
      const shotId = command.shotId ?? `sh${String(nextIndex * 10).padStart(3, '0')}`;
      if (findShot(shotId)) {
        return asResult(rejected(`Shot ${shotId} already exists.`));
      }

      const locationId = scene.locationIds[0] ?? snapshot.project.locationIds[0];
      if (!locationId) {
        return asResult(rejected('No location available for new shot.'));
      }

      const now = nextTimestamp();
      const shot: Shot = {
        id: shotId,
        name: `Shot ${shotId.slice(2)}`,
        description: 'In-memory shot created from scene seam.',
        createdAt: now,
        updatedAt: now,
        projectId: snapshot.project.id,
        sceneId: scene.id,
        locationId,
        order: scene.shotIds.length + 1,
        durationMs: 4000,
        frameRate: 24,
        framing: {
          shotSize: 'ms',
          cameraAngle: 'eye',
          cameraMove: 'static',
          lensMm: 35
        },
        assetBindings: [],
        artifacts: [],
        operations: [],
        pipeline: createShotPipeline()
      };

      snapshot.shots.push(shot);

      if (command.insertAfterShotId) {
        const afterIndex = scene.shotIds.indexOf(command.insertAfterShotId);
        if (afterIndex >= 0) {
          scene.shotIds.splice(afterIndex + 1, 0, shotId);
        } else {
          scene.shotIds.push(shotId);
        }
      } else {
        scene.shotIds.push(shotId);
      }

      scene.shotIds.forEach((id, index) => {
        const currentShot = findShot(id);
        if (currentShot) {
          currentShot.order = index + 1;
          touch(currentShot);
        }
      });

      touch(scene);
      return asResult(accepted(`Shot ${shotId} added to scene ${scene.id}.`));
    },
    reorderSceneShots: async (command: ReorderSceneShotsCommand) => {
      const scene = findScene(command.sceneId);
      if (!scene) {
        return asResult(rejected(`Unknown sceneId: ${command.sceneId}`));
      }

      const currentIds = [...scene.shotIds].sort();
      const requestedIds = [...command.orderedShotIds].sort();
      if (currentIds.join('|') !== requestedIds.join('|')) {
        return asResult(rejected('Ordered shot IDs must match the existing scene shots.'));
      }

      scene.shotIds = [...command.orderedShotIds];
      scene.shotIds.forEach((id, index) => {
        const shot = findShot(id);
        if (shot) {
          shot.order = index + 1;
          touch(shot);
        }
      });
      touch(scene);

      return asResult(accepted(`Scene ${scene.id} shot order updated.`));
    },
    generateScenePreview: async (command: GenerateScenePreviewCommand) => {
      const scene = findScene(command.sceneId);
      if (!scene) {
        return asResult(rejected(`Unknown sceneId: ${command.sceneId}`));
      }

      touch(scene);
      return asResult(accepted(`Preview generation queued for scene ${scene.id}.`));
    }
  };

  services.shotCommands = {
    renameShot: async (command: RenameEntityCommand) => {
      const shot = findShot(command.entityId);
      if (!shot) {
        return asResult(rejected(`Unknown shotId: ${command.entityId}`));
      }

      shot.name = command.name;
      touch(shot);
      return asResult(accepted(`Shot ${shot.id} renamed.`));
    },
    updateShotDescription: async (command: UpdateEntityDescriptionCommand) => {
      const shot = findShot(command.entityId);
      if (!shot) {
        return asResult(rejected(`Unknown shotId: ${command.entityId}`));
      }

      shot.description = command.description;
      touch(shot);
      return asResult(accepted(`Shot ${shot.id} description updated.`));
    },
    setShotTiming: async (command: SetShotTimingCommand) => {
      const shot = findShot(command.shotId);
      if (!shot) {
        return asResult(rejected(`Unknown shotId: ${command.shotId}`));
      }

      shot.durationMs = command.durationMs;
      shot.frameRate = command.frameRate;
      touch(shot);
      return asResult(accepted(`Shot ${shot.id} timing updated.`));
    },
    updateShotFraming: async (command: UpdateShotFramingCommand) => {
      const shot = findShot(command.shotId);
      if (!shot) {
        return asResult(rejected(`Unknown shotId: ${command.shotId}`));
      }

      shot.framing = command.framing;
      touch(shot);
      return asResult(accepted(`Shot ${shot.id} framing updated.`));
    },
    setShotLocation: async (command: SetShotLocationCommand) => {
      const shot = findShot(command.shotId);
      if (!shot) {
        return asResult(rejected(`Unknown shotId: ${command.shotId}`));
      }

      if (!findLocation(command.locationId)) {
        return asResult(rejected(`Unknown locationId: ${command.locationId}`));
      }

      shot.locationId = command.locationId;
      touch(shot);
      return asResult(accepted(`Shot ${shot.id} location updated.`));
    },
    bindAssetToShot: async (command: BindAssetToShotCommand) => {
      const shot = findShot(command.shotId);
      if (!shot) {
        return asResult(rejected(`Unknown shotId: ${command.shotId}`));
      }

      const asset = findAsset(command.assetId);
      if (!asset) {
        return asResult(rejected(`Unknown assetId: ${command.assetId}`));
      }

      const exists = shot.assetBindings.some((binding) => binding.assetId === command.assetId);
      if (!exists) {
        shot.assetBindings.push({
          assetId: command.assetId,
          role: command.role,
          requiredStage: command.requiredStage,
          actions: []
        });
      }

      touch(shot);
      touch(asset);
      return asResult(accepted(`Asset ${command.assetId} bound to shot ${shot.id}.`));
    },
    unbindAssetFromShot: async (command: UnbindAssetFromShotCommand) => {
      const shot = findShot(command.shotId);
      if (!shot) {
        return asResult(rejected(`Unknown shotId: ${command.shotId}`));
      }

      shot.assetBindings = shot.assetBindings.filter((binding) => binding.assetId !== command.assetId);
      touch(shot);
      return asResult(accepted(`Asset ${command.assetId} unbound from shot ${shot.id}.`));
    },
    generateShotBaseAnimation: async (command: GenerateShotBaseAnimationCommand) => {
      const shot = findShot(command.shotId);
      if (!shot) {
        return asResult(rejected(`Unknown shotId: ${command.shotId}`));
      }

      touch(shot);
      return asResult(accepted(`Base animation queued for shot ${shot.id}.`));
    },
    generateShotBaseFrame: async (command: GenerateShotBaseFrameCommand) => {
      const shot = findShot(command.shotId);
      if (!shot) {
        return asResult(rejected(`Unknown shotId: ${command.shotId}`));
      }

      touch(shot);
      return asResult(accepted(`Base frame queued for shot ${shot.id}.`));
    },
    generateShotPreview: async (command: GenerateShotPreviewCommand) => {
      const shot = findShot(command.shotId);
      if (!shot) {
        return asResult(rejected(`Unknown shotId: ${command.shotId}`));
      }

      touch(shot);
      return asResult(accepted(`Preview queued for shot ${shot.id}.`));
    },
    openShotInVideoEditor: async (command: OpenShotInVideoEditorCommand) => {
      const shot = findShot(command.shotId);
      if (!shot) {
        return asResult(rejected(`Unknown shotId: ${command.shotId}`));
      }

      return asResult(accepted(`Shot ${shot.id} opened in video editor seam.`));
    }
  };

  services.assetCommands = {
    renameAsset: async (command: RenameAssetCommand) => {
      const asset = findAsset(command.assetId);
      if (!asset) {
        return asResult(rejected(`Unknown assetId: ${command.assetId}`));
      }

      asset.name = command.name;
      touch(asset);
      return asResult(accepted(`Asset ${asset.id} renamed.`));
    },
    setAssetType: async (command: SetAssetTypeCommand) => {
      const asset = findAsset(command.assetId);
      if (!asset) {
        return asResult(rejected(`Unknown assetId: ${command.assetId}`));
      }

      asset.kind = command.assetType;
      touch(asset);
      return asResult(accepted(`Asset ${asset.id} type updated.`));
    },
    updateAssetDescription: async (command: UpdateAssetDescriptionCommand) => {
      const asset = findAsset(command.assetId);
      if (!asset) {
        return asResult(rejected(`Unknown assetId: ${command.assetId}`));
      }

      asset.description = command.description;
      touch(asset);
      return asResult(accepted(`Asset ${asset.id} description updated.`));
    },
    generateImage: async (command) => {
      const asset = findAsset(command.assetId);
      if (!asset) {
        return asResult(rejected(`Unknown assetId: ${command.assetId}`));
      }

      touch(asset);
      return asResult(accepted(`Image generation queued for asset ${asset.id}.`));
    },
    uploadImage: async (command) => {
      const asset = findAsset(command.assetId);
      if (!asset) {
        return asResult(rejected(`Unknown assetId: ${command.assetId}`));
      }

      touch(asset);
      return asResult(accepted(`Image uploaded for asset ${asset.id}.`));
    },
    generateModel: async (command) => {
      const asset = findAsset(command.assetId);
      if (!asset) {
        return asResult(rejected(`Unknown assetId: ${command.assetId}`));
      }

      touch(asset);
      return asResult(accepted(`3D model generation queued for asset ${asset.id}.`));
    },
    uploadModel: async (command) => {
      const asset = findAsset(command.assetId);
      if (!asset) {
        return asResult(rejected(`Unknown assetId: ${command.assetId}`));
      }

      touch(asset);
      return asResult(accepted(`3D model uploaded for asset ${asset.id}.`));
    },
    openInBlender: async (command) => {
      const asset = findAsset(command.assetId);
      if (!asset) {
        return asResult(rejected(`Unknown assetId: ${command.assetId}`));
      }

      return asResult(accepted(`Asset ${asset.id} opened in Blender seam.`));
    },
    improveMesh: async (command) => {
      const asset = findAsset(command.assetId);
      if (!asset) {
        return asResult(rejected(`Unknown assetId: ${command.assetId}`));
      }

      touch(asset);
      return asResult(accepted(`Mesh improvement queued for asset ${asset.id}.`));
    },
    improveRigging: async (command) => {
      const asset = findAsset(command.assetId);
      if (!asset) {
        return asResult(rejected(`Unknown assetId: ${command.assetId}`));
      }

      touch(asset);
      return asResult(accepted(`Rigging improvement queued for asset ${asset.id}.`));
    }
  };

  services.getSnapshot = () => cloneSnapshot(snapshot);

  services.reset = () => {
    snapshot = cloneSnapshot(seedSnapshot);
    operationCounter = 1;
    timeCounter = 1;
  };

  return services;
}
