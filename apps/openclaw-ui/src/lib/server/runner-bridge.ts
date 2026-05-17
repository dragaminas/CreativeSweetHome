import { spawn } from 'node:child_process';
import path from 'node:path';

import type {
  AssetReferenceRunSummary,
  RunnerCatalog,
  RunnerDescriptionRecord,
  RunnerProgressEvent,
  RunnerTargetRecord,
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
