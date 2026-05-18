import { spawn } from 'node:child_process';
import path from 'node:path';

import type {
  Asset3dRunSummary,
  AssetReferenceRunSummary,
  MeshCleanupRunSummary,
  RiggingRunSummary,
  RunnerCatalog,
  RunnerCommandLog,
  RunnerDescriptionRecord,
  RunnerProgressEvent,
  RunnerTargetRecord,
  StartAsset3dRunInput,
  StartRiggingRunInput,
  StartMeshCleanupRunInput,
  StartAssetReferenceRunInput,
  StartRunPayload
} from '$lib/types/product';
import { resolveRepoContext } from './env';

interface ProcessResult {
  code: number;
  stdout: string;
  stderr: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function progressEventsFromMetadata(value: unknown): RunnerProgressEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => asRecord(entry))
    .filter((entry) => asString(entry.step_id))
    .map((entry) => ({
      at: asString(entry.at) || undefined,
      step_id: asString(entry.step_id),
      state: asString(entry.state, 'unknown'),
      message: asString(entry.message, '')
    }));
}

function commandLogsFromMetadata(value: unknown): RunnerCommandLog[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => asRecord(entry))
    .filter((entry) => asString(entry.stage))
    .map((entry) => ({
      stage: asString(entry.stage),
      command_text: asString(entry.command_text) || asString(entry.command),
      stdout_log_path: asString(entry.stdout_log_path) || undefined,
      stderr_log_path: asString(entry.stderr_log_path) || undefined,
      exit_code: typeof entry.exit_code === 'number' ? entry.exit_code : undefined,
      started_at: asString(entry.started_at) || undefined,
      completed_at: asString(entry.completed_at) || undefined
    }));
}

function progressEventsFromCommandLogs(commandLogs: RunnerCommandLog[]): RunnerProgressEvent[] {
  return commandLogs.map((entry) => ({
    at: entry.completed_at || entry.started_at,
    step_id: entry.stage || 'command',
    state: entry.exit_code === 0 ? 'done' : 'failed',
    message:
      entry.exit_code === undefined
        ? 'Comando ejecutado.'
        : `Comando ejecutado con exit_code=${entry.exit_code}.`
  }));
}

function artifactRefMatching(artifactRefs: string[], pattern: RegExp): string | undefined {
  return artifactRefs.find((artifactRef) => pattern.test(artifactRef));
}

function toAssetReferenceRunSummary(payload: Record<string, unknown>): AssetReferenceRunSummary {
  const metadata = asRecord(payload.metadata);

  return {
    runner_id: asString(payload.runner_id, 'comfyui'),
    operation_kind: asString(payload.operation_kind, 'operate'),
    target_id: asString(payload.target_id),
    run_id: asString(payload.run_id),
    accepted: asBoolean(payload.accepted, true),
    status: asString(payload.status),
    message: asString(payload.message),
    artifact_refs: asStringArray(payload.artifact_refs),
    manifest_path: asString(payload.manifest_path) || undefined,
    summary_path: asString(payload.summary_path) || undefined,
    evidence_path: asString(payload.evidence_path) || undefined,
    progress_events: progressEventsFromMetadata(metadata.progress_events)
  };
}

function toMeshCleanupRunSummary(payload: Record<string, unknown>): MeshCleanupRunSummary {
  const metadata = asRecord(payload.metadata);
  const artifact_refs = asStringArray(payload.artifact_refs);
  const command_logs = commandLogsFromMetadata(metadata.command_logs);
  const metadataProgressEvents = progressEventsFromMetadata(metadata.progress_events);
  const progress_events =
    metadataProgressEvents.length > 0
      ? metadataProgressEvents
      : progressEventsFromCommandLogs(command_logs);

  return {
    runner_id: asString(payload.runner_id, 'blender'),
    operation_kind: asString(payload.operation_kind, 'operate'),
    target_id: asString(payload.target_id, 'cleanup_pre_rig_humanoid'),
    run_id: asString(payload.run_id),
    accepted: asBoolean(payload.accepted, true),
    status: asString(payload.status),
    message: asString(payload.message),
    artifact_refs,
    manifest_path: asString(payload.manifest_path) || undefined,
    summary_path: asString(payload.summary_path) || undefined,
    evidence_path: asString(payload.evidence_path) || undefined,
    cleanup_report_path:
      asString(payload.evidence_path) ||
      artifactRefMatching(artifact_refs, /cleanup-report\.md$/i),
    source_model_path: artifactRefMatching(artifact_refs, /__source__.*\.(glb|gltf|fbx|obj|ply|stl)$/i),
    cleaned_model_path: artifactRefMatching(artifact_refs, /__cleaned__.*\.(glb|gltf|fbx|obj|ply|stl)$/i),
    remeshed_model_path: artifactRefMatching(artifact_refs, /__remeshed__.*\.(glb|gltf|fbx|obj|ply|stl)$/i),
    progress_events,
    warnings: asStringArray(metadata.warnings),
    command_logs
  };
}

function toRiggingRunSummary(payload: Record<string, unknown>): RiggingRunSummary {
  const metadata = asRecord(payload.metadata);
  const artifact_refs = asStringArray(payload.artifact_refs);
  const command_logs = commandLogsFromMetadata(metadata.command_logs);
  const metadataProgressEvents = progressEventsFromMetadata(metadata.progress_events);
  const progress_events =
    metadataProgressEvents.length > 0
      ? metadataProgressEvents
      : progressEventsFromCommandLogs(command_logs);

  return {
    runner_id: asString(payload.runner_id, 'blender'),
    operation_kind: asString(payload.operation_kind, 'operate'),
    target_id: asString(payload.target_id, 'create_rig_humanoid'),
    run_id: asString(payload.run_id),
    accepted: asBoolean(payload.accepted, true),
    status: asString(payload.status),
    message: asString(payload.message),
    artifact_refs,
    manifest_path: asString(payload.manifest_path) || undefined,
    summary_path: asString(payload.summary_path) || undefined,
    evidence_path: asString(payload.evidence_path) || undefined,
    rigging_report_path:
      asString(payload.rigging_report_path) ||
      asString(payload.evidence_path) ||
      artifactRefMatching(artifact_refs, /rigging-report\.md$/i),
    prepared_model_path:
      asString(payload.prepared_model_path) ||
      asString(payload.source_model_path) ||
      artifactRefMatching(artifact_refs, /__prepared__.*\.(glb|gltf|fbx|obj|ply|stl)$/i),
    rigged_glb_path:
      asString(payload.rigged_glb_path) ||
      artifactRefMatching(artifact_refs, /__rigged__.*\.glb$/i),
    rigged_fbx_path:
      asString(payload.rigged_fbx_path) ||
      artifactRefMatching(artifact_refs, /__rigged__.*\.fbx$/i),
    validation_artifact_paths: artifact_refs.filter((artifactRef) =>
      /\/validation\/.+\.(png|jpe?g|webp|gif|bmp)$/i.test(artifactRef)
    ),
    progress_events,
    warnings: asStringArray(metadata.warnings),
    command_logs
  };
}

function runnerCommand(): { command: string; args: string[]; env: NodeJS.ProcessEnv; cwd: string } {
  const context = resolveRepoContext();
  const pythonPath = [context.pythonPath, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter);

  return {
    command: process.env.OPENCLAW_PYTHON_BIN || 'python3',
    args: ['-m', 'openclaw_studio.runner_cli', '--json'],
    env: {
      ...process.env,
      PYTHONPATH: pythonPath
    },
    cwd: context.repoRoot
  };
}

async function runProcess(extraArgs: string[]): Promise<ProcessResult> {
  const { command, args, env, cwd } = runnerCommand();

  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args, ...extraArgs], {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

async function runCliJson<T>(extraArgs: string[]): Promise<T> {
  const result = await runProcess(extraArgs);

  if (!result.stdout) {
    throw new Error(
      `La CLI canonica no devolvio JSON. stderr=${result.stderr || 'sin salida'}`
    );
  }

  try {
    return JSON.parse(result.stdout) as T;
  } catch (cause) {
    throw new Error(
      `No se pudo parsear la respuesta JSON del runner bridge: ${result.stdout}`
      ,
      { cause }
    );
  }
}

function bridgeStatus(message: string, state: RunnerCatalog['bridge']['state']): RunnerCatalog['bridge'] {
  const { command, args } = runnerCommand();

  return {
    state,
    label: state === 'ready' ? 'Runner bridge ready' : 'Runner bridge degraded',
    tone: state === 'ready' ? 'positive' : 'warning',
    message,
    command: [command, ...args, 'list-runners']
  };
}

export async function loadRunnerCatalog(): Promise<RunnerCatalog> {
  try {
    const runners = await runCliJson<RunnerDescriptionRecord[]>(['list-runners']);
    return {
      bridge: bridgeStatus(
        `Leyendo el registro canonico desde PYTHONPATH=src sin crear un runner HTTP paralelo.`,
        'ready'
      ),
      runners
    };
  } catch (error) {
    return {
      bridge: bridgeStatus(
        error instanceof Error ? error.message : 'Fallo al leer el catalogo de runners.',
        'degraded'
      ),
      runners: []
    };
  }
}

export async function describeRunner(runnerId: string): Promise<RunnerDescriptionRecord> {
  return runCliJson<RunnerDescriptionRecord>(['describe', runnerId]);
}

export async function listRunnerTargets(
  runnerId: string,
  operationKind: string
): Promise<RunnerTargetRecord[]> {
  return runCliJson<RunnerTargetRecord[]>(['list-targets', runnerId, operationKind]);
}

export async function startRun(payload: StartRunPayload): Promise<Record<string, unknown>> {
  const args = ['start', payload.runner_id, payload.operation_kind];

  if (payload.target_id) {
    args.push(payload.target_id);
  }

  if (payload.run_id) {
    args.push('--run-id', payload.run_id);
  }

  args.push('--requested-by', payload.requested_by || 'openclaw-ui');
  args.push('--channel', payload.channel || 'web-ui');
  args.push('--inputs-json', JSON.stringify(payload.inputs || {}));
  args.push('--options-json', JSON.stringify(payload.options || {}));

  return runCliJson<Record<string, unknown>>(args);
}

export async function startAssetReferenceRun(
  input: StartAssetReferenceRunInput
): Promise<AssetReferenceRunSummary> {
  const targetId =
    input.mode === 'import' ? 'asset-reference-import' : 'asset-reference-generate';

  const response = await startRun({
    runner_id: 'comfyui',
    operation_kind: 'operate',
    target_id: targetId,
    requested_by: input.requestedBy || 'openclaw-ui',
    channel: input.channel || 'web-ui',
    inputs: {
      project_id: input.projectId,
      scene_id: input.sceneId,
      asset_kind: input.assetKind,
      asset_id: input.assetId,
      brief_text: asString(input.briefText),
      preset_id: asString(input.presetId, 'uc-img-02-frame-baseline-preview'),
      reference_source_paths: input.referenceSourcePaths || [],
      notes: asString(input.notes)
    }
  });

  return toAssetReferenceRunSummary(response);
}

export async function startAsset3dRun(
  input: StartAsset3dRunInput
): Promise<Asset3dRunSummary> {
  const targetId =
    input.mode === 'import' ? 'asset-3d-import' : 'asset-3d-generate';

  const response = await startRun({
    runner_id: 'comfyui',
    operation_kind: 'operate',
    target_id: targetId,
    requested_by: input.requestedBy || 'openclaw-ui',
    channel: input.channel || 'web-ui',
    inputs: {
      project_id: input.projectId,
      scene_id: input.sceneId,
      asset_kind: input.assetKind,
      asset_id: input.assetId,
      source_model_path: asString(input.sourceModelPath),
      brief_text: asString(input.briefText),
      preset_id: asString(input.presetId, 'uc-3d-02-image-to-asset-trellis2-gguf-q4-v1'),
      reference_source_paths: input.referenceSourcePaths || [],
      notes: asString(input.notes)
    }
  });

  return toAssetReferenceRunSummary(response);
}

export async function startMeshCleanupRun(
  input: StartMeshCleanupRunInput
): Promise<MeshCleanupRunSummary> {
  const response = await startRun({
    runner_id: 'blender',
    operation_kind: 'operate',
    target_id: 'cleanup_pre_rig_humanoid',
    requested_by: input.requestedBy || 'openclaw-ui',
    channel: input.channel || 'web-ui',
    inputs: {
      project_id: input.projectId,
      scene_id: input.sceneId,
      asset_kind: input.assetKind,
      entity_id: input.assetId,
      source_model_path: input.sourceModelPath,
      notes: asString(input.notes)
    },
    options: {
      mode: input.mode || 'auto'
    }
  });

  const runId = asString(response.run_id);
  if (!runId) {
    return toMeshCleanupRunSummary(response);
  }

  try {
    const statusPayload = await getRunStatus('blender', runId);
    return toMeshCleanupRunSummary(statusPayload);
  } catch {
    return toMeshCleanupRunSummary(response);
  }
}

export async function startRiggingRun(
  input: StartRiggingRunInput
): Promise<RiggingRunSummary> {
  const response = await startRun({
    runner_id: 'blender',
    operation_kind: 'operate',
    target_id: 'create_rig_humanoid',
    requested_by: input.requestedBy || 'openclaw-ui',
    channel: input.channel || 'web-ui',
    inputs: {
      project_id: input.projectId,
      scene_id: input.sceneId,
      asset_kind: input.assetKind,
      entity_id: input.assetId,
      prepared_model_path: input.preparedModelPath,
      notes: asString(input.notes)
    },
    options: {
      mode: input.mode || 'auto'
    }
  });

  const runId = asString(response.run_id);
  if (!runId) {
    return toRiggingRunSummary(response);
  }

  try {
    const statusPayload = await getRunStatus('blender', runId);
    return toRiggingRunSummary(statusPayload);
  } catch {
    return toRiggingRunSummary(response);
  }
}

export async function getRunStatus(
  runnerId: string,
  runId: string
): Promise<Record<string, unknown>> {
  return runCliJson<Record<string, unknown>>(['status', runnerId, runId]);
}

export async function getRunResult(
  runnerId: string,
  runId: string
): Promise<Record<string, unknown>> {
  return runCliJson<Record<string, unknown>>(['result', runnerId, runId]);
}

export async function cancelRun(
  runnerId: string,
  runId: string,
  requestedBy = 'openclaw-ui',
  channel = 'web-ui'
): Promise<Record<string, unknown>> {
  return runCliJson<Record<string, unknown>>([
    'cancel',
    runnerId,
    runId,
    '--requested-by',
    requestedBy,
    '--channel',
    channel
  ]);
}
