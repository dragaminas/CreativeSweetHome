<script lang="ts">
  import StatusBadge from '$lib/components/StatusBadge.svelte';

  export let data;
</script>

<div class="page">
  <section class="panel page-header fade-in">
    <div class="eyebrow">Engine boundary</div>
    <h2>ComfyUI</h2>
    <p class="lede">
      La experiencia primaria del producto no expone el canvas general de ComfyUI. Este
      workspace ya queda orientado a presets de producto, progreso, cancelacion y artefactos
      legibles sobre el runner compartido.
    </p>
  </section>

  <section class="grid two">
    <article class="panel fade-in">
      <div class="section-heading">
        <h3>Engine contract</h3>
        {#if data.runner}
          <StatusBadge label="available" tone="positive" />
        {:else}
          <StatusBadge label="unavailable" tone="warning" />
        {/if}
      </div>
      {#if data.runner}
        <p class="muted">{data.runner.display_label}</p>
        <div class="data-grid">
          <div class="kv">
            <dt>runner_id</dt>
            <dd>{data.runner.runner_id}</dd>
          </div>
          <div class="kv">
            <dt>cancel</dt>
            <dd>{data.runner.supports_cancel ? 'supported' : 'not supported'}</dd>
          </div>
          <div class="kv">
            <dt>progress</dt>
            <dd>{data.runner.supports_progress ? 'supported' : 'not supported'}</dd>
          </div>
          <div class="kv">
            <dt>evidence root</dt>
            <dd>{data.runner.default_evidence_root}</dd>
          </div>
        </div>
      {:else}
        <p class="muted">{data.error}</p>
      {/if}
    </article>

    <article class="panel fade-in">
      <h3>Product-facing presets</h3>
      <div class="grid">
        {#each data.targets as target (`${target.operation_kind}:${target.target_id}`)}
          <article class="card runner-card">
            <div class="inline-meta">
              <span class="code-chip">{target.target_id}</span>
              <span class="code-chip">{String(target.metadata.preset_id || 'suite')}</span>
            </div>
            <h3>{target.display_label}</h3>
            <p class="muted">
              use_case: {String(target.metadata.use_case_id || 'smoke-suite')}
            </p>
          </article>
        {/each}
      </div>
    </article>
  </section>
</div>
