export type BadgeTone = 'positive' | 'warning' | 'info' | 'muted';

export type RouteRole = 'authoring' | 'pipeline' | 'embedded' | 'engine' | 'assisted';

export type ProductRoute =
  | '/'
  | '/workspaces/scene'
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
