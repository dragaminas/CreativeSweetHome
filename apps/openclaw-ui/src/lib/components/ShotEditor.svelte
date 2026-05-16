<script lang="ts">
  import type { ShotEdition } from '$lib/types/navigation/projectEdition/shotEdition';

  export let shot: ShotEdition;
</script>

<section class="shot-editor" data-testid="shot-editor" aria-labelledby="shot-editor-title">
  <header class="projects-editor-header">
    <div>
      <p class="eyebrow">Shot</p>
      <h2 id="shot-editor-title">{shot.view.name}</h2>
    </div>
    <span class="code-chip">order {shot.view.order}</span>
  </header>

  <p class="muted">{shot.view.description}</p>

  <dl class="data-grid">
    <div class="kv">
      <dt>Scene</dt>
      <dd>{shot.view.sceneId}</dd>
    </div>
    <div class="kv">
      <dt>Location</dt>
      <dd>{shot.view.locationId}</dd>
    </div>
    <div class="kv">
      <dt>Duration</dt>
      <dd>{shot.view.durationMs} ms</dd>
    </div>
    <div class="kv">
      <dt>Frame Rate</dt>
      <dd>{shot.view.frameRate} fps</dd>
    </div>
    <div class="kv">
      <dt>Framing</dt>
      <dd>
        {shot.view.framing.shotSize}
        {#if shot.view.framing.cameraAngle} / {shot.view.framing.cameraAngle}{/if}
        {#if shot.view.framing.cameraMove} / {shot.view.framing.cameraMove}{/if}
        {#if shot.view.framing.lensMm} / {shot.view.framing.lensMm}mm{/if}
      </dd>
    </div>
  </dl>

  <h3>Bindings</h3>
  {#if shot.view.bindings.length}
    <ul class="list">
      {#each shot.view.bindings as binding (`${binding.asset.id}:${binding.role}`)}
        <li>{binding.asset.label}: {binding.role} needs {binding.requiredStage} ({binding.readiness})</li>
      {/each}
    </ul>
  {:else}
    <p class="muted">No asset bindings yet.</p>
  {/if}

  <h3>Pipeline</h3>
  <ul class="list">
    {#each shot.view.pipeline as stageState (stageState.stage)}
      <li>{stageState.label}: {stageState.status}</li>
    {/each}
  </ul>
</section>
