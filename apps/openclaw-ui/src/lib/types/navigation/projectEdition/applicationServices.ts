import type { AssetKind } from "../../project";
import type { AssetDescription, AssetEditor, ImprovementDetails } from "./assetEdition";
import type { ProjectEdition } from "./editor";
import type {
    AddShotToSceneCommand,
    GenerateScenePreviewCommand,
    ReorderSceneShotsCommand,
    SceneEdition,
    SetSceneAssetsCommand,
    SetSceneLocationsCommand,
    UpdateSceneScriptCommand,
} from "./sceneEdition";
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
    UpdateShotFramingCommand,
} from "./shotEdition";
import type {
    RenameEntityCommand,
    UpdateEntityDescriptionCommand,
} from "./baseEdition";
import type { NavigationPanel } from "../projectNavigation/navigation";

export interface CommandDispatchResult {
    accepted: boolean;
    message?: string;
    operationId?: string;
}

export type CommandResult = Promise<CommandDispatchResult>;

export interface RenameProjectCommand {
    projectId: string;
    name: string;
}

export interface UpdateProjectDescriptionCommand {
    projectId: string;
    description: string;
}

export interface AddSceneToProjectCommand {
    projectId: string;
    sceneId?: string;
}

export interface AddAssetToProjectCommand {
    projectId: string;
    assetType?: AssetKind;
    assetId?: string;
}

export interface RenameAssetCommand {
    assetId: string;
    name: string;
}

export interface SetAssetTypeCommand {
    assetId: string;
    assetType: AssetKind;
}

export interface UpdateAssetDescriptionCommand {
    assetId: string;
    description: string;
}

export interface GenerateAssetImageCommand {
    assetId: string;
    targetResolution?: string;
    overrideDescription?: AssetDescription;
}

export interface UploadAssetImageCommand {
    assetId: string;
    imageFile: File;
}

export interface GenerateAssetModelCommand {
    assetId: string;
    imageFile: File;
    subassets?: File[];
    overrideDescription?: AssetDescription;
}

export interface UploadAssetModelCommand {
    assetId: string;
    modelFile: File;
}

export interface OpenAssetInBlenderCommand {
    assetId: string;
    modelFile?: File;
}

export interface ImproveAssetMeshCommand {
    assetId: string;
    modelFile: File;
    details: ImprovementDetails;
}

export interface ImproveAssetRiggingCommand {
    assetId: string;
    modelFile: File;
    details: ImprovementDetails;
}

/**
 * Query-side contract used by a UI mock to load sidebar/tree navigation.
 */
export interface ProjectNavigationQueryService {
    getNavigationPanel(projectId: string): Promise<NavigationPanel>;
}

/**
 * Query-side contract used by a UI mock to load editor view models.
 */
export interface ProjectEditionQueryService {
    getProjectEdition(projectId: string): Promise<ProjectEdition>;
    getSceneEdition(sceneId: string): Promise<SceneEdition>;
    getShotEdition(shotId: string): Promise<ShotEdition>;
    getAssetEdition(assetId: string): Promise<AssetEditor>;
}

/**
 * Command-side contract for project-level UI actions.
 */
export interface ProjectApplicationService {
    renameProject(command: RenameProjectCommand): CommandResult;
    updateProjectDescription(command: UpdateProjectDescriptionCommand): CommandResult;
    addScene(command: AddSceneToProjectCommand): CommandResult;
    addAsset(command: AddAssetToProjectCommand): CommandResult;
}

/**
 * Command-side contract for scene UI actions.
 */
export interface SceneApplicationService {
    renameScene(command: RenameEntityCommand): CommandResult;
    updateSceneDescription(command: UpdateEntityDescriptionCommand): CommandResult;
    updateSceneScript(command: UpdateSceneScriptCommand): CommandResult;
    setSceneAssets(command: SetSceneAssetsCommand): CommandResult;
    setSceneLocations(command: SetSceneLocationsCommand): CommandResult;
    addShotToScene(command: AddShotToSceneCommand): CommandResult;
    reorderSceneShots(command: ReorderSceneShotsCommand): CommandResult;
    generateScenePreview(command: GenerateScenePreviewCommand): CommandResult;
}

/**
 * Command-side contract for shot UI actions.
 */
export interface ShotApplicationService {
    renameShot(command: RenameEntityCommand): CommandResult;
    updateShotDescription(command: UpdateEntityDescriptionCommand): CommandResult;
    setShotTiming(command: SetShotTimingCommand): CommandResult;
    updateShotFraming(command: UpdateShotFramingCommand): CommandResult;
    setShotLocation(command: SetShotLocationCommand): CommandResult;
    bindAssetToShot(command: BindAssetToShotCommand): CommandResult;
    unbindAssetFromShot(command: UnbindAssetFromShotCommand): CommandResult;
    generateShotBaseAnimation(command: GenerateShotBaseAnimationCommand): CommandResult;
    generateShotBaseFrame(command: GenerateShotBaseFrameCommand): CommandResult;
    generateShotPreview(command: GenerateShotPreviewCommand): CommandResult;
    openShotInVideoEditor(command: OpenShotInVideoEditorCommand): CommandResult;
}

/**
 * Command-side contract for asset UI actions.
 */
export interface AssetApplicationService {
    renameAsset(command: RenameAssetCommand): CommandResult;
    setAssetType(command: SetAssetTypeCommand): CommandResult;
    updateAssetDescription(command: UpdateAssetDescriptionCommand): CommandResult;
    generateImage(command: GenerateAssetImageCommand): CommandResult;
    uploadImage(command: UploadAssetImageCommand): CommandResult;
    generateModel(command: GenerateAssetModelCommand): CommandResult;
    uploadModel(command: UploadAssetModelCommand): CommandResult;
    openInBlender(command: OpenAssetInBlenderCommand): CommandResult;
    improveMesh(command: ImproveAssetMeshCommand): CommandResult;
    improveRigging(command: ImproveAssetRiggingCommand): CommandResult;
}

export interface ProjectUiServices {
    navigationQueries: ProjectNavigationQueryService;
    editionQueries: ProjectEditionQueryService;
    projectCommands: ProjectApplicationService;
    sceneCommands: SceneApplicationService;
    shotCommands: ShotApplicationService;
    assetCommands: AssetApplicationService;
}

/**
 * Canonical service target strings reused by UI event pointers and adapters.
 */
export const PROJECT_UI_SERVICE_TARGETS = {
    scene: {
        rename: "SceneApplicationService.renameScene",
        updateDescription: "SceneApplicationService.updateSceneDescription",
        updateScript: "SceneApplicationService.updateSceneScript",
        setAssets: "SceneApplicationService.setSceneAssets",
        setLocations: "SceneApplicationService.setSceneLocations",
        addShot: "SceneApplicationService.addShotToScene",
        reorderShots: "SceneApplicationService.reorderSceneShots",
        generatePreview: "SceneApplicationService.generateScenePreview",
    },
    shot: {
        rename: "ShotApplicationService.renameShot",
        updateDescription: "ShotApplicationService.updateShotDescription",
        setTiming: "ShotApplicationService.setShotTiming",
        updateFraming: "ShotApplicationService.updateShotFraming",
        setLocation: "ShotApplicationService.setShotLocation",
        bindAsset: "ShotApplicationService.bindAssetToShot",
        unbindAsset: "ShotApplicationService.unbindAssetFromShot",
        generateBaseAnimation: "ShotApplicationService.generateShotBaseAnimation",
        generateBaseFrame: "ShotApplicationService.generateShotBaseFrame",
        generatePreview: "ShotApplicationService.generateShotPreview",
        openInVideoEditor: "ShotApplicationService.openShotInVideoEditor",
    },
} as const;
