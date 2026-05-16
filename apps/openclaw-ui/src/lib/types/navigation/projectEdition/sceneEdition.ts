import type { SceneStage, StageProgressView } from "../../project";
import type { CommonEditionEvents, EntityEditionView, UiEventPointer } from "./baseEdition";

export interface SceneEditionView extends EntityEditionView {
    scriptId: string;
    shotIds: string[];
    locationIds: string[];
    assetIds: string[];
    pipeline: StageProgressView<SceneStage>[];
    /**
     * Indicates the percentage of generated footage from child shots.
     */
    sceneProgress: number;
}

export interface SceneVisualization {
    scenePreview?: File;
}

export interface UpdateSceneScriptCommand {
    sceneId: string;
    scriptId: string;
}

export interface SetSceneAssetsCommand {
    sceneId: string;
    assetIds: string[];
}

export interface SetSceneLocationsCommand {
    sceneId: string;
    locationIds: string[];
}

export interface AddShotToSceneCommand {
    sceneId: string;
    shotId?: string;
    insertAfterShotId?: string;
}

export interface ReorderSceneShotsCommand {
    sceneId: string;
    orderedShotIds: string[];
}

export interface GenerateScenePreviewCommand {
    sceneId: string;
}

type SceneCommonEditionEvents = CommonEditionEvents<
    "SceneApplicationService.renameScene",
    "SceneApplicationService.updateSceneDescription"
>;

export interface SceneEditionEvents extends SceneCommonEditionEvents {
    /** @service SceneApplicationService.renameScene */
    rename: SceneCommonEditionEvents["rename"];

    /** @service SceneApplicationService.updateSceneDescription */
    updateDescription: SceneCommonEditionEvents["updateDescription"];

    /** @service SceneApplicationService.updateSceneScript */
    updateScript: UiEventPointer<
        UpdateSceneScriptCommand,
        "SceneApplicationService.updateSceneScript"
    >;

    /** @service SceneApplicationService.setSceneAssets */
    setAssets: UiEventPointer<SetSceneAssetsCommand, "SceneApplicationService.setSceneAssets">;

    /** @service SceneApplicationService.setSceneLocations */
    setLocations: UiEventPointer<
        SetSceneLocationsCommand,
        "SceneApplicationService.setSceneLocations"
    >;

    /** @service SceneApplicationService.addShotToScene */
    addShot: UiEventPointer<AddShotToSceneCommand, "SceneApplicationService.addShotToScene">;

    /** @service SceneApplicationService.reorderSceneShots */
    reorderShots: UiEventPointer<
        ReorderSceneShotsCommand,
        "SceneApplicationService.reorderSceneShots"
    >;

    /** @service SceneApplicationService.generateScenePreview */
    generatePreview: UiEventPointer<
        GenerateScenePreviewCommand,
        "SceneApplicationService.generateScenePreview"
    >;
}

export interface SceneEdition {
    view: SceneEditionView;
    visualization: SceneVisualization;
    events: SceneEditionEvents;
}
