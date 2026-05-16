<script lang="ts">
  import type { AssetEditor as AssetEditorModel } from '$lib/types/navigation/projectEdition/assetEdition';

  export let asset: AssetEditorModel;

  $: description = asset.literalDescription;
  $: metrics = asset.assetVisualization.asset3DMetrics;
</script>

<section class="asset-editor" data-testid="asset-editor" aria-labelledby="asset-editor-title">
  <header class="projects-editor-header">
    <div>
      <p class="eyebrow">Asset</p>
      <h2 id="asset-editor-title">{description.assetName}</h2>
    </div>
  </header>

  <dl class="data-grid">
    <div class="kv">
      <dt>Type</dt>
      <dd>{description.assetType}</dd>
    </div>
    <div class="kv">
      <dt>System Path</dt>
      <dd>{description.assetSystemPath}</dd>
    </div>
    <div class="kv">
      <dt>Description</dt>
      <dd>{description.assetDescription.description}</dd>
    </div>
  </dl>

  {#if metrics}
    <h3>3D Metrics</h3>
    <dl class="data-grid">
      <div class="kv">
        <dt>Polygon Count</dt>
        <dd>{metrics.polygonCount}</dd>
      </div>
      <div class="kv">
        <dt>Texture Resolution</dt>
        <dd>{metrics.textureResolution}</dd>
      </div>
      <div class="kv">
        <dt>Rigging Complexity</dt>
        <dd>{metrics.riggingComplexity}</dd>
      </div>
      <div class="kv">
        <dt>Other Metrics</dt>
        <dd>{metrics.otherMetrics}</dd>
      </div>
    </dl>
  {/if}
</section>
