<script lang="ts">
  import { resolve } from '$app/paths';
  import PathList from '$lib/components/PathList.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import WorkspaceCard from '$lib/components/WorkspaceCard.svelte';

  export let data;
</script>

<div class="page">
  <section class="page-hero fade-in">
    <div class="eyebrow">Phase 15</div>
    <h1>OpenClaw Studio</h1>
    <p class="lede">
      Este shell en <code>SvelteKit</code> convierte la web en la experiencia primaria del
      producto sin abrir otro contrato de runner, otro <code>run_id</code> ni otra raiz de
      evidencia. Cada workspace cae sobre las mismas rutas canonicas del repo.
    </p>
  </section>

  <section class="page">
    <div class="section-heading">
      <h2>Workspace boundaries</h2>
      <StatusBadge
        label={data.runnerCatalog.bridge.label}
        tone={data.runnerCatalog.bridge.tone}
      />
    </div>

    <div class="grid three">
      {#each data.shell.workspaces as workspace (workspace.id)}
        <WorkspaceCard {workspace} />
      {/each}
    </div>
  </section>

  <section class="grid two">
    <div class="panel fade-in">
      <div class="section-heading">
        <h2>Canonical bridge</h2>
        <span class="code-chip">{data.runnerCatalog.runners.length} runners</span>
      </div>
      <p class="lede">{data.runnerCatalog.bridge.message}</p>

      <div class="grid">
        {#each data.runnerCatalog.runners as runner (runner.runner_id)}
          <article class="card runner-card">
            <div class="inline-meta">
              <span class="code-chip">{runner.runner_id}</span>
              <StatusBadge
                label={runner.supports_cancel ? 'cancelable' : 'non-cancelable'}
                tone={runner.supports_cancel ? 'positive' : 'muted'}
              />
            </div>
            <h3>{runner.display_label}</h3>
            <p class="muted">
              operations: {runner.supported_operation_kinds.join(', ')}
            </p>
            <span class="code-chip">{runner.default_evidence_root}</span>
          </article>
        {/each}
      </div>
    </div>

    <div class="panel fade-in">
      <div class="section-heading">
        <h2>Filesystem-first roots</h2>
        <span class="code-chip">STUDIO_DIR</span>
      </div>
      <p class="lede">
        El shell observa el mismo layout operativo que usan los wrappers, runners y
        evidencias del repo.
      </p>
      <PathList directories={data.studio.directories} />
    </div>
  </section>

  <section class="panel fade-in">
    <div class="section-heading">
      <h2>Shared brief seam</h2>
      <span class="code-chip">{data.briefPreview.slug}</span>
    </div>
    <p class="lede">{data.briefPreview.summary}</p>

    <div class="data-grid">
      <div class="kv">
        <dt>Intent</dt>
        <dd>{data.briefPreview.structure.intent}</dd>
      </div>
      <div class="kv">
        <dt>Keywords</dt>
        <dd>{data.briefPreview.extractedKeywords.join(', ')}</dd>
      </div>
      <div class="kv">
        <dt>Constraints</dt>
        <dd>{data.briefPreview.structure.constraints.join(', ')}</dd>
      </div>
      <div class="kv">
        <dt>References</dt>
        <dd>{data.briefPreview.structure.references.join(', ')}</dd>
      </div>
    </div>

    <div class="grid two">
      {#each data.briefPreview.consumerBriefs as consumerBrief (consumerBrief.consumerId)}
        <article class="card brief-card">
          <div class="inline-meta">
            <span class="code-chip">{consumerBrief.consumerId}</span>
            <a class="code-chip" href={resolve(consumerBrief.routeHint)}>
              {consumerBrief.routeHint}
            </a>
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
