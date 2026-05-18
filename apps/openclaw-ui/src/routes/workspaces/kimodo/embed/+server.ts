import type { RequestHandler } from './$types';

import { json } from '@sveltejs/kit';

import { asRecord, asString } from '$lib/server/http';
import {
  loadKimodoEmbedSeam,
  prepareKimodoEmbedContext,
  type PrepareKimodoEmbedContextInput
} from '$lib/server/kimodo-embed';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function queryValue(url: URL, key: string, fallbackKey?: string): string {
  const primary = url.searchParams.get(key)?.trim() || '';
  if (primary) {
    return primary;
  }
  return fallbackKey ? url.searchParams.get(fallbackKey)?.trim() || '' : '';
}

function embedInputFromUrl(url: URL): PrepareKimodoEmbedContextInput | null {
  const projectId = queryValue(url, 'projectId', 'project_id');
  const sceneId = queryValue(url, 'sceneId', 'scene_id');
  const shotId = queryValue(url, 'shotId', 'shot_id');
  const characterId = queryValue(url, 'characterId', 'character_id');

  if (!projectId || !sceneId || !shotId || !characterId) {
    return null;
  }

  return { projectId, sceneId, shotId, characterId };
}

function embedInputFromBody(payload: Record<string, unknown>): PrepareKimodoEmbedContextInput | null {
  const projectId = asString(payload.projectId) || asString(payload.project_id);
  const sceneId = asString(payload.sceneId) || asString(payload.scene_id);
  const shotId = asString(payload.shotId) || asString(payload.shot_id);
  const characterId = asString(payload.characterId) || asString(payload.character_id);

  if (!projectId || !sceneId || !shotId || !characterId) {
    return null;
  }

  return {
    projectId,
    sceneId,
    shotId,
    characterId,
    requestedBy: asString(payload.requestedBy) || asString(payload.requested_by) || 'openclaw-ui',
    channel: asString(payload.channel) || 'web-ui'
  };
}

function compileFailureResponse() {
  return {
    accepted: false,
    status: 'fail_compile',
    message:
      'projectId, sceneId, shotId y characterId son obligatorios para crear el contexto de embed de Kimodo.'
  };
}

function htmlDocument(
  seam: ReturnType<typeof loadKimodoEmbedSeam>,
  contextSummary:
    | {
        status: string;
        message: string;
        contextPath: string;
        statePath: string;
        outputRoot: string;
        consistencyNotes: string[];
      }
    | null
): string {
  const summaryBlock = contextSummary
    ? `
      <article>
        <strong>Context bridge</strong>
        <p><code>${escapeHtml(contextSummary.status)}</code> — ${escapeHtml(contextSummary.message)}</p>
        <p><strong>Context path:</strong> <code>${escapeHtml(contextSummary.contextPath)}</code></p>
        <p><strong>State path:</strong> <code>${escapeHtml(contextSummary.statePath)}</code></p>
        <p><strong>Output root:</strong> <code>${escapeHtml(contextSummary.outputRoot)}</code></p>
        <ul>${contextSummary.consistencyNotes
          .map((note) => `<li>${escapeHtml(note)}</li>`)
          .join('')}</ul>
      </article>`
    : `
      <article>
        <strong>Context bridge</strong>
        <p>
          Envia <code>projectId</code>, <code>sceneId</code>, <code>shotId</code> y
          <code>characterId</code> por query o <code>POST</code> para persistir contexto canonico.
        </p>
      </article>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kimodo embed seam</title>
    <style>
      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Avenir Next", sans-serif;
        background: linear-gradient(180deg, #f7f0e3 0%, #eee1c7 100%);
        color: #201912;
      }
      main {
        display: grid;
        gap: 1rem;
        padding: 1.5rem;
      }
      article {
        padding: 1.25rem;
        border-radius: 18px;
        background: rgba(255, 251, 244, 0.82);
        border: 1px solid rgba(68, 50, 34, 0.12);
      }
      .chip {
        display: inline-flex;
        padding: 0.18rem 0.6rem;
        border-radius: 999px;
        background: rgba(13, 107, 95, 0.12);
        color: #0d6b5f;
        font-weight: 700;
      }
      code {
        font-family: ui-monospace, monospace;
      }
      ul {
        margin: 0;
        padding-left: 1.1rem;
        color: #62584a;
        line-height: 1.65;
      }
    </style>
  </head>
  <body>
    <main>
      <article>
        <span class="chip">Kimodo embed seam</span>
        <h1>Kimodo backend bridge</h1>
        <p>
          Esta superficie same-origin persiste contexto canonico de escena, shot y personaje para
          embeber Kimodo sin crear una ruta paralela.
        </p>
      </article>
      ${summaryBlock}
      <article>
        <strong>Bridge root</strong>
        <p><code>${escapeHtml(seam.outputRoot)}</code></p>
        <strong>Context keys</strong>
        <ul>${seam.contextKeys
          .map((contextKey) => `<li>${escapeHtml(contextKey)}</li>`)
          .join('')}</ul>
      </article>
      <article>
        <strong>Upstream configured</strong>
        <p>${escapeHtml(seam.upstreamUrl || 'not yet configured')}</p>
      </article>
    </main>
  </body>
</html>`;
}

export const GET: RequestHandler = async ({ url, request }) => {
  const seam = loadKimodoEmbedSeam();
  const wantsJson =
    url.searchParams.get('format') === 'json' ||
    request.headers.get('accept')?.includes('application/json');
  const input = embedInputFromUrl(url);

  if (wantsJson) {
    if (!input) {
      return json(compileFailureResponse(), { status: 400 });
    }

    try {
      const prepared = await prepareKimodoEmbedContext(input);
      return json(prepared);
    } catch (error) {
      return json(
        {
          accepted: false,
          status: 'fail_runtime',
          message:
            error instanceof Error
              ? `No fue posible preparar el contexto de Kimodo: ${error.message}`
              : 'No fue posible preparar el contexto de Kimodo.'
        },
        { status: 500 }
      );
    }
  }

  let contextSummary: {
    status: string;
    message: string;
    contextPath: string;
    statePath: string;
    outputRoot: string;
    consistencyNotes: string[];
  } | null = null;

  if (input) {
    try {
      const prepared = await prepareKimodoEmbedContext(input);
      contextSummary = {
        status: prepared.status,
        message: prepared.message,
        contextPath: prepared.contextPath,
        statePath: prepared.statePath,
        outputRoot: prepared.context.outputRoot,
        consistencyNotes: prepared.context.consistency.notes
      };
    } catch {
      contextSummary = null;
    }
  }

  const html = htmlDocument(seam, contextSummary);

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8'
    }
  });
};

export const POST: RequestHandler = async ({ request }) => {
  const body = asRecord(await request.json());
  const input = embedInputFromBody(body);

  if (!input) {
    return json(compileFailureResponse(), { status: 400 });
  }

  try {
    const prepared = await prepareKimodoEmbedContext(input);
    return json(prepared);
  } catch (error) {
    return json(
      {
        accepted: false,
        status: 'fail_runtime',
        message:
          error instanceof Error
            ? `No fue posible preparar el contexto de Kimodo: ${error.message}`
            : 'No fue posible preparar el contexto de Kimodo.'
      },
      { status: 500 }
    );
  }
};
