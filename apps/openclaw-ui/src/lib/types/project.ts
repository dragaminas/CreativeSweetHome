export type AssetKind = 'character' | 'object';

export type PipelineStage =
  | 'description'
  | 'reference_image'
  | 'model_3d'
  | 'base_animation'
  | 'asset_animation'
  | 'animation_composition'
  | 'composition_render';

export type ShotStage =
  | 'shot_brief'
  | 'animation_composition'
  | 'composition_render'
  | 'base_video_export'
  | 'initial_image'
  | 'shot_generation';

export type SceneStage =
  | 'scene_brief'
  | 'scene_scaffold'
  | 'scene_assembly'
  | 'scene_refine'
  | 'final_scene_export';

export type ProjectStage =
  | 'project_setup'
  | 'asset_production'
  | 'shot_production'
  | 'scene_postproduction'
  | 'delivery';

export type StageStatus = 'pending' | 'running' | 'ready' | 'blocked' | 'failed';

export type RunnerId = 'comfyui' | 'blender' | 'kimodo' | 'resolve' | 'manual';

export type OperationStatus =
  | 'accepted'
  | 'soft_pass_with_fallback'
  | 'blocked'
  | 'failed'
  | 'running';

export type ArtifactKind =
  | 'reference_image'
  | 'model_3d'
  | 'animation_clip'
  | 'video'
  | 'frame'
  | 'manifest'
  | 'other';

export type ShotAssetRole = 'primary' | 'secondary' | 'background' | 'set_dressing';

export interface Entity {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
}

export interface StageState<TStage extends string> {
  stage: TStage;
  status: StageStatus;
  latestArtifactIds: string[];
  latestOperationId?: string;
  blockers: string[];
}

export interface ArtifactRef {
  artifactId: string;
  kind: ArtifactKind;
  stage: PipelineStage | ShotStage | SceneStage;
  path: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface OperationRef {
  operationId: string;
  runnerId: RunnerId;
  operationKind: string;
  status: OperationStatus;
  createdAt: string;
  finishedAt?: string;
  evidencePath?: string;
  message?: string;
}

export interface Project extends Entity {
  scriptIds: string[];
  sceneIds: string[];
  assetIds: string[];
  locationIds: string[];
  pipeline: StageState<ProjectStage>[];
}

export interface Script extends Entity {
  projectId: string;
  version: number;
  status: 'draft' | 'approved' | 'archived';
  beats: ScriptBeat[];
}

export interface ScriptBeat {
  beatId: string;
  order: number;
  objective: string;
  emotionalTone?: string;
  sceneId?: string;
  shotIds: string[];
  requiredAssetIds: string[];
  notes?: string;
}

export interface Scene extends Entity {
  projectId: string;
  scriptId: string;
  shotIds: string[];
  locationIds: string[];
  assetIds: string[];
  artifacts: ArtifactRef[];
  operations: OperationRef[];
  pipeline: StageState<SceneStage>[];
}

export interface Shot extends Entity {
  projectId: string;
  sceneId: string;
  scriptBeatId?: string;
  locationId: string;
  order: number;
  durationMs: number;
  frameRate: 24 | 25 | 30 | 48 | 60;
  framing: ShotFraming;
  assetBindings: ShotAssetBinding[];
  artifacts: ArtifactRef[];
  operations: OperationRef[];
  pipeline: StageState<ShotStage>[];
}

export interface ShotFraming {
  shotSize: 'ecu' | 'cu' | 'mcu' | 'ms' | 'mls' | 'ls' | 'els';
  cameraAngle?: 'eye' | 'high' | 'low' | 'dutch';
  cameraMove?: 'static' | 'pan' | 'tilt' | 'dolly' | 'handheld';
  lensMm?: number;
}

export interface ShotAssetBinding {
  assetId: string;
  role: ShotAssetRole;
  requiredStage: PipelineStage;
  modelArtifactId?: string;
  actions: ShotAction[];
  interactionPresetId?: string;
  enterFrame?: number;
  exitFrame?: number;
  notes?: string;
}

// Concrete animation decisions live at shot level, not at character definition level.
export interface ShotAction {
  actionId: string;
  instruction: string;
  startFrame?: number;
  endFrame?: number;
  targetAssetId?: string;
  motionArtifactId?: string;
  intensity?: 'low' | 'mid' | 'high';
}

export interface AssetDefinition extends Entity {
  projectId: string;
  sceneId: string;
  kind: AssetKind;
  tags: string[];
  artifacts: ArtifactRef[];
  operations: OperationRef[];
  pipeline: StageState<PipelineStage>[];
}

export interface Location extends Entity {
  projectId: string;
  sceneId: string;
  layoutModelArtifactId?: string;
  setAssetIds: string[];
  zones: LocationZone[];
  constraints: string[];
  artifacts: ArtifactRef[];
}

export interface LocationZone extends Entity {
  purpose: 'entry' | 'action' | 'background' | 'camera' | 'light';
  notes?: string;
}

// UI projections: keep reference complexity internal and expose human-readable models.
export interface DomainSnapshot {
  project: Project;
  scripts: Script[];
  scenes: Scene[];
  shots: Shot[];
  assets: AssetDefinition[];
  locations: Location[];
}

export interface ResolvedRef {
  id: string;
  label: string;
  subtitle?: string;
}

export interface StageProgressView<TStage extends string> {
  stage: TStage;
  status: StageStatus;
  label: string;
  blockers: string[];
  latestArtifactLabel?: string;
  latestOperationLabel?: string;
}

export interface AssetReadinessView {
  asset: ResolvedRef & { kind: AssetKind };
  currentStage: PipelineStage;
  currentStatus: StageStatus;
  blockers: string[];
  previewImagePath?: string;
}

export interface ShotBindingView {
  role: ShotAssetRole;
  asset: ResolvedRef & { kind: AssetKind };
  requiredStage: PipelineStage;
  readiness: StageStatus;
  modelLabel?: string;
  actions: ShotActionView[];
  enterFrame?: number;
  exitFrame?: number;
  notes?: string;
}

export interface ShotActionView {
  action: ResolvedRef;
  timelineLabel?: string;
  motionLabel?: string;
  status?: StageStatus;
}

export interface ShotAuthoringViewModel {
  shot: Pick<Shot, 'id' | 'name' | 'description' | 'order' | 'durationMs' | 'frameRate' | 'framing'>;
  scene: ResolvedRef;
  location: ResolvedRef;
  beat?: ResolvedRef;
  bindings: ShotBindingView[];
  shotProgress: StageProgressView<ShotStage>[];
}

export interface SceneAuthoringViewModel {
  scene: Pick<Scene, 'id' | 'name' | 'description'>;
  script: ResolvedRef;
  shotCards: Array<ResolvedRef & { order: number; status: StageStatus }>;
  locationCards: ResolvedRef[];
  assetReadiness: AssetReadinessView[];
  sceneProgress: StageProgressView<SceneStage>[];
}

export interface ProjectWorkspaceViewModel {
  project: Pick<Project, 'id' | 'name' | 'description'>;
  scripts: Array<ResolvedRef & { version: number; status: Script['status'] }>;
  sceneCards: Array<ResolvedRef & { status: StageStatus }>;
  projectProgress: StageProgressView<ProjectStage>[];
}

export interface SelectionCandidate {
  id: string;
  label: string;
  subtitle?: string;
  status?: StageStatus;
  blockedReason?: string;
}

// Input used by forms so users can write naturally while the app resolves references.
export interface ShotAuthoringInput {
  shotName: string;
  sceneId: string;
  scriptBeatId?: string;
  locationId: string;
  durationMs: number;
  frameRate: Shot['frameRate'];
  framing: ShotFraming;
  bindings: Array<{
    role: ShotAssetRole;
    assetId: string;
    requiredStage: PipelineStage;
    actions: Array<{
      instruction: string;
      startFrame?: number;
      endFrame?: number;
      targetAssetId?: string;
      intensity?: 'low' | 'mid' | 'high';
    }>;
    enterFrame?: number;
    exitFrame?: number;
    notes?: string;
  }>;
}
