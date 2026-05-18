export type BadgeTone = 'positive' | 'warning' | 'info' | 'muted';

export type RouteRole = 'authoring' | 'pipeline' | 'embedded' | 'engine' | 'assisted';

export type ProductRoute =
  | '/'
  | '/workspaces/scene'
  | '/workspaces/shot'
  | '/workspaces/assets'
  | '/workspaces/kimodo'
  | '/workspaces/kimodo/embed'
  | '/workspaces/blender'
  | '/workspaces/comfyui'
  | '/workspaces/resolve';

export interface RunnerDescriptionRecord {
  runner_id: string;
  display_label: string;
  supported_operation_kinds: string[];
  supported_target_kinds: string[];
  supports_cancel: boolean;
  supports_progress: boolean;
  default_evidence_root: string;
}

export interface RunnerTargetRecord {
  target_id: string;
  display_label: string;
  target_kind: string;
  operation_kind: string;
  metadata: Record<string, unknown>;
}

export interface RunnerBridgeStatus {
  state: 'ready' | 'degraded';
  label: string;
  tone: BadgeTone;
  message: string;
  command: string[];
}

export interface RunnerCatalog {
  bridge: RunnerBridgeStatus;
  runners: RunnerDescriptionRecord[];
}

export interface DirectoryStatus {
  id: string;
  label: string;
  path: string;
  exists: boolean;
  note: string;
}

export interface StudioState {
  repoRoot: string;
  runnerContractPath: string;
  sceneRootPath: string;
  directories: DirectoryStatus[];
}

export interface WorkspaceDefinition {
  id: string;
  label: string;
  phase: string;
  path: ProductRoute;
  routeRole: RouteRole;
  stateLabel: string;
  stateTone: BadgeTone;
  summary: string;
  boundary: string;
  runnerIds: string[];
  evidenceRoots: string[];
  notes: string[];
  embedPath?: ProductRoute;
}

export interface ProductShellModel {
  title: string;
  subtitle: string;
  workspaces: WorkspaceDefinition[];
}

export type ConsumerId = 'comfyui' | 'kimodo' | 'blender' | 'davinci-resolve';

export interface SharedBriefInput {
  intent: string;
  narrative: string;
  constraints?: string[];
  references?: string[];
  projectId?: string;
  workspaceId?: string;
}

export interface StructuredBriefFields {
  intent: string;
  narrative: string;
  constraints: string[];
  references: string[];
  projectId: string;
  workspaceId: string;
}

export interface ConsumerBrief {
  consumerId: ConsumerId;
  label: string;
  routeHint: ProductRoute;
  operationHint: string;
  summary: string;
  focusPoints: string[];
}

export interface SharedBrief {
  briefId: string;
  slug: string;
  summary: string;
  normalizedNarrative: string;
  extractedKeywords: string[];
  checkpointLabels: string[];
  structure: StructuredBriefFields;
  consumerBriefs: ConsumerBrief[];
}

export type SceneBriefCheckpointStatus = 'accepted' | 'incomplete' | 'ambiguous';

export interface SceneBriefSourceFields {
  intent: string;
  tone: string;
  narrative: string;
  characters: string[];
  objects: string[];
  constraints: string[];
  references: string[];
}

export interface SceneBriefCheckpoint {
  status: SceneBriefCheckpointStatus;
  label: string;
  notes: string[];
}

export interface SceneBriefArtifact {
  schemaVersion: 1;
  createdAt: string;
  briefId: string;
  projectId: string;
  sceneId: string;
  workspaceId: 'scene';
  source: SceneBriefSourceFields;
  checkpoint: SceneBriefCheckpoint;
  sharedBrief: SharedBrief;
}

export interface SceneBriefApiResponse {
  accepted: boolean;
  status: SceneBriefCheckpointStatus | 'fail_compile' | 'fail_runtime';
  message: string;
  artifact?: SceneBriefArtifact;
  filePath?: string;
}

export type ShotBriefCheckpointStatus = 'accepted' | 'incomplete' | 'ambiguous';
export type ShotConsistencyStatus = 'consistent' | 'needs_review';

export interface ShotBriefSourceFields {
  intent: string;
  framing: string;
  durationMs: number;
  narrative: string;
  characters: string[];
  constraints: string[];
  references: string[];
}

export interface ShotBriefCheckpoint {
  status: ShotBriefCheckpointStatus;
  label: string;
  notes: string[];
}

export interface ShotBriefConsistency {
  status: ShotConsistencyStatus;
  notes: string[];
  sceneManifestPath: string;
  assetsManifestPath: string;
  shotManifestPath: string;
  availableCharacterIds: string[];
  availableCharacterLabels: string[];
  missingCharacters: string[];
}

export interface ShotBriefArtifact {
  schemaVersion: 1;
  createdAt: string;
  briefId: string;
  projectId: string;
  sceneId: string;
  shotId: string;
  workspaceId: 'shot';
  source: ShotBriefSourceFields;
  checkpoint: ShotBriefCheckpoint;
  consistency: ShotBriefConsistency;
  sharedBrief: SharedBrief;
}

export interface ShotBriefApiResponse {
  accepted: boolean;
  status: ShotBriefCheckpointStatus | 'fail_compile' | 'fail_runtime';
  message: string;
  artifact?: ShotBriefArtifact;
  filePath?: string;
}

export type SceneStorageScaffoldStatus = 'created' | 'collision' | 'missing_prerequisites';

export interface SceneStorageScaffold {
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

export interface SceneStorageApiResponse {
  accepted: boolean;
  status: SceneStorageScaffoldStatus | 'fail_compile' | 'fail_runtime';
  message: string;
  scaffold?: SceneStorageScaffold;
}

export interface StartRunPayload {
  runner_id: string;
  operation_kind: string;
  target_id?: string | null;
  requested_by?: string;
  channel?: string;
  run_id?: string;
  inputs?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export type RunnerExecutionStatus =
  | 'queued'
  | 'running'
  | 'pass'
  | 'soft_pass_with_fallback'
  | 'fail_compile'
  | 'fail_runtime'
  | 'fail_quality'
  | 'blocked_missing_asset'
  | 'cancelled'
  | string;

export interface RunnerProgressEvent {
  at?: string;
  step_id: string;
  state: string;
  message: string;
}

export interface RunnerCommandLog {
  stage: string;
  command_text: string;
  stdout_log_path?: string;
  stderr_log_path?: string;
  exit_code?: number;
  started_at?: string;
  completed_at?: string;
}

export interface AssetReferenceRunSummary {
  runner_id: string;
  operation_kind: string;
  target_id: string;
  run_id: string;
  accepted: boolean;
  status: RunnerExecutionStatus;
  message: string;
  artifact_refs: string[];
  manifest_path?: string;
  summary_path?: string;
  evidence_path?: string;
  progress_events: RunnerProgressEvent[];
}

export interface StartAssetReferenceRunInput {
  mode: 'import' | 'generate';
  projectId: string;
  sceneId: string;
  assetKind: 'character' | 'object';
  assetId: string;
  briefText?: string;
  presetId?: string;
  referenceSourcePaths?: string[];
  notes?: string;
  requestedBy?: string;
  channel?: string;
}

export interface Asset3dRunSummary {
  runner_id: string;
  operation_kind: string;
  target_id: string;
  run_id: string;
  accepted: boolean;
  status: RunnerExecutionStatus;
  message: string;
  artifact_refs: string[];
  manifest_path?: string;
  summary_path?: string;
  evidence_path?: string;
  progress_events: RunnerProgressEvent[];
}

export interface StartAsset3dRunInput {
  mode: 'import' | 'generate';
  projectId: string;
  sceneId: string;
  assetKind: 'character' | 'object';
  assetId: string;
  sourceModelPath?: string;
  briefText?: string;
  presetId?: string;
  referenceSourcePaths?: string[];
  notes?: string;
  requestedBy?: string;
  channel?: string;
}

export interface MeshCleanupRunSummary {
  runner_id: string;
  operation_kind: string;
  target_id: string;
  run_id: string;
  accepted: boolean;
  status: RunnerExecutionStatus;
  message: string;
  artifact_refs: string[];
  manifest_path?: string;
  summary_path?: string;
  evidence_path?: string;
  cleanup_report_path?: string;
  source_model_path?: string;
  cleaned_model_path?: string;
  remeshed_model_path?: string;
  progress_events: RunnerProgressEvent[];
  warnings: string[];
  command_logs: RunnerCommandLog[];
}

export interface StartMeshCleanupRunInput {
  projectId: string;
  sceneId: string;
  assetKind: 'character' | 'object';
  assetId: string;
  sourceModelPath: string;
  mode?: 'auto' | 'debug';
  notes?: string;
  requestedBy?: string;
  channel?: string;
}

export interface RiggingRunSummary {
  runner_id: string;
  operation_kind: string;
  target_id: string;
  run_id: string;
  accepted: boolean;
  status: RunnerExecutionStatus;
  message: string;
  artifact_refs: string[];
  manifest_path?: string;
  summary_path?: string;
  evidence_path?: string;
  rigging_report_path?: string;
  prepared_model_path?: string;
  rigged_glb_path?: string;
  rigged_fbx_path?: string;
  validation_artifact_paths: string[];
  progress_events: RunnerProgressEvent[];
  warnings: string[];
  command_logs: RunnerCommandLog[];
}

export interface StartRiggingRunInput {
  projectId: string;
  sceneId: string;
  assetKind: 'character' | 'object';
  assetId: string;
  preparedModelPath: string;
  mode?: 'auto' | 'debug';
  notes?: string;
  requestedBy?: string;
  channel?: string;
}

export interface EmbedWorkspaceSeam {
  workspaceId: string;
  sameOriginPath: ProductRoute;
  outputRoot: string;
  upstreamUrl: string | null;
  contextKeys: string[];
  notes: string[];
  stateLabel: string;
  stateTone: BadgeTone;
}
