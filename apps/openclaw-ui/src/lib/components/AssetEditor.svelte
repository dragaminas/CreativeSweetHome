<script lang="ts">
  import type { AssetEditor as AssetEditorModel } from '$lib/types/navigation/projectEdition/assetEdition';

  export let asset: AssetEditorModel;

  $: description = asset.literalDescription;
  $: metrics = asset.assetVisualization.asset3DMetrics;

  let targetResolution = '1024x1024';
  let generatedImageName = '';
  let uploadedImageName = '';
  let generatedModelName = '';
  let uploadedModelName = '';
  let lastFeedback = '';
  let referenceImageFile: File | null = null;
  let activeModelFile: File | null = null;

  function fallbackImageFile(): File {
    return new File([], `${description.assetName || 'asset'}-reference.png`, {
      type: 'image/png'
    });
  }

  function fallbackModelFile(): File {
    return new File([], `${description.assetName || 'asset'}-candidate.glb`, {
      type: 'model/gltf-binary'
    });
  }

  function handleGenerateReference(): void {
    const generated = asset.assetEdition.generateImage(description.assetDescription, targetResolution);
    generatedImageName = generated.name;
    referenceImageFile = generated;
    lastFeedback = `Referencia generada: ${generated.name}`;
  }

  function handleUploadImage(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    asset.assetEdition.uploadImage(file);
    uploadedImageName = file.name;
    referenceImageFile = file;
    lastFeedback = `Referencia subida: ${file.name}`;
  }

  function handleGenerateModel(): void {
    const baseImage = referenceImageFile || fallbackImageFile();
    const generated = asset.assetEdition.generateModel(description.assetDescription, baseImage);
    generatedModelName = generated.name;
    activeModelFile = generated;
    lastFeedback = `Modelo 3D generado: ${generated.name}`;
  }

  function handleUploadModel(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    asset.assetEdition.uploadModel(file);
    uploadedModelName = file.name;
    activeModelFile = file;
    lastFeedback = `Modelo 3D subido: ${file.name}`;
  }

  function handleOpenInBlender(): void {
    const modelFile = activeModelFile || fallbackModelFile();
    asset.assetEdition.openInBlender(modelFile);
    lastFeedback = `Handoff enviado a Blender: ${modelFile.name}`;
  }
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

  <h3>Controles de asset 3D</h3>
  <div class="inline-meta">
    <button type="button" on:click={handleGenerateReference} data-testid="asset-editor-generate-reference">
      Generar referencia
    </button>
    <button type="button" on:click={handleGenerateModel} data-testid="asset-editor-generate-model">
      Generar modelo 3D
    </button>
    <button type="button" on:click={handleOpenInBlender} data-testid="asset-editor-open-blender">
      Abrir en Blender
    </button>
  </div>

  <div class="data-grid">
    <div class="kv">
      <dt>Resolución de referencia</dt>
      <dd>
        <input type="text" bind:value={targetResolution} />
      </dd>
    </div>
    <div class="kv">
      <dt>Subir referencia</dt>
      <dd>
        <input type="file" accept="image/*" on:change={handleUploadImage} data-testid="asset-editor-upload-image" />
      </dd>
    </div>
    <div class="kv">
      <dt>Subir modelo 3D</dt>
      <dd>
        <input
          type="file"
          accept=".fbx,.glb,.gltf,.obj,.ply,.stl"
          on:change={handleUploadModel}
          data-testid="asset-editor-upload-model"
        />
      </dd>
    </div>
  </div>

  <ul class="list">
    <li data-testid="asset-editor-generated-image">
      Referencia generada: {generatedImageName || 'pendiente'}
    </li>
    <li>Referencia subida: {uploadedImageName || 'pendiente'}</li>
    <li data-testid="asset-editor-generated-model">
      Modelo 3D generado: {generatedModelName || 'pendiente'}
    </li>
    <li>Modelo 3D subido: {uploadedModelName || 'pendiente'}</li>
    <li data-testid="asset-editor-last-feedback">Última acción: {lastFeedback || 'sin acciones'}</li>
  </ul>
</section>
