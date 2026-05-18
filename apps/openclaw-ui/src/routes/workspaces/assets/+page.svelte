<script lang="ts">
  import PathList from '$lib/components/PathList.svelte';
  import type {
    Asset3dRunSummary,
    AssetReferenceRunSummary,
    DirectoryStatus,
    RunnerProgressEvent,
    RunnerTargetRecord
  } from '$lib/types/product';
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

  const REFERENCE_PRESET_OPTIONS = [
    'uc-img-02-frame-baseline-preview',
    'uc-img-03-style-exploration',
    'uc-vid-03-image-to-video-reference'
  ];

  const MODEL_3D_PRESET_OPTIONS = ['uc-3d-02-image-to-asset-trellis2-gguf-q4-v1'];

  type ReferenceMode = 'import' | 'generate';
  type Model3dMode = 'import' | 'generate';

  interface ReferenceWorkspaceResponse {
    accepted: boolean;
    status: string;
    message: string;
    run?: AssetReferenceRunSummary;
  }

  interface Model3dWorkspaceResponse {
    accepted: boolean;
    status: string;
    message: string;
    run?: Asset3dRunSummary;
  }

  $: assetDirectories = selectAssetDirectories(data.studio.directories);
  $: assetCatalog = data.assetCatalog || { total: 0, assets: [] };
  $: readiness = data.assetReadiness || null;
  $: operateTargets = (data.referenceTargets || []) as RunnerTargetRecord[];
  $: availableAssets = (assetCatalog.assets || []) as AssetEntry[];

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

  let referenceAssetId = '';
  let referenceMode: ReferenceMode = 'import';
  let referenceSourcePathsText = '';
  let referenceBrief = '';
  let referencePresetId = REFERENCE_PRESET_OPTIONS[0];
  let referenceNotes = '';
  let referenceSubmitting = false;
  let referenceRun: AssetReferenceRunSummary | null = null;
  let referenceError = '';

  let model3dAssetId = '';
  let model3dMode: Model3dMode = 'import';
  let model3dSourceModelPath = '';
  let model3dSourceReferencePathsText = '';
  let model3dBrief = '';
  let model3dPresetId = MODEL_3D_PRESET_OPTIONS[0];
  let model3dNotes = '';
  let model3dSubmitting = false;
  let model3dRun: Asset3dRunSummary | null = null;
  let model3dError = '';

  function selectAssetDirectories(directories: DirectoryStatus[]): DirectoryStatus[] {
    return directories.filter((directory) =>
      ['assets3d', 'exports', 'blender-projects', 'validation-comfyui'].includes(directory.id)
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

  function runStatusTone(status: string): string {
    if (status === 'pass') return 'positive';
    if (status === 'soft_pass_with_fallback' || status === 'running' || status === 'queued') {
      return 'info';
    }
    if (status === 'cancelled') return 'muted';
    return 'warning';
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

  function parseSourcePathsText(value: string): string[] {
    return value
      .split(/\r?\n|,/g)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function selectedReferenceTarget(): RunnerTargetRecord | null {
    const targetId = referenceMode === 'import' ? 'asset-reference-import' : 'asset-reference-generate';
    return operateTargets.find((target) => target.target_id === targetId) || null;
  }

  function selectedReferenceNotes(): string {
    const notes = selectedReferenceTarget()?.metadata?.notes;
    return typeof notes === 'string' ? notes : '';
  }

  function selectedModel3dTarget(): RunnerTargetRecord | null {
    const targetId = model3dMode === 'import' ? 'asset-3d-import' : 'asset-3d-generate';
    return operateTargets.find((target) => target.target_id === targetId) || null;
  }

  function selectedModel3dNotes(): string {
    const notes = selectedModel3dTarget()?.metadata?.notes;
    return typeof notes === 'string' ? notes : '';
  }

  function normalizeAssetRun(payload: Record<string, unknown>): AssetReferenceRunSummary {
    const metadata =
      payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
        ? (payload.metadata as Record<string, unknown>)
        : {};

    const progressEvents: RunnerProgressEvent[] = Array.isArray(metadata.progress_events)
      ? metadata.progress_events
          .filter((entry): entry is Record<string, unknown> =>
            Boolean(entry && typeof entry === 'object' && !Array.isArray(entry))
          )
          .map((entry) => ({
            at: typeof entry.at === 'string' ? entry.at : undefined,
            step_id: typeof entry.step_id === 'string' ? entry.step_id : 'unknown',
            state: typeof entry.state === 'string' ? entry.state : 'unknown',
            message: typeof entry.message === 'string' ? entry.message : ''
          }))
      : [];

    return {
      runner_id: typeof payload.runner_id === 'string' ? payload.runner_id : 'comfyui',
      operation_kind: typeof payload.operation_kind === 'string' ? payload.operation_kind : 'operate',
      target_id: typeof payload.target_id === 'string' ? payload.target_id : '',
      run_id: typeof payload.run_id === 'string' ? payload.run_id : '',
      accepted: typeof payload.accepted === 'boolean' ? payload.accepted : true,
      status: typeof payload.status === 'string' ? payload.status : 'fail_runtime',
      message: typeof payload.message === 'string' ? payload.message : '',
      artifact_refs: Array.isArray(payload.artifact_refs)
        ? payload.artifact_refs.filter((entry): entry is string => typeof entry === 'string')
        : [],
      manifest_path: typeof payload.manifest_path === 'string' ? payload.manifest_path : undefined,
      summary_path: typeof payload.summary_path === 'string' ? payload.summary_path : undefined,
      evidence_path: typeof payload.evidence_path === 'string' ? payload.evidence_path : undefined,
      progress_events: progressEvents
    };
  }

  function canCancel(run: AssetReferenceRunSummary | Asset3dRunSummary | null): boolean {
    return Boolean(run && (run.status === 'running' || run.status === 'queued'));
  }

  function isImagePath(filePath: string): boolean {
    return /\.(png|jpe?g|webp|gif|bmp)$/i.test(filePath);
  }

  function isModelPath(filePath: string): boolean {
    return /\.(fbx|glb|gltf|obj|ply|stl)$/i.test(filePath);
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

  async function handleReferenceSubmit() {
    referenceError = '';

    if (!referenceAssetId) {
      referenceError = 'Selecciona un asset para continuar.';
      return;
    }

    const sourcePaths = parseSourcePathsText(referenceSourcePathsText);
    if (referenceMode === 'import' && sourcePaths.length === 0) {
      referenceError = 'Debes indicar al menos una ruta fuente para importar referencias.';
      return;
    }

    if (referenceMode === 'generate' && !referenceBrief.trim()) {
      referenceError = 'El brief es obligatorio para generar referencias.';
      return;
    }

    referenceSubmitting = true;

    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: referenceMode === 'import' ? 'reference_import' : 'reference_generate',
          projectId: activeProjectId,
          sceneId: activeSceneId,
          kind: selectedKind,
          assetId: referenceAssetId,
          brief: referenceBrief,
          presetId: referencePresetId,
          notes: referenceNotes,
          referenceSourcePaths: sourcePaths
        })
      });

      const result = (await response.json()) as ReferenceWorkspaceResponse;
      if (!result.accepted || !result.run) {
        referenceError = result.message || 'No se pudo completar la corrida de referencias.';
        return;
      }

      referenceRun = result.run;
      message = result.message;
      messageType =
        result.status === 'pass' || result.status === 'soft_pass_with_fallback'
          ? 'success'
          : 'error';

      await loadCatalog();
      await loadReadiness();
    } catch (error) {
      referenceError =
        error instanceof Error
          ? `No se pudo enviar la corrida: ${error.message}`
          : 'No se pudo enviar la corrida.';
    } finally {
      referenceSubmitting = false;
    }
  }

  async function refreshReferenceStatus() {
    if (!referenceRun?.run_id) {
      return;
    }

    try {
      const response = await fetch(`/api/runs/comfyui/${referenceRun.run_id}`);
      const payload = (await response.json()) as Record<string, unknown>;
      referenceRun = normalizeAssetRun(payload);
    } catch {
      // no-op
    }
  }

  async function cancelReferenceRun() {
    if (!referenceRun?.run_id) {
      return;
    }

    try {
      const response = await fetch(`/api/runs/comfyui/${referenceRun.run_id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_by: 'openclaw-ui',
          channel: 'web-ui'
        })
      });

      const payload = (await response.json()) as Record<string, unknown>;
      referenceRun = normalizeAssetRun(payload);
    } catch {
      // no-op
    }
  }

  async function handleModel3dSubmit() {
    model3dError = '';

    if (!model3dAssetId) {
      model3dError = 'Selecciona un asset para continuar.';
      return;
    }

    if (model3dMode === 'import' && !model3dSourceModelPath.trim()) {
      model3dError = 'Debes indicar source_model_path para importar un candidato 3D.';
      return;
    }

    if (model3dMode === 'generate' && !model3dBrief.trim()) {
      model3dError = 'El brief es obligatorio para modelar un candidato 3D.';
      return;
    }

    const sourcePaths = parseSourcePathsText(model3dSourceReferencePathsText);
    model3dSubmitting = true;

    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: model3dMode === 'import' ? 'asset_3d_import' : 'asset_3d_generate',
          projectId: activeProjectId,
          sceneId: activeSceneId,
          kind: selectedKind,
          assetId: model3dAssetId,
          sourceModelPath: model3dSourceModelPath,
          brief: model3dBrief,
          presetId: model3dPresetId,
          notes: model3dNotes,
          referenceSourcePaths: sourcePaths
        })
      });

      const result = (await response.json()) as Model3dWorkspaceResponse;
      if (!result.accepted || !result.run) {
        model3dError = result.message || 'No se pudo completar la corrida de asset 3D.';
        return;
      }

      model3dRun = result.run;
      message = result.message;
      messageType =
        result.status === 'pass' || result.status === 'soft_pass_with_fallback'
          ? 'success'
          : 'error';

      await loadCatalog();
      await loadReadiness();
    } catch (error) {
      model3dError =
        error instanceof Error
          ? `No se pudo enviar la corrida 3D: ${error.message}`
          : 'No se pudo enviar la corrida 3D.';
    } finally {
      model3dSubmitting = false;
    }
  }

  async function refreshModel3dStatus() {
    if (!model3dRun?.run_id) {
      return;
    }

    try {
      const response = await fetch(`/api/runs/comfyui/${model3dRun.run_id}`);
      const payload = (await response.json()) as Record<string, unknown>;
      model3dRun = normalizeAssetRun(payload);
    } catch {
      // no-op
    }
  }

  async function cancelModel3dRun() {
    if (!model3dRun?.run_id) {
      return;
    }

    try {
      const response = await fetch(`/api/runs/comfyui/${model3dRun.run_id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_by: 'openclaw-ui',
          channel: 'web-ui'
        })
      });

      const payload = (await response.json()) as Record<string, unknown>;
      model3dRun = normalizeAssetRun(payload);
    } catch {
      // no-op
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

  $: if (availableAssets.length > 0 && !availableAssets.some((asset) => asset.assetId === referenceAssetId)) {
    referenceAssetId = availableAssets[0].assetId;
  }

  $: if (availableAssets.length > 0 && !availableAssets.some((asset) => asset.assetId === model3dAssetId)) {
    model3dAssetId = availableAssets[0].assetId;
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
    <h3>Referencias de asset (ComfyUI encapsulado)</h3>
    <p class="muted">
      Selecciona el asset, el modo de trabajo y deja que el runner canónico gestione la operación.
      No se expone el canvas de ComfyUI.
    </p>

    <div class="asset-form">
      <div class="form-row">
        <label>
          Asset:
          <select bind:value={referenceAssetId} data-testid="asset-reference-asset-id">
            {#if availableAssets.length === 0}
              <option value="">Sin assets disponibles</option>
            {:else}
              {#each availableAssets as asset}
                <option value={asset.assetId}>{asset.label} ({asset.assetId})</option>
              {/each}
            {/if}
          </select>
        </label>
      </div>

      <div class="form-row">
        <label>
          Modo:
          <select bind:value={referenceMode} data-testid="asset-reference-mode">
            <option value="import">Importar referencias existentes</option>
            <option value="generate">Generar referencias desde brief</option>
          </select>
        </label>
      </div>

      {#if referenceMode === 'generate'}
        <div class="form-row">
          <label>
            Brief simplificado:
            <textarea
              bind:value={referenceBrief}
              rows="4"
              placeholder="Describe la referencia deseada en lenguaje natural"
              data-testid="asset-reference-brief"
            ></textarea>
          </label>
        </div>
        <div class="form-row">
          <label>
            Preset de producto:
            <select bind:value={referencePresetId} data-testid="asset-reference-preset-id">
              {#each REFERENCE_PRESET_OPTIONS as presetId}
                <option value={presetId}>{presetId}</option>
              {/each}
            </select>
          </label>
        </div>
      {/if}

      <div class="form-row">
        <label>
          Rutas fuente (una por línea):
          <textarea
            bind:value={referenceSourcePathsText}
            rows="3"
            placeholder="/ruta/a/ref-01.png"
            data-testid="asset-reference-source-paths"
          ></textarea>
        </label>
      </div>

      <div class="form-row">
        <label>
          Notas operativas:
          <input
            type="text"
            bind:value={referenceNotes}
            placeholder="Opcional: contexto extra para la corrida"
          />
        </label>
      </div>

      {#if selectedReferenceNotes()}
        <p class="muted target-notes">
          {selectedReferenceNotes()}
        </p>
      {/if}

      <div class="row-actions">
        <button
          on:click={handleReferenceSubmit}
          disabled={referenceSubmitting || !referenceAssetId}
          data-testid="asset-reference-submit"
        >
          {referenceSubmitting ? 'Procesando...' : 'Ejecutar referencia'}
        </button>
        <button on:click={refreshReferenceStatus} disabled={!referenceRun?.run_id} data-testid="asset-reference-refresh">
          Refrescar estado
        </button>
        <button
          on:click={cancelReferenceRun}
          disabled={!canCancel(referenceRun)}
          data-testid="asset-reference-cancel"
        >
          Cancelar
        </button>
      </div>

      {#if referenceError}
        <p class="error-inline">{referenceError}</p>
      {/if}
    </div>

    {#if referenceRun}
      <div class="reference-run-results">
        <div class="inline-meta">
          <span class="badge tone-{runStatusTone(referenceRun.status)}" data-testid="asset-reference-run-status">
            {referenceRun.status}
          </span>
          <span class="code-chip">{referenceRun.run_id}</span>
          <span class="code-chip">{referenceRun.target_id}</span>
        </div>

        <p data-testid="asset-reference-run-message">{referenceRun.message}</p>

        <p>
          <strong>Evidencia:</strong>
          <code data-testid="asset-reference-evidence-path">{referenceRun.evidence_path || 'sin evidencia aún'}</code>
        </p>

        <div data-testid="asset-reference-artifacts">
          <strong>Artefactos:</strong>
          {#if referenceRun.artifact_refs.length === 0}
            <p class="muted">Sin artefactos publicados.</p>
          {:else}
            <ul class="list artifact-list">
              {#each referenceRun.artifact_refs as artifact}
                <li>
                  <code>{artifact}</code>
                  {#if isImagePath(artifact)}
                    <span class="muted"> · preview image</span>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </div>

        <div data-testid="asset-reference-checkpoints">
          <strong>Checkpoints:</strong>
          {#if referenceRun.progress_events.length === 0}
            <p class="muted">Sin checkpoints reportados por el runner.</p>
          {:else}
            <ul class="list progress-list">
              {#each referenceRun.progress_events as event}
                <li>
                  <code>{event.step_id}</code> · {event.state} · {event.message}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
    {/if}
  </section>

  <section class="panel fade-in">
    <h3>Importación o modelado 3D (Trellis2 encapsulado)</h3>
    <p class="muted">
      Lleva el asset catalogado a un candidato 3D bajo <code>Assets3D/</code>, con checkpoints y evidencia
      canónica sin exponer nodos de backend.
    </p>

    <div class="asset-form">
      <div class="form-row">
        <label>
          Asset:
          <select bind:value={model3dAssetId} data-testid="asset-3d-asset-id">
            {#if availableAssets.length === 0}
              <option value="">Sin assets disponibles</option>
            {:else}
              {#each availableAssets as asset}
                <option value={asset.assetId}>{asset.label} ({asset.assetId})</option>
              {/each}
            {/if}
          </select>
        </label>
      </div>

      <div class="form-row">
        <label>
          Modo:
          <select bind:value={model3dMode} data-testid="asset-3d-mode">
            <option value="import">Importar modelo 3D existente</option>
            <option value="generate">Modelar desde brief</option>
          </select>
        </label>
      </div>

      {#if model3dMode === 'import'}
        <div class="form-row">
          <label>
            source_model_path:
            <input
              type="text"
              bind:value={model3dSourceModelPath}
              placeholder="/ruta/a/modelo.glb"
              data-testid="asset-3d-source-model-path"
            />
          </label>
        </div>
      {:else}
        <div class="form-row">
          <label>
            Brief simplificado:
            <textarea
              bind:value={model3dBrief}
              rows="4"
              placeholder="Describe el candidato 3D que quieres modelar"
              data-testid="asset-3d-brief"
            ></textarea>
          </label>
        </div>
        <div class="form-row">
          <label>
            Preset de producto:
            <select bind:value={model3dPresetId} data-testid="asset-3d-preset-id">
              {#each MODEL_3D_PRESET_OPTIONS as presetId}
                <option value={presetId}>{presetId}</option>
              {/each}
            </select>
          </label>
        </div>
      {/if}

      <div class="form-row">
        <label>
          Rutas de referencia opcionales (una por línea):
          <textarea
            bind:value={model3dSourceReferencePathsText}
            rows="3"
            placeholder="/ruta/a/referencia.png"
            data-testid="asset-3d-source-reference-paths"
          ></textarea>
        </label>
      </div>

      <div class="form-row">
        <label>
          Notas operativas:
          <input
            type="text"
            bind:value={model3dNotes}
            placeholder="Opcional: contexto extra para la corrida 3D"
          />
        </label>
      </div>

      {#if selectedModel3dNotes()}
        <p class="muted target-notes">
          {selectedModel3dNotes()}
        </p>
      {/if}

      <div class="row-actions">
        <button
          on:click={handleModel3dSubmit}
          disabled={model3dSubmitting || !model3dAssetId}
          data-testid="asset-3d-submit"
        >
          {model3dSubmitting ? 'Procesando...' : 'Ejecutar 3D'}
        </button>
        <button on:click={refreshModel3dStatus} disabled={!model3dRun?.run_id} data-testid="asset-3d-refresh">
          Refrescar estado
        </button>
        <button
          on:click={cancelModel3dRun}
          disabled={!canCancel(model3dRun)}
          data-testid="asset-3d-cancel"
        >
          Cancelar
        </button>
      </div>

      {#if model3dError}
        <p class="error-inline">{model3dError}</p>
      {/if}
    </div>

    {#if model3dRun}
      <div class="reference-run-results">
        <div class="inline-meta">
          <span class="badge tone-{runStatusTone(model3dRun.status)}" data-testid="asset-3d-run-status">
            {model3dRun.status}
          </span>
          <span class="code-chip">{model3dRun.run_id}</span>
          <span class="code-chip">{model3dRun.target_id}</span>
        </div>

        <p data-testid="asset-3d-run-message">{model3dRun.message}</p>

        <p>
          <strong>Evidencia:</strong>
          <code data-testid="asset-3d-evidence-path">{model3dRun.evidence_path || 'sin evidencia aún'}</code>
        </p>

        <p>
          <strong>Resumen:</strong>
          <code data-testid="asset-3d-summary-path">{model3dRun.summary_path || 'sin resumen aún'}</code>
        </p>

        <div data-testid="asset-3d-artifacts">
          <strong>Artefactos:</strong>
          {#if model3dRun.artifact_refs.length === 0}
            <p class="muted">Sin artefactos publicados.</p>
          {:else}
            <ul class="list artifact-list">
              {#each model3dRun.artifact_refs as artifact}
                <li>
                  <code>{artifact}</code>
                  {#if isModelPath(artifact)}
                    <span class="muted"> · preview 3d candidate</span>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </div>

        <div data-testid="asset-3d-checkpoints">
          <strong>Checkpoints:</strong>
          {#if model3dRun.progress_events.length === 0}
            <p class="muted">Sin checkpoints reportados por el runner.</p>
          {:else}
            <ul class="list progress-list">
              {#each model3dRun.progress_events as event}
                <li>
                  <code>{event.step_id}</code> · {event.state} · {event.message}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
    {/if}
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
  .form-row select,
  .form-row textarea {
    padding: 0.5rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 0.9rem;
    font-family: inherit;
  }

  .form-row button {
    padding: 0.5rem 1rem;
    background: var(--primary-color, #007bff);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .form-row button:disabled,
  .row-actions button:disabled {
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

  .error-inline {
    margin: 0;
    color: #721c24;
    font-weight: 600;
  }

  .target-notes {
    margin: 0;
  }

  .reference-run-results {
    margin-top: 1rem;
    border-top: 1px solid var(--border-color, #e0e0e0);
    padding-top: 1rem;
    display: grid;
    gap: 0.75rem;
  }

  .inline-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .code-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 999px;
    font-size: 0.8rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  }

  .artifact-list,
  .progress-list {
    margin-top: 0.35rem;
  }
</style>
