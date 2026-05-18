<script lang="ts">
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import type { BadgeTone, ShotBriefApiResponse, ShotBriefCheckpointStatus } from '$lib/types/product';

  export let data;

  interface ShotBriefFormState {
    projectId: string;
    sceneId: string;
    shotId: string;
    intent: string;
    framing: string;
    durationMs: string;
    narrative: string;
    characters: string;
    constraints: string;
    references: string;
  }

  let form: ShotBriefFormState = { ...data.shotFormDefaults };
  let submitting = false;
  let submitError = '';
  let result: ShotBriefApiResponse | null = null;

  function checkpointTone(status: ShotBriefCheckpointStatus | 'fail_compile' | 'fail_runtime'): BadgeTone {
    if (status === 'accepted') {
      return 'positive';
    }

    if (status === 'ambiguous') {
      return 'info';
    }

    return 'warning';
  }

  function consistencyTone(status: 'consistent' | 'needs_review'): BadgeTone {
    return status === 'consistent' ? 'positive' : 'warning';
  }

  async function submitShotBrief(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    submitting = true;
    submitError = '';

    try {
      const response = await fetch('/api/briefs/shot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      });

      const payload = (await response.json()) as ShotBriefApiResponse;
      result = payload;

      if (!response.ok) {
        submitError = payload.message;
      }
    } catch (error) {
      submitError = error instanceof Error ? error.message : 'No fue posible enviar el shot brief.';
      result = null;
    } finally {
      submitting = false;
    }
  }
</script>

<div class="page">
  <section class="panel page-header fade-in">
    <div class="eyebrow">Shot authoring</div>
    <h2>Shot description workspace</h2>
    <p class="lede">
      Este workspace captura intencion, framing, duracion, personajes y constraints para
      traducirlos a un <code>shot brief</code> estructurado con feedback de consistencia
      contra escena y assets.
    </p>
  </section>

  <section class="grid two">
    <article class="panel fade-in">
      <h3>Guided shot brief</h3>
      <form class="scene-brief-form" on:submit={submitShotBrief}>
        <div class="form-grid three-up">
          <label>
            Project ID
            <input
              data-testid="shot-brief-project-id"
              bind:value={form.projectId}
              name="projectId"
              placeholder="pilot-feature"
              required
            />
          </label>

          <label>
            Scene ID
            <input
              data-testid="shot-brief-scene-id"
              bind:value={form.sceneId}
              name="sceneId"
              placeholder="opening-alley"
              required
            />
          </label>

          <label>
            Shot ID
            <input
              data-testid="shot-brief-shot-id"
              bind:value={form.shotId}
              name="shotId"
              placeholder="sh010"
              required
            />
          </label>
        </div>

        <label>
          Intent
          <textarea
            data-testid="shot-brief-intent"
            bind:value={form.intent}
            name="intent"
            rows="2"
            placeholder="Que accion principal captura esta toma."
            required></textarea>
        </label>

        <label>
          Framing
          <textarea
            data-testid="shot-brief-framing"
            bind:value={form.framing}
            name="framing"
            rows="2"
            placeholder="Tipo de plano, angulo y movimiento de camara."
            required></textarea>
        </label>

        <label>
          Duration (ms)
          <input
            data-testid="shot-brief-duration-ms"
            bind:value={form.durationMs}
            name="durationMs"
            type="number"
            min="1"
            step="1"
            required
          />
        </label>

        <label>
          Narrative (opcional)
          <textarea
            bind:value={form.narrative}
            name="narrative"
            rows="3"
            placeholder="Contexto textual para animacion/composicion."></textarea>
        </label>

        <label>
          Characters (uno por linea o separado por comas)
          <textarea
            data-testid="shot-brief-characters"
            bind:value={form.characters}
            name="characters"
            rows="3"
            placeholder="Nora"></textarea>
        </label>

        <label>
          Constraints (uno por linea o separado por comas)
          <textarea
            data-testid="shot-brief-constraints"
            bind:value={form.constraints}
            name="constraints"
            rows="3"
            placeholder="24fps\ncontinuidad de lluvia"></textarea>
        </label>

        <label>
          References (opcional)
          <textarea
            data-testid="shot-brief-references"
            bind:value={form.references}
            name="references"
            rows="2"
            placeholder="shotdeck-rain-night"></textarea>
        </label>

        <button data-testid="shot-brief-submit" type="submit" disabled={submitting}>
          {submitting ? 'Saving shot brief...' : 'Create shot brief'}
        </button>
      </form>
    </article>

    <article class="panel fade-in">
      <h3>Checkpoint feedback</h3>

      {#if submitError}
        <p class="muted">{submitError}</p>
      {/if}

      {#if result}
        <div class="panel-stack" data-testid="shot-brief-feedback">
          <div class="inline-meta">
            <StatusBadge
              label={result.accepted ? 'accepted' : 'needs review'}
              tone={checkpointTone(result.status)}
            />
            <span class="code-chip" data-testid="shot-brief-checkpoint-status">{result.status}</span>
          </div>

          <p class="muted">{result.message}</p>

          {#if result.filePath}
            <div class="kv">
              <dt>Saved path</dt>
              <dd data-testid="shot-brief-saved-path">{result.filePath}</dd>
            </div>
          {/if}

          {#if result.artifact}
            <div class="inline-meta">
              <StatusBadge
                label={result.artifact.consistency.status}
                tone={consistencyTone(result.artifact.consistency.status)}
              />
              <span class="code-chip" data-testid="shot-brief-consistency-status">
                {result.artifact.consistency.status}
              </span>
            </div>

            <div class="data-grid">
              <div class="kv">
                <dt>Scene ID</dt>
                <dd>{result.artifact.sceneId}</dd>
              </div>
              <div class="kv">
                <dt>Shot ID</dt>
                <dd>{result.artifact.shotId}</dd>
              </div>
              <div class="kv">
                <dt>Duration</dt>
                <dd>{result.artifact.source.durationMs} ms</dd>
              </div>
              <div class="kv">
                <dt>Characters</dt>
                <dd>{result.artifact.source.characters.join(', ') || 'N/A'}</dd>
              </div>
            </div>

            <ul class="list">
              {#each result.artifact.checkpoint.notes as note, noteIndex (`shot-note:${noteIndex}`)}
                <li>{note}</li>
              {/each}
              {#each result.artifact.consistency.notes as note, consistencyIndex (`consistency-note:${consistencyIndex}`)}
                <li>{note}</li>
              {/each}
            </ul>
          {/if}
        </div>
      {:else}
        <p class="muted">
          Cuando envies el formulario veras el estado <code>accepted</code>,
          <code>incomplete</code> o <code>ambiguous</code>, junto con la validacion de
          consistencia y la ruta persistida del brief.
        </p>
      {/if}
    </article>
  </section>
</div>
