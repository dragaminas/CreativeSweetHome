import type { RequestHandler } from './$types';

import { json } from '@sveltejs/kit';

import { asRecord, asString, asNullableString, asStringArray } from '$lib/server/http';
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

    return json(
      {
        accepted: false,
        status: 'fail_compile',
        message: `Acción "${action}" no soportada en POST. Usa "create", "update" o "delete".`
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
