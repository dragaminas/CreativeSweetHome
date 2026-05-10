<script lang="ts">
  export let data;
</script>

<div class="page">
  <section class="panel page-header fade-in">
    <div class="eyebrow">Scene authoring</div>
    <h2>Scene description workspace</h2>
    <p class="lede">
      Phase 15 deja lista la seam de traduccion comun que phase 16 reutilizara para
      capturar briefs reales. La UI propia se ocupa del lenguaje humano; los prompts o
      payloads de backend quedan encapsulados.
    </p>
  </section>

  <section class="grid two">
    <article class="panel fade-in">
      <h3>Structured brief preview</h3>
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
    </article>

    <article class="panel fade-in">
      <h3>Checkpoint model</h3>
      <ul class="list">
        {#each data.briefPreview.checkpointLabels as checkpoint (checkpoint)}
          <li>{checkpoint}</li>
        {/each}
      </ul>
      <p class="muted">
        La persistencia del brief y sus estados <code>accepted</code>, <code>incomplete</code> y
        <code>ambiguous</code> se implementaran sobre esta misma base en phase 16.
      </p>
    </article>
  </section>

  <section class="panel fade-in">
    <h3>Consumer translations</h3>
    <div class="grid two">
      {#each data.briefPreview.consumerBriefs as consumerBrief (consumerBrief.consumerId)}
        <article class="card brief-card">
          <div class="inline-meta">
            <span class="code-chip">{consumerBrief.consumerId}</span>
            <span class="code-chip">{consumerBrief.operationHint}</span>
          </div>
          <h3>{consumerBrief.label}</h3>
          <p class="muted">{consumerBrief.summary}</p>
          <ul class="list">
            {#each consumerBrief.focusPoints as focusPoint, focusIndex (`${consumerBrief.consumerId}:${focusIndex}`)}
              <li>{focusPoint}</li>
            {/each}
          </ul>
        </article>
      {/each}
    </div>
  </section>
</div>
