<script lang="ts">
  import PathList from '$lib/components/PathList.svelte';
  import type { DirectoryStatus } from '$lib/types/product';
  import {
    type AssetEntry,
    type AssetKind,
    type AssetStage,
    type AssetStageState
  } from '$lib/server/asset-catalog';

  export let data;

  const ASSET_MATURITY_STAGES: AssetStage[] = [
    'description',
    'reference_image',
    'model_3d',
    'default_benchmark_animation',
    'asset_correction_through_benchmark_animation'
  ];

  $: assetDirectories = selectAssetDirectories(data.studio.directories);
  $: assetCatalog = data.assetCatalog || { total: 0, assets: [] };
  $: readiness = data.assetReadiness || null;

  let selectedKind: AssetKind = 'character';
  let activeProjectId = data.projectId || 'default';
  let activeSceneId = data.sceneId || 'scene-draft';
  let newLabel = '';
  let newDescription = '';
  let submitting = false;
  let updatingAssetId = '';
  let message = '';
  let messageType: 'success' | 'error' = 'success';
  let stageDraftByAssetId: Record<string, AssetStage> = {};
  let stateDraftByAssetId: Record<string, AssetStageState> = {};

  function selectAssetDirectories(directories: DirectoryStatus[]): DirectoryStatus[] {
    return directories.filter((directory) =>
      ['assets3d', 'exports', 'blender-projects'].includes(directory.id)
    );
  }

  function stageLabel(stage: AssetStage): string {
    const labels: Record<AssetStage, string> = {
      description: 'Descripción',
      reference_image: 'Imagen de referencia',
      model_3d: 'Modelo 3D',
      default_benchmark_animation: 'Benchmark de animación por defecto',
      asset_correction_through_benchmark_animation:
        'Corrección de asset tras benchmark'
    };
    return labels[stage] || stage;
  }

  function stageStateLabel(state: AssetStageState): string {
    const labels: Record<AssetStageState, string> = {
      pending: 'Pendiente',
      in_progress: 'En progreso',
      ready: 'Listo',
      failed: 'Fallido'
    };
    return labels[state] || state;
  }

  function stageStateTone(state: AssetStageState): string {
    if (state === 'ready') return 'positive';
    if (state === 'failed') return 'warning';
    if (state === 'in_progress') return 'info';
    return 'muted';
  }

  function stageDraft(asset: AssetEntry): AssetStage {
    return stageDraftByAssetId[asset.assetId] || asset.stage;
  }

  function stageStateDraft(asset: AssetEntry): AssetStageState {
    return stateDraftByAssetId[asset.assetId] || asset.stageState;
  }

  function updateDraft(assetId: string, field: 'stage' | 'stageState', value: string): void {
    if (field === 'stage') {
      stageDraftByAssetId = {
        ...stageDraftByAssetId,
        [assetId]: value as AssetStage
      };
      return;
    }

    stateDraftByAssetId = {
      ...stateDraftByAssetId,
      [assetId]: value as AssetStageState
    };
  }

  function hydrateDrafts(assets: AssetEntry[]): void {
    stageDraftByAssetId = Object.fromEntries(assets.map((asset) => [asset.assetId, asset.stage]));
    stateDraftByAssetId = Object.fromEntries(
      assets.map((asset) => [asset.assetId, asset.stageState])
    );
  }

  async function handleCreateAsset() {
    if (!newLabel.trim()) {
      message = 'El label es obligatorio.';
      messageType = 'error';
      return;
    }

    submitting = true;
    message = '';

    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          projectId: activeProjectId,
          sceneId: activeSceneId,
          kind: selectedKind,
          label: newLabel.trim(),
          description: newDescription.trim()
        })
      });

      const result = await response.json();

      if (result.accepted) {
        message = `Asset creado: ${result.assetId}`;
        messageType = 'success';
        newLabel = '';
        newDescription = '';
        await loadCatalog();
        await loadReadiness();
      } else {
        message = result.message || 'Error al crear el asset.';
        messageType = 'error';
      }
    } catch (error) {
      message = `Error de conexión: ${error instanceof Error ? error.message : 'Desconocido'}`;
      messageType = 'error';
    } finally {
      submitting = false;
    }
  }

  async function handleDeleteAsset(assetId: string) {
    try {
      const response = await fetch(
        `/api/assets?projectId=${activeProjectId}&sceneId=${activeSceneId}&kind=${selectedKind}&assetId=${assetId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (result.accepted) {
        message = `Asset eliminado: ${assetId}`;
        messageType = 'success';
        await loadCatalog();
        await loadReadiness();
      } else {
        message = result.message || 'Error al eliminar el asset.';
        messageType = 'error';
      }
    } catch (error) {
      message = `Error de conexión: ${error instanceof Error ? error.message : 'Desconocido'}`;
      messageType = 'error';
    }
  }

  async function handleUpdateAsset(asset: AssetEntry) {
    updatingAssetId = asset.assetId;

    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          projectId: activeProjectId,
          sceneId: activeSceneId,
          kind: selectedKind,
          assetId: asset.assetId,
          stage: stageDraft(asset),
          stageState: stageStateDraft(asset)
        })
      });

      const result = await response.json();

      if (result.accepted) {
        message = `Estado actualizado para ${asset.label}.`;
        messageType = 'success';
        await loadCatalog();
        await loadReadiness();
      } else {
        message = result.message || 'Error al actualizar el estado del asset.';
        messageType = 'error';
      }
    } catch (error) {
      message = `Error de conexión: ${error instanceof Error ? error.message : 'Desconocido'}`;
      messageType = 'error';
    } finally {
      updatingAssetId = '';
    }
  }

  async function loadCatalog() {
    try {
      const response = await fetch(
        `/api/assets?projectId=${activeProjectId}&sceneId=${activeSceneId}&kind=${selectedKind}`
      );
      const result = await response.json();
      assetCatalog = result;
      hydrateDrafts(result.assets || []);
    } catch {
      // Silently fail - catalog will show empty
    }
  }

  async function loadReadiness() {
    try {
      const response = await fetch(
        `/api/assets?projectId=${activeProjectId}&sceneId=${activeSceneId}&readiness=true`
      );
      const result = await response.json();
      readiness = result.readiness || null;
    } catch {
      readiness = null;
    }
  }

  $: activeProjectId = data.projectId || 'default';
  $: activeSceneId = data.sceneId || 'scene-draft';

  $: if (activeProjectId && activeSceneId && selectedKind) {
    loadCatalog();
  }

  $: if (activeProjectId && activeSceneId) {
    loadReadiness();
  }
</script>

<div class="page">
  <section class="panel page-header fade-in">
    <div class="eyebrow">Asset pipeline</div>
    <h2>Asset catalog</h2>
    <p class="lede">
      Cataloga personajes y objetos como entidades reutilizables del pipeline.
      El catálogo es filesystem-first y manifest-driven, sin base de datos paralela.
    </p>
  </section>

  {#if message}
    <div class="panel fade-in" class:success={messageType === 'success'} class:error={messageType === 'error'}>
      <p>{message}</p>
    </div>
  {/if}

  <section class="grid two">
    <article class="panel fade-in">
      <h3>Canonical roots</h3>
      <PathList directories={assetDirectories} />
    </article>

    <article class="panel fade-in">
      <h3>Readiness por etapa</h3>
      {#if readiness}
        <table class="readiness-table">
          <thead>
            <tr>
              <th>Etapa</th>
              <th>Personajes</th>
              <th>Objetos</th>
            </tr>
          </thead>
          <tbody>
            {#each ASSET_MATURITY_STAGES as stage}
              <tr>
                <td>{stageLabel(stage)}</td>
                <td>
                  <span class="badge tone-{stageStateTone(readiness.characters[stage])}">
                    {stageStateLabel(readiness.characters[stage])}
                  </span>
                </td>
                <td>
                  <span class="badge tone-{stageStateTone(readiness.objects[stage])}">
                    {stageStateLabel(readiness.objects[stage])}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p class="muted">Sin datos de readiness. Crea assets para ver el progreso.</p>
      {/if}
    </article>
  </section>

  <section class="panel fade-in">
    <h3>Crear asset</h3>
    <div class="asset-form">
      <div class="form-row">
        <label>
          Tipo:
          <select bind:value={selectedKind}>
            <option value="character">Personaje</option>
            <option value="object">Objeto</option>
          </select>
        </label>
      </div>
      <div class="form-row">
        <label>
          Label:
          <input
            type="text"
            bind:value={newLabel}
            placeholder="Nombre del asset"
            disabled={submitting}
          />
        </label>
      </div>
      <div class="form-row">
        <label>
          Descripción:
          <input
            type="text"
            bind:value={newDescription}
            placeholder="Descripción breve"
            disabled={submitting}
          />
        </label>
      </div>
      <div class="form-row">
        <button
          on:click={handleCreateAsset}
          disabled={submitting || !newLabel.trim()}
        >
          {submitting ? 'Creando...' : 'Crear asset'}
        </button>
      </div>
    </div>
  </section>

  <section class="panel fade-in">
    <h3>Catálogo de {selectedKind === 'character' ? 'personajes' : 'objetos'}</h3>
    {#if assetCatalog.total === 0}
      <p class="muted">No hay assets en este catálogo. Crea uno arriba.</p>
    {:else}
      <table class="asset-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Label</th>
            <th>Etapa</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {#each assetCatalog.assets as asset}
            <tr>
              <td><code>{asset.assetId}</code></td>
              <td>{asset.label}</td>
              <td>
                <select
                  value={stageDraft(asset)}
                  on:change={(event) =>
                    updateDraft(asset.assetId, 'stage', (event.currentTarget as HTMLSelectElement).value)}
                >
                  {#each ASSET_MATURITY_STAGES as stage}
                    <option value={stage}>{stageLabel(stage)}</option>
                  {/each}
                </select>
              </td>
              <td>
                <select
                  value={stageStateDraft(asset)}
                  on:change={(event) =>
                    updateDraft(
                      asset.assetId,
                      'stageState',
                      (event.currentTarget as HTMLSelectElement).value
                    )}
                >
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En progreso</option>
                  <option value="ready">Listo</option>
                  <option value="failed">Fallido</option>
                </select>
              </td>
              <td>
                <div class="row-actions">
                  <button
                    on:click={() => handleUpdateAsset(asset)}
                    disabled={updatingAssetId === asset.assetId}
                  >
                    {updatingAssetId === asset.assetId ? 'Guardando...' : 'Guardar estado'}
                  </button>
                  <button on:click={() => handleDeleteAsset(asset.assetId)}>Eliminar</button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>

  <section class="panel fade-in">
    <h3>Rules already enforced by the shell</h3>
    <ul class="list">
      <li>La UI no inventa otro layout fuera de <code>STUDIO_DIR</code>.</li>
      <li>Los briefs compartidos conectan scene authoring, assets y backends reales.</li>
      <li>Los manifests del catálogo son revisables y repo-owned.</li>
      <li>No se introduce una base de datos paralela en el MVP.</li>
    </ul>
  </section>
</div>

<style>
  .readiness-table,
  .asset-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
  }

  .readiness-table th,
  .readiness-table td,
  .asset-table th,
  .asset-table td {
    padding: 0.5rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .readiness-table th {
    font-weight: 600;
  }

  .asset-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1rem;
  }

  .form-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .form-row label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .form-row input,
  .form-row select {
    padding: 0.5rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .form-row button {
    padding: 0.5rem 1rem;
    background: var(--primary-color, #007bff);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .form-row button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .asset-table select {
    width: 100%;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .row-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .tone-positive {
    background: #d4edda;
    color: #155724;
  }

  .tone-warning {
    background: #fff3cd;
    color: #856404;
  }

  .tone-info {
    background: #d1ecf1;
    color: #0c5460;
  }

  .tone-muted {
    background: #e2e3e5;
    color: #383d41;
  }

  .muted {
    color: #6c757d;
    font-style: italic;
  }

  .success {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
  }

  .error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
  }
</style>
