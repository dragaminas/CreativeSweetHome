import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';

import type { RequestHandler } from './$types';

import { json } from '@sveltejs/kit';

import { asRecord, asString, asNullableString, asStringArray } from '$lib/server/http';
import { buildAssetReferenceBriefText } from '$lib/server/brief-translator';
import { resolveRepoContext } from '$lib/server/env';
import {
  startAsset3dRun,
  startAssetReferenceRun,
  startMeshCleanupRun,
  startRiggingRun
} from '$lib/server/runner-bridge';
import {
  listAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetReadiness,
  type AssetStage,
  type AssetStageState
} from '$lib/server/asset-catalog';

function parseAssetKind(value: unknown): 'character' | 'object' | null {
  if (value === 'character' || value === 'object') {
    return value;
  }

  return null;
}

function parseOptionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return asStringArray(value);
}

function parseReferenceSourcePaths(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,/g)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function parseCleanupMode(value: unknown): 'auto' | 'debug' | null {
  if (value === undefined || value === null || value === '') {
    return 'auto';
  }

  if (value === 'auto' || value === 'debug') {
    return value;
  }

  return null;
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveMeshCleanupSourceModelPath(
  projectId: string,
  assetId: string
): Promise<string | null> {
  const context = resolveRepoContext();
  const assetRoot = path.join(context.assets3dDir, projectId, assetId);

  const directCandidates = [
    path.join(assetRoot, 'blender', 'imports', `${assetId}__mesh_candidate__v001.glb`),
    path.join(assetRoot, 'blender', 'imports', `${assetId}__mesh_candidate__v001.gltf`),
    path.join(assetRoot, 'comfyui', 'output', `${assetId}__mesh_candidate__v001.glb`),
    path.join(assetRoot, 'comfyui', 'output', `${assetId}__mesh_candidate__v001.gltf`)
  ];

  for (const directCandidate of directCandidates) {
    if (await fileExists(directCandidate)) {
      return directCandidate;
    }
  }

  const searchRoots = [
    path.join(assetRoot, 'blender', 'imports'),
    path.join(assetRoot, 'comfyui', 'output')
  ];
  const supportedExtensions = new Set(['.fbx', '.glb', '.gltf', '.obj', '.ply', '.stl']);
  const discovered: Array<{ filePath: string; mtimeMs: number; score: number }> = [];

  for (const rootPath of searchRoots) {
    let entries: Dirent[] = [];
    try {
      entries = await fs.readdir(rootPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!supportedExtensions.has(extension)) {
        continue;
      }

      const filePath = path.join(rootPath, entry.name);
      try {
        const stats = await fs.stat(filePath);
        discovered.push({
          filePath,
          mtimeMs: stats.mtimeMs,
          score: entry.name.includes('mesh_candidate') ? 2 : 1
        });
      } catch {
        // ignore stale files
      }
    }
  }

  if (discovered.length === 0) {
    return null;
  }

  discovered.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.mtimeMs - a.mtimeMs;
  });

  return discovered[0]?.filePath || null;
}

async function resolveRiggingPreparedModelPath(
  projectId: string,
  assetId: string
): Promise<string | null> {
  const context = resolveRepoContext();
  const cleanupRoot = path.join(context.assets3dDir, projectId, assetId, 'cleanup');
  const supportedExtensions = new Set(['.fbx', '.glb', '.gltf', '.obj', '.ply', '.stl']);
  const discovered: Array<{ filePath: string; mtimeMs: number; score: number }> = [];

  let runEntries: Dirent[] = [];
  try {
    runEntries = await fs.readdir(cleanupRoot, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const runEntry of runEntries) {
    if (!runEntry.isDirectory()) {
      continue;
    }

    const outputDir = path.join(cleanupRoot, runEntry.name, 'output');
    let outputEntries: Dirent[] = [];
    try {
      outputEntries = await fs.readdir(outputDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const outputEntry of outputEntries) {
      if (!outputEntry.isFile()) {
        continue;
      }

      const extension = path.extname(outputEntry.name).toLowerCase();
      if (!supportedExtensions.has(extension)) {
        continue;
      }

      const filePath = path.join(outputDir, outputEntry.name);
      try {
        const stats = await fs.stat(filePath);
        const lowerName = outputEntry.name.toLowerCase();
        const score = lowerName.includes('__remeshed__')
          ? 3
          : lowerName.includes('__cleaned__')
            ? 2
            : 1;
        discovered.push({
          filePath,
          mtimeMs: stats.mtimeMs,
          score
        });
      } catch {
        // ignore stale files
      }
    }
  }

  if (discovered.length === 0) {
    return null;
  }

  discovered.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.mtimeMs - a.mtimeMs;
  });

  return discovered[0]?.filePath || null;
}

function mapRunStatusToAssetStageState(
  status: string,
  options: { softPassAsReady?: boolean } = {}
): AssetStageState {
  if (status === 'pass') {
    return 'ready';
  }
  if (status === 'soft_pass_with_fallback') {
    return options.softPassAsReady ? 'ready' : 'in_progress';
  }
  if (status === 'running' || status === 'queued') {
    return 'in_progress';
  }
  if (status === 'cancelled') {
    return 'pending';
  }
  return 'failed';
}

export const GET: RequestHandler = async ({ url }) => {
  const projectId = asString(url.searchParams.get('projectId') || '');
  const sceneId = asString(url.searchParams.get('sceneId') || '');
  const kindParam = asNullableString(url.searchParams.get('kind'));
  const kind = kindParam ? parseAssetKind(kindParam) : null;
  const readiness = url.searchParams.get('readiness');

  if (!projectId || !sceneId) {
    return json(
      {
        accepted: false,
        status: 'fail_compile',
        message: 'projectId y sceneId son obligatorios.'
      },
      { status: 400 }
    );
  }

  if (kindParam && !kind) {
    return json(
      {
        accepted: false,
        status: 'fail_compile',
        message: 'kind debe ser "character" u "object".'
      },
      { status: 400 }
    );
  }

  try {
    if (readiness === 'true') {
      const assetReadiness = await getAssetReadiness(projectId, sceneId);
      return json({
        accepted: true,
        status: 'ok',
        message: 'Readiness de assets calculado.',
        readiness: assetReadiness
      });
    }

    const result = await listAssets({
      projectId,
      sceneId,
      kind: kind || undefined
    });

    return json({
      accepted: result.status === 'ok' || result.status === 'empty',
      status: result.status,
      message: result.message,
      total: result.total,
      assets: result.assets,
      manifestPath: result.manifestPath
    });
  } catch (error) {
    return json(
      {
        accepted: false,
        status: 'fail_runtime',
        message:
          error instanceof Error
            ? `No se pudo listar el catalogo de assets: ${error.message}`
            : 'No se pudo listar el catalogo de assets.'
      },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ request }) => {
  const body = asRecord(await request.json());
  const action = asString(body.action, 'create');

  const projectId = asString(body.projectId || '');
  const sceneId = asString(body.sceneId || '');
  const explicitKind = parseAssetKind(body.kind);
  const kind = explicitKind || 'character';

  if (!projectId || !sceneId) {
    return json(
      {
        accepted: false,
        status: 'fail_compile',
        message: 'projectId y sceneId son obligatorios.'
      },
      { status: 400 }
    );
  }

  if (body.kind !== undefined && !explicitKind) {
    return json(
      {
        accepted: false,
        status: 'fail_compile',
        message: 'kind debe ser "character" u "object".'
      },
      { status: 400 }
    );
  }

  try {
    if (action === 'create') {
      const label = asString(body.label, '');
      if (!label) {
        return json(
          {
            accepted: false,
            status: 'fail_compile',
            message: 'El label del asset es obligatorio.'
          },
          { status: 400 }
        );
      }

      const result = await createAsset({
        projectId,
        sceneId,
        kind,
        label,
        description: asString(body.description),
        tags: asStringArray(body.tags),
        references: asStringArray(body.references)
      });

      const statusMap: Record<string, number> = {
        created: 201,
        collision: 409,
        fail_compile: 400,
        fail_runtime: 500
      };

      return json(
        {
          accepted: result.status === 'created',
          status: result.status,
          message: result.message,
          assetId: result.assetId,
          manifestPath: result.manifestPath,
          asset: result.asset
        },
        { status: statusMap[result.status] || 500 }
      );
    }

    if (action === 'update') {
      const assetId = asString(body.assetId || '');
      if (!assetId) {
        return json(
          {
            accepted: false,
            status: 'fail_compile',
            message: 'assetId es obligatorio para actualizar.'
          },
          { status: 400 }
        );
      }

      const result = await updateAsset({
        projectId,
        sceneId,
        kind,
        assetId,
        label: asString(body.label),
        description: asString(body.description),
        stage: body.stage as AssetStage | undefined,
        stageState: body.stageState as AssetStageState | undefined,
        tags: parseOptionalStringArray(body.tags),
        references: parseOptionalStringArray(body.references)
      });

      const statusMap: Record<string, number> = {
        updated: 200,
        not_found: 404,
        fail_compile: 400,
        fail_runtime: 500
      };

      return json(
        {
          accepted: result.status === 'updated',
          status: result.status,
          message: result.message,
          assetId: result.assetId,
          manifestPath: result.manifestPath,
          asset: result.asset
        },
        { status: statusMap[result.status] || 500 }
      );
    }

    if (action === 'reference_import' || action === 'reference_generate') {
      const assetId = asString(body.assetId || '');
      if (!assetId) {
        return json(
          {
            accepted: false,
            status: 'fail_compile',
            message: 'assetId es obligatorio para gestionar referencias.'
          },
          { status: 400 }
        );
      }

      const referenceSourcePaths = parseReferenceSourcePaths(
        body.referenceSourcePaths ?? body.reference_source_paths
      );
      if (action === 'reference_import' && referenceSourcePaths.length === 0) {
        return json(
          {
            accepted: false,
            status: 'fail_compile',
            message: 'reference_source_paths debe incluir al menos una ruta para importar.'
          },
          { status: 400 }
        );
      }

      const catalog = await listAssets({
        projectId,
        sceneId,
        kind
      });
      const asset = catalog.assets.find((entry) => entry.assetId === assetId);
      if (!asset) {
        return json(
          {
            accepted: false,
            status: 'not_found',
            message: `No se encontro el asset ${assetId} en el catalogo ${kind}.`
          },
          { status: 404 }
        );
      }

      const draftBrief = asString(body.brief || body.briefText || body.prompt || asset.description || asset.label);
      if (action === 'reference_generate' && !draftBrief.trim()) {
        return json(
          {
            accepted: false,
            status: 'fail_compile',
            message: 'brief es obligatorio para generar referencias.'
          },
          { status: 400 }
        );
      }

      const run = await startAssetReferenceRun({
        mode: action === 'reference_import' ? 'import' : 'generate',
        projectId,
        sceneId,
        assetKind: kind,
        assetId,
        briefText: buildAssetReferenceBriefText({
          projectId,
          sceneId,
          assetKind: kind,
          assetId,
          assetLabel: asset.label,
          assetDescription: asset.description,
          brief: draftBrief,
          references: asset.references,
          notes: asString(body.notes)
        }),
        presetId: asString(body.presetId, 'uc-img-02-frame-baseline-preview'),
        notes: asString(body.notes),
        referenceSourcePaths
      });

      const updated = await updateAsset({
        projectId,
        sceneId,
        kind,
        assetId,
        stage: 'reference_image',
        stageState: mapRunStatusToAssetStageState(run.status),
        references:
          action === 'reference_import' && run.artifact_refs.length > 0
            ? run.artifact_refs
            : undefined
      });

      return json(
        {
          accepted: run.accepted,
          status: run.status,
          message: run.message,
          assetId,
          asset: updated.asset,
          manifestPath: updated.manifestPath,
          run
        },
        { status: run.accepted ? 200 : 502 }
      );
    }

    if (action === 'asset_3d_import' || action === 'asset_3d_generate') {
      const assetId = asString(body.assetId || '');
      if (!assetId) {
        return json(
          {
            accepted: false,
            status: 'fail_compile',
            message: 'assetId es obligatorio para gestionar modelado 3D.'
          },
          { status: 400 }
        );
      }

      const sourceModelPath = asString(body.sourceModelPath || body.source_model_path);
      if (action === 'asset_3d_import' && !sourceModelPath.trim()) {
        return json(
          {
            accepted: false,
            status: 'fail_compile',
            message: 'source_model_path es obligatorio para importar un candidato 3D.'
          },
          { status: 400 }
        );
      }

      const catalog = await listAssets({
        projectId,
        sceneId,
        kind
      });
      const asset = catalog.assets.find((entry) => entry.assetId === assetId);
      if (!asset) {
        return json(
          {
            accepted: false,
            status: 'not_found',
            message: `No se encontro el asset ${assetId} en el catalogo ${kind}.`
          },
          { status: 404 }
        );
      }

      const draftBrief = asString(body.brief || body.briefText || body.prompt || asset.description || asset.label);
      if (action === 'asset_3d_generate' && !draftBrief.trim()) {
        return json(
          {
            accepted: false,
            status: 'fail_compile',
            message: 'brief es obligatorio para modelar un candidato 3D.'
          },
          { status: 400 }
        );
      }

      const referenceSourcePaths = parseReferenceSourcePaths(
        body.referenceSourcePaths ?? body.reference_source_paths
      );
      const run = await startAsset3dRun({
        mode: action === 'asset_3d_import' ? 'import' : 'generate',
        projectId,
        sceneId,
        assetKind: kind,
        assetId,
        sourceModelPath,
        briefText: buildAssetReferenceBriefText({
          projectId,
          sceneId,
          assetKind: kind,
          assetId,
          assetLabel: asset.label,
          assetDescription: asset.description,
          brief: draftBrief,
          references: asset.references,
          notes: asString(body.notes)
        }),
        presetId: asString(body.presetId, 'uc-3d-02-image-to-asset-trellis2-gguf-q4-v1'),
        notes: asString(body.notes),
        referenceSourcePaths
      });

      const updated = await updateAsset({
        projectId,
        sceneId,
        kind,
        assetId,
        stage: 'model_3d',
        stageState: mapRunStatusToAssetStageState(run.status)
      });

      return json(
        {
          accepted: run.accepted,
          status: run.status,
          message: run.message,
          assetId,
          asset: updated.asset,
          manifestPath: updated.manifestPath,
          run
        },
        { status: run.accepted ? 200 : 502 }
      );
    }

    if (action === 'mesh_cleanup') {
      const assetId = asString(body.assetId || '');
      if (!assetId) {
        return json(
          {
            accepted: false,
            status: 'fail_compile',
            message: 'assetId es obligatorio para ejecutar cleanup de meshes.'
          },
          { status: 400 }
        );
      }

      const mode = parseCleanupMode(body.mode);
      if (!mode) {
        return json(
          {
            accepted: false,
            status: 'fail_compile',
            message: 'mode debe ser "auto" o "debug".'
          },
          { status: 400 }
        );
      }

      const catalog = await listAssets({
        projectId,
        sceneId,
        kind
      });
      const asset = catalog.assets.find((entry) => entry.assetId === assetId);
      if (!asset) {
        return json(
          {
            accepted: false,
            status: 'not_found',
            message: `No se encontro el asset ${assetId} en el catalogo ${kind}.`
          },
          { status: 404 }
        );
      }

      const sourceModelPathInput = asString(body.sourceModelPath || body.source_model_path).trim();
      const sourceModelPath =
        sourceModelPathInput ||
        (await resolveMeshCleanupSourceModelPath(catalog.projectId, asset.assetId));
      if (!sourceModelPath) {
        return json(
          {
            accepted: false,
            status: 'fail_compile',
            message:
              'source_model_path es obligatorio para cleanup. Importa primero un candidato 3D o especifica la ruta manual.'
          },
          { status: 400 }
        );
      }

      const run = await startMeshCleanupRun({
        projectId: catalog.projectId,
        sceneId: catalog.sceneId,
        assetKind: kind,
        assetId: asset.assetId,
        sourceModelPath,
        mode,
        notes: asString(body.notes)
      });

      const updated = await updateAsset({
        projectId: catalog.projectId,
        sceneId: catalog.sceneId,
        kind,
        assetId: asset.assetId,
        stage: 'model_3d',
        stageState: mapRunStatusToAssetStageState(run.status, {
          softPassAsReady: true
        })
      });

      return json(
        {
          accepted: run.accepted,
          status: run.status,
          message: run.message,
          assetId: asset.assetId,
          asset: updated.asset,
          manifestPath: updated.manifestPath,
          run
        },
        { status: run.accepted ? 200 : 502 }
      );
    }

    if (action === 'create_rig_humanoid') {
      const assetId = asString(body.assetId || '');
      if (!assetId) {
        return json(
          {
            accepted: false,
            status: 'fail_compile',
            message: 'assetId es obligatorio para ejecutar rigging humanoide.'
          },
          { status: 400 }
        );
      }

      const mode = parseCleanupMode(body.mode);
      if (!mode) {
        return json(
          {
            accepted: false,
            status: 'fail_compile',
            message: 'mode debe ser "auto" o "debug".'
          },
          { status: 400 }
        );
      }

      const catalog = await listAssets({
        projectId,
        sceneId,
        kind
      });
      const asset = catalog.assets.find((entry) => entry.assetId === assetId);
      if (!asset) {
        return json(
          {
            accepted: false,
            status: 'not_found',
            message: `No se encontro el asset ${assetId} en el catalogo ${kind}.`
          },
          { status: 404 }
        );
      }

      const preparedModelPathInput = asString(body.preparedModelPath || body.prepared_model_path).trim();
      const preparedModelPath =
        preparedModelPathInput ||
        (await resolveRiggingPreparedModelPath(catalog.projectId, asset.assetId));
      if (!preparedModelPath) {
        return json(
          {
            accepted: false,
            status: 'fail_compile',
            message:
              'prepared_model_path es obligatorio para rigging. Ejecuta cleanup pre-rig o especifica la ruta manual.'
          },
          { status: 400 }
        );
      }

      const run = await startRiggingRun({
        projectId: catalog.projectId,
        sceneId: catalog.sceneId,
        assetKind: kind,
        assetId: asset.assetId,
        preparedModelPath,
        mode,
        notes: asString(body.notes)
      });

      const updated = await updateAsset({
        projectId: catalog.projectId,
        sceneId: catalog.sceneId,
        kind,
        assetId: asset.assetId,
        stage: 'model_3d',
        stageState: mapRunStatusToAssetStageState(run.status, {
          softPassAsReady: true
        })
      });

      return json(
        {
          accepted: run.accepted,
          status: run.status,
          message: run.message,
          assetId: asset.assetId,
          asset: updated.asset,
          manifestPath: updated.manifestPath,
          run
        },
        { status: run.accepted ? 200 : 502 }
      );
    }

    return json(
      {
        accepted: false,
        status: 'fail_compile',
        message:
          `Acción "${action}" no soportada en POST. ` +
          'Usa "create", "update", "reference_import", "reference_generate", ' +
          '"asset_3d_import", "asset_3d_generate", "mesh_cleanup" o "create_rig_humanoid".'
      },
      { status: 400 }
    );
  } catch (error) {
    return json(
      {
        accepted: false,
        status: 'fail_runtime',
        message:
          error instanceof Error
            ? `No se pudo procesar la acción de asset: ${error.message}`
            : 'No se pudo procesar la acción de asset.'
      },
      { status: 500 }
    );
  }
};

export const DELETE: RequestHandler = async ({ url, request }) => {
  const projectId = asString(url.searchParams.get('projectId') || '');
  const sceneId = asString(url.searchParams.get('sceneId') || '');
  const kind = parseAssetKind(url.searchParams.get('kind')) || 'character';
  const assetId = asString(url.searchParams.get('assetId') || '');

  if (!projectId || !sceneId || !assetId) {
    return json(
      {
        accepted: false,
        status: 'fail_compile',
        message: 'projectId, sceneId y assetId son obligatorios.'
      },
      { status: 400 }
    );
  }

  try {
    const result = await deleteAsset({
      projectId,
      sceneId,
      kind,
      assetId
    });

    const statusMap: Record<string, number> = {
      deleted: 200,
      not_found: 404,
      fail_compile: 400,
      fail_runtime: 500
    };

    return json(
      {
        accepted: result.status === 'deleted',
        status: result.status,
        message: result.message,
        assetId: result.assetId,
        manifestPath: result.manifestPath
      },
      { status: statusMap[result.status] || 500 }
    );
  } catch (error) {
    return json(
      {
        accepted: false,
        status: 'fail_runtime',
        message:
          error instanceof Error
            ? `No se pudo eliminar el asset: ${error.message}`
            : 'No se pudo eliminar el asset.'
      },
      { status: 500 }
    );
  }
};
