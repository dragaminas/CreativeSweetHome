import type {
    PipelineStage,
    Shot,
    ShotAssetRole,
    ShotBindingView,
    ShotFraming,
    ShotStage,
    StageProgressView,
} from "../../project";
import type { CommonEditionEvents, EntityEditionView, UiEventPointer } from "./baseEdition";

export interface ShotEditionView extends EntityEditionView {
    sceneId: string;
    scriptBeatId?: string;
    locationId: string;
    order: number;
    durationMs: number;
    frameRate: Shot["frameRate"];
    framing: ShotFraming;
    bindings: ShotBindingView[];
    pipeline: StageProgressView<ShotStage>[];
}

export interface ShotVisualization {
    shotFirstFrame?: File;
    shotBaseVideo?: File;
    shotVideo?: File;
}

export interface SetShotTimingCommand {
    shotId: string;
    durationMs: number;
    frameRate: Shot["frameRate"];
}

export interface UpdateShotFramingCommand {
    shotId: string;
    framing: ShotFraming;
}

export interface SetShotLocationCommand {
    shotId: string;
    locationId: string;
}

export interface BindAssetToShotCommand {
    shotId: string;
    assetId: string;
    role: ShotAssetRole;
    requiredStage: PipelineStage;
}

export interface UnbindAssetFromShotCommand {
    shotId: string;
    assetId: string;
}

export interface GenerateShotBaseAnimationCommand {
    shotId: string;
    track: "character" | "object" | "camera";
    targetResolution?: string;
}

export interface GenerateShotBaseFrameCommand {
    shotId: string;
    shot3DArtifactId?: string;
    targetResolution?: string;
    seed?: number;
}

export interface GenerateShotPreviewCommand {
    shotId: string;
    shot3DArtifactId?: string;
    baseFrameArtifactId?: string;
    targetResolution?: string;
}

export interface OpenShotInVideoEditorCommand {
    shotId: string;
    shotVideoArtifactId?: string;
}

type ShotCommonEditionEvents = CommonEditionEvents<
    "ShotApplicationService.renameShot",
    "ShotApplicationService.updateShotDescription"
>;

export interface ShotEditionEvents extends ShotCommonEditionEvents {
    /** @service ShotApplicationService.renameShot */
    rename: ShotCommonEditionEvents["rename"];

    /** @service ShotApplicationService.updateShotDescription */
    updateDescription: ShotCommonEditionEvents["updateDescription"];

    /** @service ShotApplicationService.setShotTiming */
    setTiming: UiEventPointer<SetShotTimingCommand, "ShotApplicationService.setShotTiming">;

    /** @service ShotApplicationService.updateShotFraming */
    updateFraming: UiEventPointer<
        UpdateShotFramingCommand,
        "ShotApplicationService.updateShotFraming"
    >;

    /** @service ShotApplicationService.setShotLocation */
    setLocation: UiEventPointer<SetShotLocationCommand, "ShotApplicationService.setShotLocation">;

    /** @service ShotApplicationService.bindAssetToShot */
    bindAsset: UiEventPointer<BindAssetToShotCommand, "ShotApplicationService.bindAssetToShot">;

    /** @service ShotApplicationService.unbindAssetFromShot */
    unbindAsset: UiEventPointer<
        UnbindAssetFromShotCommand,
        "ShotApplicationService.unbindAssetFromShot"
    >;

    /** @service ShotApplicationService.generateShotBaseAnimation */
    generateBaseAnimation: UiEventPointer<
        GenerateShotBaseAnimationCommand,
        "ShotApplicationService.generateShotBaseAnimation"
    >;

    /** @service ShotApplicationService.generateShotBaseFrame */
    generateBaseFrame: UiEventPointer<
        GenerateShotBaseFrameCommand,
        "ShotApplicationService.generateShotBaseFrame"
    >;

    /** @service ShotApplicationService.generateShotPreview */
    generatePreview: UiEventPointer<
        GenerateShotPreviewCommand,
        "ShotApplicationService.generateShotPreview"
    >;

    /** @service ShotApplicationService.openShotInVideoEditor */
    openInVideoEditor: UiEventPointer<
        OpenShotInVideoEditorCommand,
        "ShotApplicationService.openShotInVideoEditor"
    >;
}

export interface ShotEdition {
    view: ShotEditionView;
    visualization: ShotVisualization;
    events: ShotEditionEvents;
}
