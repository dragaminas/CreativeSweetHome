<script lang="ts">
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import type {
    BadgeTone,
    SceneBriefApiResponse,
    SceneBriefCheckpointStatus
  } from '$lib/types/product';

  export let data;

  interface SceneBriefFormState {
    projectId: string;
    sceneId: string;
    intent: string;
    tone: string;
    narrative: string;
    characters: string;
    objects: string;
    constraints: string;
    references: string;
  }

  let form: SceneBriefFormState = { ...data.sceneFormDefaults };
  let submitting = false;
  let submitError = '';
  let result: SceneBriefApiResponse | null = null;

  function checkpointTone(status: SceneBriefCheckpointStatus | 'fail_compile' | 'fail_runtime'): BadgeTone {
    if (status === 'accepted') {
      return 'positive';
    }

    if (status === 'ambiguous') {
      return 'info';
    }

    return 'warning';
  }

  async function submitSceneBrief(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    submitting = true;
    submitError = '';

    try {
      const response = await fetch('/api/briefs/scene', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      });

      const payload = (await response.json()) as SceneBriefApiResponse;
      result = payload;

      if (!response.ok) {
        submitError = payload.message;
      }
    } catch (error) {
      submitError = error instanceof Error ? error.message : 'No fue posible enviar el scene brief.';
      result = null;
    } finally {
      submitting = false;
    }
  }
</script>

<div class="page">
  <section class="panel page-header fade-in">
    <div class="eyebrow">Scene authoring</div>
    <h2>Scene description workspace</h2>
    <p class="lede">
      Este workspace captura intencion, tono, personajes, objetos y restricciones para
      traducirlos a un <code>scene brief</code> estructurado y persistido en rutas
      canonicamente revisables.
    </p>
  </section>

  <section class="grid two">
    <article class="panel fade-in">
      <h3>Guided scene brief</h3>
      <form class="scene-brief-form" on:submit={submitSceneBrief}>
        <div class="form-grid two-up">
          <label>
            Project ID
            <input
              data-testid="scene-brief-project-id"
              bind:value={form.projectId}
              name="projectId"
              placeholder="pilot-feature"
            />
          </label>

          <label>
            Scene ID
            <input
              data-testid="scene-brief-scene-id"
              bind:value={form.sceneId}
              name="sceneId"
              placeholder="opening-alley"
            />
          </label>
        </div>

        <label>
          Intent
          <textarea
            data-testid="scene-brief-intent"
            bind:value={form.intent}
            name="intent"
            rows="2"
            placeholder="Que beat narrativo quieres capturar en esta escena."
            required></textarea>
        </label>

        <label>
          Tone
          <textarea
            data-testid="scene-brief-tone"
            bind:value={form.tone}
            name="tone"
            rows="2"
            placeholder="Tono visual y emocional para consumidores finales."
            required></textarea>
        </label>

        <label>
          Narrative
          <textarea
            data-testid="scene-brief-narrative"
            bind:value={form.narrative}
            name="narrative"
            rows="3"
            placeholder="Descripcion natural de la escena para enriquecer traduccion y resumen."></textarea>
        </label>

        <div class="form-grid two-up">
          <label>
            Characters (uno por linea o separado por comas)
            <textarea
              data-testid="scene-brief-characters"
              bind:value={form.characters}
              name="characters"
              rows="4"
              placeholder="Nora\ndron casero"></textarea>
          </label>

          <label>
            Objects (uno por linea o separado por comas)
            <textarea
              data-testid="scene-brief-objects"
              bind:value={form.objects}
              name="objects"
              rows="4"
              placeholder="moto electrica\nneones"></textarea>
          </label>
        </div>

        <label>
          Constraints (uno por linea o separado por comas)
          <textarea
            data-testid="scene-brief-constraints"
            bind:value={form.constraints}
            name="constraints"
            rows="3"
            placeholder="clip corto\ncontinuidad entre personaje y dron"></textarea>
        </label>

        <label>
          References (opcional)
          <textarea
            bind:value={form.references}
            name="references"
            rows="2"
            placeholder="moodboard lluvia nocturna, turnaround personaje"></textarea>
        </label>

        <button data-testid="scene-brief-submit" type="submit" disabled={submitting}>
          {submitting ? 'Saving scene brief...' : 'Create scene brief'}
        </button>
      </form>
    </article>

    <article class="panel fade-in">
      <h3>Checkpoint feedback</h3>

      {#if submitError}
        <p class="muted">{submitError}</p>
      {/if}

      {#if result}
        <div class="panel-stack" data-testid="scene-brief-feedback">
          <div class="inline-meta">
            <StatusBadge
              label={result.accepted ? 'accepted' : 'needs review'}
              tone={checkpointTone(result.status)}
            />
            <span class="code-chip" data-testid="scene-brief-checkpoint-status">{result.status}</span>
          </div>

          <p class="muted">{result.message}</p>

          {#if result.filePath}
            <div class="kv">
              <dt>Saved path</dt>
              <dd data-testid="scene-brief-saved-path">{result.filePath}</dd>
            </div>
          {/if}

          {#if result.artifact}
            <div class="data-grid">
              <div class="kv">
                <dt>Scene ID</dt>
                <dd>{result.artifact.sceneId}</dd>
              </div>
              <div class="kv">
                <dt>Project ID</dt>
                <dd>{result.artifact.projectId}</dd>
              </div>
              <div class="kv">
                <dt>Tone</dt>
                <dd>{result.artifact.source.tone || 'N/A'}</dd>
              </div>
              <div class="kv">
                <dt>Keywords</dt>
                <dd>{result.artifact.sharedBrief.extractedKeywords.join(', ') || 'N/A'}</dd>
              </div>
            </div>

            <ul class="list">
              {#each result.artifact.checkpoint.notes as note, noteIndex (`scene-note:${noteIndex}`)}
                <li>{note}</li>
              {/each}
            </ul>
          {/if}
        </div>
      {:else}
        <p class="muted">
          Cuando envies el formulario veras el estado <code>accepted</code>,
          <code>incomplete</code> o <code>ambiguous</code> junto con la ruta persistida del
          brief.
        </p>
      {/if}
    </article>
  </section>

  <section class="panel fade-in">
    <h3>Shared brief preview</h3>
    <div class="data-grid">
      <div class="kv">
        <dt>Intent</dt>
        <dd>{data.briefPreview.structure.intent}</dd>
      </div>
      <div class="kv">
        <dt>Project</dt>
        <dd>{data.briefPreview.structure.projectId}</dd>
      </div>
      <div class="kv">
        <dt>Workspace</dt>
        <dd>{data.briefPreview.structure.workspaceId}</dd>
      </div>
      <div class="kv">
        <dt>Keywords</dt>
        <dd>{data.briefPreview.extractedKeywords.join(', ')}</dd>
      </div>
    </div>
    <p class="muted">{data.briefPreview.normalizedNarrative}</p>
  </section>
</div>
