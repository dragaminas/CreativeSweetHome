<script lang="ts">
  import type { SceneEdition } from '$lib/types/navigation/projectEdition/sceneEdition';

  export let scene: SceneEdition;
</script>

<section class="scene-editor" data-testid="scene-editor" aria-labelledby="scene-editor-title">
  <header class="projects-editor-header">
    <div>
      <p class="eyebrow">Scene</p>
      <h2 id="scene-editor-title">{scene.view.name}</h2>
    </div>
    <span class="code-chip">{scene.view.sceneProgress}%</span>
  </header>

  <p class="muted">{scene.view.description}</p>

  <dl class="data-grid">
    <div class="kv">
      <dt>Script</dt>
      <dd>{scene.view.scriptId}</dd>
    </div>
    <div class="kv">
      <dt>Shots</dt>
      <dd>{scene.view.shotIds.join(', ')}</dd>
    </div>
    <div class="kv">
      <dt>Locations</dt>
      <dd>{scene.view.locationIds.join(', ')}</dd>
    </div>
    <div class="kv">
      <dt>Assets</dt>
      <dd>{scene.view.assetIds.join(', ')}</dd>
    </div>
  </dl>

  <h3>Pipeline</h3>
  <ul class="list">
    {#each scene.view.pipeline as stageState (stageState.stage)}
      <li>{stageState.label}: {stageState.status}</li>
    {/each}
  </ul>
</section>
