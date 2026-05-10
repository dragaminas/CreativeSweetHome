import type { RequestHandler } from './$types';

import { loadKimodoEmbedSeam } from '$lib/server/kimodo-embed';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export const GET: RequestHandler = async () => {
  const seam = loadKimodoEmbedSeam();

  const html = `<!doctype html>
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
        <h1>Kimodo embed seam</h1>
        <p>
          Esta superficie same-origin ya esta reservada por el shell. El proxy o embed real
          llegara en phase 24 sin cambiar la ruta del producto.
        </p>
      </article>
      <article>
        <strong>Output root</strong>
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

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8'
    }
  });
};
