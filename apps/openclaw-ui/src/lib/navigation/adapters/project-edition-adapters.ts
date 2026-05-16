import type {
  AssetDefinition,
  AssetKind,
  DomainSnapshot,
  PipelineStage,
  Scene,
  SceneStage,
  Shot,
  ShotStage,
  StageState,
  StageStatus,
  StageProgressView
} from '../../types/project';
import type { AssetDescription, AssetEditor } from '../../types/navigation/projectEdition/assetEdition';
import type { ProjectEdition } from '../../types/navigation/projectEdition/editor';
import type {
  AddShotToSceneCommand,
  GenerateScenePreviewCommand,
  ReorderSceneShotsCommand,
  SceneEdition,
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
  ShotEdition,
  UnbindAssetFromShotCommand,
  UpdateShotFramingCommand
} from '../../types/navigation/projectEdition/shotEdition';
import type {
  ProjectUiServices
} from '../../types/navigation/projectEdition/applicationServices';
import { PROJECT_UI_SERVICE_TARGETS } from '../../types/navigation/projectEdition/applicationServices';
import type { RenameEntityCommand, UpdateEntityDescriptionCommand } from '../../types/navigation/projectEdition/baseEdition';
import type {
  AssetNavigation,
  AssetsNavigation
} from '../../types/navigation/projectNavigation/assetNavigation';
import type { NavigationPanel, ProjectNavigation } from '../../types/navigation/projectNavigation/navigation';
import type { SceneNavigation } from '../../types/navigation/projectNavigation/sceneNavigation';
import type { ShotNavigation } from '../../types/navigation/projectNavigation/shotNavigation';

const DEFAULT_EDITOR_URL = '/';

function ensureProject(snapshot: DomainSnapshot, projectId: string) {
  if (snapshot.project.id !== projectId) {
    throw new Error(`Project ${projectId} was not found in the current snapshot.`);
  }

  return snapshot.project;
}

function ensureScene(snapshot: DomainSnapshot, sceneId: string): Scene {
  const scene = snapshot.scenes.find((entry) => entry.id === sceneId);
  if (!scene) {
    throw new Error(`Scene ${sceneId} was not found in the current snapshot.`);
  }

  return scene;
}

function ensureShot(snapshot: DomainSnapshot, shotId: string): Shot {
  const shot = snapshot.shots.find((entry) => entry.id === shotId);
  if (!shot) {
    throw new Error(`Shot ${shotId} was not found in the current snapshot.`);
  }

  return shot;
}

function ensureAsset(snapshot: DomainSnapshot, assetId: string): AssetDefinition {
  const asset = snapshot.assets.find((entry) => entry.id === assetId);
  if (!asset) {
    throw new Error(`Asset ${assetId} was not found in the current snapshot.`);
  }

  return asset;
}

function formatStageLabel(stage: string): string {
  return stage
    .split('_')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}

function formatStageProgress<TStage extends string>(
  pipeline: StageState<TStage>[]
): StageProgressView<TStage>[] {
  return pipeline.map((stageState) => ({
    stage: stageState.stage,
    status: stageState.status,
    label: formatStageLabel(stageState.stage),
    blockers: [...stageState.blockers],
    latestArtifactLabel: stageState.latestArtifactIds[0],
    latestOperationLabel: stageState.latestOperationId
  }));
}

function stageStatusWeight(status: StageStatus): number {
  if (status === 'ready') {
    return 1;
  }

  if (status === 'running') {
    return 0.5;
  }

  return 0;
}

function computeSceneProgress(snapshot: DomainSnapshot, scene: Scene): number {
  if (!scene.shotIds.length) {
    return 0;
  }

  const progress = scene.shotIds
    .map((shotId) => snapshot.shots.find((entry) => entry.id === shotId))
    .filter((entry): entry is Shot => Boolean(entry))
    .reduce((sum, shot) => {
      const shotGeneration = shot.pipeline.find((stage) => stage.stage === 'shot_generation');
      return sum + stageStatusWeight(shotGeneration?.status ?? 'pending');
    }, 0);

  return Math.round((progress / scene.shotIds.length) * 100);
}

function buildShotNavigation(snapshot: DomainSnapshot, scene: Scene): ShotNavigation[] {
  return scene.shotIds
    .map((shotId) => snapshot.shots.find((entry) => entry.id === shotId))
    .filter((entry): entry is Shot => Boolean(entry))
    .sort((left, right) => left.order - right.order)
    .map((shot) => ({
      elementName: shot.name,
      elementUrl: `${DEFAULT_EDITOR_URL}?editor=shot&projectId=${shot.projectId}&sceneId=${shot.sceneId}&shotId=${shot.id}`
    }));
}

function buildSceneNavigation(snapshot: DomainSnapshot): SceneNavigation[] {
  return snapshot.project.sceneIds
    .map((sceneId) => snapshot.scenes.find((entry) => entry.id === sceneId))
    .filter((entry): entry is Scene => Boolean(entry))
    .map((scene) => ({
      elementName: scene.name,
      elementUrl: `${DEFAULT_EDITOR_URL}?editor=scene&projectId=${scene.projectId}&sceneId=${scene.id}`,
      shotsNavigation: buildShotNavigation(snapshot, scene)
    }));
}

function emptyAssetsNavigation(): AssetsNavigation {
  return {
    charactersNavigation: [],
    objectsNavigation: [],
    locationsNavigation: []
  };
}

function buildAssetNavigation(snapshot: DomainSnapshot): AssetsNavigation {
  const grouped = emptyAssetsNavigation();
  const navigationItems = snapshot.project.assetIds
    .map((assetId) => snapshot.assets.find((entry) => entry.id === assetId))
    .filter((entry): entry is AssetDefinition => Boolean(entry))
    .map((asset): AssetNavigation => ({
      elementName: asset.name,
      elementUrl: `${DEFAULT_EDITOR_URL}?editor=asset&projectId=${asset.projectId}&assetId=${asset.id}`,
      assetKind: asset.kind
    }));

  for (const item of navigationItems) {
    if (item.assetKind === 'character') {
      grouped.charactersNavigation.push(item);
    } else if (item.assetKind === 'location') {
      grouped.locationsNavigation.push(item);
    } else {
      grouped.objectsNavigation.push(item);
    }
  }

  return grouped;
}

function createSceneEvents(services: ProjectUiServices): SceneEdition['events'] {
  return {
    rename: {
      target: PROJECT_UI_SERVICE_TARGETS.scene.rename,
      dispatch: async (command: RenameEntityCommand) => {
        await services.sceneCommands.renameScene(command);
      }
    },
    updateDescription: {
      target: PROJECT_UI_SERVICE_TARGETS.scene.updateDescription,
      dispatch: async (command: UpdateEntityDescriptionCommand) => {
        await services.sceneCommands.updateSceneDescription(command);
      }
    },
    updateScript: {
      target: PROJECT_UI_SERVICE_TARGETS.scene.updateScript,
      dispatch: async (command: UpdateSceneScriptCommand) => {
        await services.sceneCommands.updateSceneScript(command);
      }
    },
    setAssets: {
      target: PROJECT_UI_SERVICE_TARGETS.scene.setAssets,
      dispatch: async (command: SetSceneAssetsCommand) => {
        await services.sceneCommands.setSceneAssets(command);
      }
    },
    setLocations: {
      target: PROJECT_UI_SERVICE_TARGETS.scene.setLocations,
      dispatch: async (command: SetSceneLocationsCommand) => {
        await services.sceneCommands.setSceneLocations(command);
      }
    },
    addShot: {
      target: PROJECT_UI_SERVICE_TARGETS.scene.addShot,
      dispatch: async (command: AddShotToSceneCommand) => {
        await services.sceneCommands.addShotToScene(command);
      }
    },
    reorderShots: {
      target: PROJECT_UI_SERVICE_TARGETS.scene.reorderShots,
      dispatch: async (command: ReorderSceneShotsCommand) => {
        await services.sceneCommands.reorderSceneShots(command);
      }
    },
    generatePreview: {
      target: PROJECT_UI_SERVICE_TARGETS.scene.generatePreview,
      dispatch: async (command: GenerateScenePreviewCommand) => {
        await services.sceneCommands.generateScenePreview(command);
      }
    }
  };
}

function createShotEvents(services: ProjectUiServices): ShotEdition['events'] {
  return {
    rename: {
      target: PROJECT_UI_SERVICE_TARGETS.shot.rename,
      dispatch: async (command: RenameEntityCommand) => {
        await services.shotCommands.renameShot(command);
      }
    },
    updateDescription: {
      target: PROJECT_UI_SERVICE_TARGETS.shot.updateDescription,
      dispatch: async (command: UpdateEntityDescriptionCommand) => {
        await services.shotCommands.updateShotDescription(command);
      }
    },
    setTiming: {
      target: PROJECT_UI_SERVICE_TARGETS.shot.setTiming,
      dispatch: async (command: SetShotTimingCommand) => {
        await services.shotCommands.setShotTiming(command);
      }
    },
    updateFraming: {
      target: PROJECT_UI_SERVICE_TARGETS.shot.updateFraming,
      dispatch: async (command: UpdateShotFramingCommand) => {
        await services.shotCommands.updateShotFraming(command);
      }
    },
    setLocation: {
      target: PROJECT_UI_SERVICE_TARGETS.shot.setLocation,
      dispatch: async (command: SetShotLocationCommand) => {
        await services.shotCommands.setShotLocation(command);
      }
    },
    bindAsset: {
      target: PROJECT_UI_SERVICE_TARGETS.shot.bindAsset,
      dispatch: async (command: BindAssetToShotCommand) => {
        await services.shotCommands.bindAssetToShot(command);
      }
    },
    unbindAsset: {
      target: PROJECT_UI_SERVICE_TARGETS.shot.unbindAsset,
      dispatch: async (command: UnbindAssetFromShotCommand) => {
        await services.shotCommands.unbindAssetFromShot(command);
      }
    },
    generateBaseAnimation: {
      target: PROJECT_UI_SERVICE_TARGETS.shot.generateBaseAnimation,
      dispatch: async (command: GenerateShotBaseAnimationCommand) => {
        await services.shotCommands.generateShotBaseAnimation(command);
      }
    },
    generateBaseFrame: {
      target: PROJECT_UI_SERVICE_TARGETS.shot.generateBaseFrame,
      dispatch: async (command: GenerateShotBaseFrameCommand) => {
        await services.shotCommands.generateShotBaseFrame(command);
      }
    },
    generatePreview: {
      target: PROJECT_UI_SERVICE_TARGETS.shot.generatePreview,
      dispatch: async (command: GenerateShotPreviewCommand) => {
        await services.shotCommands.generateShotPreview(command);
      }
    },
    openInVideoEditor: {
      target: PROJECT_UI_SERVICE_TARGETS.shot.openInVideoEditor,
      dispatch: async (command: OpenShotInVideoEditorCommand) => {
        await services.shotCommands.openShotInVideoEditor(command);
      }
    }
  };
}

function makeGeneratedFile(name: string, type: string): File {
  return new File([], name, { type });
}

function createAssetDescription(asset: AssetDefinition): AssetDescription {
  return {
    description: asset.description ?? '',
    assetType: asset.kind
  };
}

export function buildNavigationPanelFromSnapshot(
  snapshot: DomainSnapshot,
  projectId: string
): NavigationPanel {
  const project = ensureProject(snapshot, projectId);

  const projectNavigation: ProjectNavigation = {
    elementName: project.name,
    elementUrl: `${DEFAULT_EDITOR_URL}?editor=project&projectId=${project.id}`,
    scenesNavigation: buildSceneNavigation(snapshot),
    assetsNavigation: buildAssetNavigation(snapshot)
  };

  return {
    projectNavigation: [projectNavigation]
  };
}

export function buildProjectEditionFromSnapshot(
  snapshot: DomainSnapshot,
  projectId: string,
  services: ProjectUiServices
): ProjectEdition {
  const project = ensureProject(snapshot, projectId);

  return {
    editorUrl: `${DEFAULT_EDITOR_URL}?editor=project&projectId=${project.id}`,
    name: project.name,
    projectDescription: project.description ?? '',
    addScene: () => {
      void services.projectCommands.addScene({ projectId: project.id });
    },
    addAsset: () => {
      void services.projectCommands.addAsset({ projectId: project.id });
    }
  };
}

export function buildSceneEditionFromSnapshot(
  snapshot: DomainSnapshot,
  sceneId: string,
  services: ProjectUiServices
): SceneEdition {
  const scene = ensureScene(snapshot, sceneId);

  return {
    view: {
      id: scene.id,
      projectId: scene.projectId,
      name: scene.name,
      description: scene.description,
      editorUrl: `${DEFAULT_EDITOR_URL}?editor=scene&projectId=${scene.projectId}&sceneId=${scene.id}`,
      scriptId: scene.scriptId,
      shotIds: [...scene.shotIds],
      locationIds: [...scene.locationIds],
      assetIds: [...scene.assetIds],
      pipeline: formatStageProgress<SceneStage>(scene.pipeline),
      sceneProgress: computeSceneProgress(snapshot, scene)
    },
    visualization: {
      scenePreview: undefined
    },
    events: createSceneEvents(services)
  };
}

export function buildShotEditionFromSnapshot(
  snapshot: DomainSnapshot,
  shotId: string,
  services: ProjectUiServices
): ShotEdition {
  const shot = ensureShot(snapshot, shotId);

  return {
    view: {
      id: shot.id,
      projectId: shot.projectId,
      name: shot.name,
      description: shot.description,
      editorUrl: `${DEFAULT_EDITOR_URL}?editor=shot&projectId=${shot.projectId}&sceneId=${shot.sceneId}&shotId=${shot.id}`,
      sceneId: shot.sceneId,
      scriptBeatId: shot.scriptBeatId,
      locationId: shot.locationId,
      order: shot.order,
      durationMs: shot.durationMs,
      frameRate: shot.frameRate,
      framing: shot.framing,
      bindings: shot.assetBindings.map((binding) => {
        const asset = snapshot.assets.find((entry) => entry.id === binding.assetId);
        const modelLabel = binding.modelArtifactId
          ? `artifact:${binding.modelArtifactId}`
          : undefined;

        return {
          role: binding.role,
          asset: {
            id: binding.assetId,
            label: asset?.name ?? binding.assetId,
            kind: asset?.kind ?? 'object'
          },
          requiredStage: binding.requiredStage,
          readiness:
            asset?.pipeline.find((stage) => stage.stage === binding.requiredStage)?.status ??
            'pending',
          modelLabel,
          actions: binding.actions.map((action) => ({
            action: {
              id: action.actionId,
              label: action.instruction
            },
            timelineLabel:
              action.startFrame !== undefined && action.endFrame !== undefined
                ? `${action.startFrame}-${action.endFrame}`
                : undefined,
            motionLabel: action.motionArtifactId,
            status: undefined
          })),
          enterFrame: binding.enterFrame,
          exitFrame: binding.exitFrame,
          notes: binding.notes
        };
      }),
      pipeline: formatStageProgress<ShotStage>(shot.pipeline)
    },
    visualization: {
      shotFirstFrame: undefined,
      shotBaseVideo: undefined,
      shotVideo: undefined
    },
    events: createShotEvents(services)
  };
}

export function buildAssetEditionFromSnapshot(
  snapshot: DomainSnapshot,
  assetId: string,
  services: ProjectUiServices
): AssetEditor {
  const asset = ensureAsset(snapshot, assetId);

  return {
    editorUrl: `${DEFAULT_EDITOR_URL}?editor=asset&projectId=${asset.projectId}&assetId=${asset.id}`,
    literalDescription: {
      assetName: asset.name,
      assetType: asset.kind,
      assetSystemPath: `Assets3D/${asset.projectId}/${asset.id}`,
      assetDescription: createAssetDescription(asset)
    },
    literalDescriptionEditor: {
      editAssetName: (name: string) => {
        void services.assetCommands.renameAsset({ assetId: asset.id, name });
      },
      editAssetType: (type) => {
        void services.assetCommands.setAssetType({
          assetId: asset.id,
          assetType: type
        });
      },
      editAssetDescription: (description: string) => {
        void services.assetCommands.updateAssetDescription({ assetId: asset.id, description });
        return {
          description,
          assetType: asset.kind
        };
      }
    },
    assetVisualization: {
      assetImagePreview: {
        showAssetPreview: () => {
          // Client-side mock seam: preview retrieval is intentionally no-op.
        }
      },
      asset3DMetrics: {
        polygonCount: 2048,
        textureResolution: '1024x1024',
        riggingComplexity: 'low',
        otherMetrics: 'mock-projection'
      }
    },
    assetEdition: {
      generateImage: (assetDescription, targetResolution) => {
        void services.assetCommands.generateImage({
          assetId: asset.id,
          targetResolution,
          overrideDescription: assetDescription
        });
        return makeGeneratedFile(`${asset.id}-reference.png`, 'image/png');
      },
      uploadImage: (imageFile: File) => {
        void services.assetCommands.uploadImage({
          assetId: asset.id,
          imageFile
        });
      },
      generateModel: (assetDescription, imageFile, subassets) => {
        void services.assetCommands.generateModel({
          assetId: asset.id,
          imageFile,
          subassets,
          overrideDescription: assetDescription
        });
        return makeGeneratedFile(`${asset.id}-model.glb`, 'model/gltf-binary');
      },
      uploadModel: (modelFile: File) => {
        void services.assetCommands.uploadModel({
          assetId: asset.id,
          modelFile
        });
      },
      openInBlender: (modelFile: File) => {
        void services.assetCommands.openInBlender({
          assetId: asset.id,
          modelFile
        });
      }
    }
  };
}
