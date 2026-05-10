<script lang="ts">
  import StatusBadge from '$lib/components/StatusBadge.svelte';

  export let data;

  function formatRequiredInputs(value: unknown): string {
    return Array.isArray(value) ? value.join(', ') : 'none';
  }
</script>

<div class="page">
  <section class="panel page-header fade-in">
    <div class="eyebrow">Assisted local tool</div>
    <h2>Blender</h2>
    <p class="lede">
      El shell web no intenta sustituir Blender. Expone targets, feedback y evidencia del
      runner canonico para cleanup, rigging y fases futuras de composicion.
    </p>
  </section>

  <section class="grid two">
    <article class="panel fade-in">
      <div class="section-heading">
        <h3>Runner contract</h3>
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
            <dt>evidence root</dt>
            <dd>{data.runner.default_evidence_root}</dd>
          </div>
        </div>
      {:else}
        <p class="muted">{data.error}</p>
      {/if}
    </article>

    <article class="panel fade-in">
      <h3>Published targets</h3>
      <div class="grid">
        {#each data.targets as target (`${target.operation_kind}:${target.target_id}`)}
          <article class="card runner-card">
            <div class="inline-meta">
              <span class="code-chip">{target.target_id}</span>
              <span class="code-chip">{target.operation_kind}</span>
            </div>
            <h3>{target.display_label}</h3>
            <p class="muted">
              Required inputs: {formatRequiredInputs(target.metadata.required_inputs)}
            </p>
          </article>
        {/each}
      </div>
    </article>
  </section>
</div>
