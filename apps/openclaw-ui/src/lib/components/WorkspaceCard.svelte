<script lang="ts">
  import { resolve } from '$app/paths';
  import type { WorkspaceDefinition } from '$lib/types/product';
  import StatusBadge from './StatusBadge.svelte';

  export let workspace: WorkspaceDefinition;
</script>

<a class="card workspace-link fade-in" href={resolve(workspace.path)}>
  <div class="workspace-meta">
    <StatusBadge label={workspace.stateLabel} tone={workspace.stateTone} />
    <span class="code-chip">phase {workspace.phase}</span>
    <span class="code-chip">{workspace.routeRole}</span>
  </div>

  <div>
    <h3>{workspace.label}</h3>
    <p class="lede">{workspace.summary}</p>
  </div>

  <p class="workspace-boundary">{workspace.boundary}</p>

  {#if workspace.runnerIds.length}
    <div class="inline-meta">
      {#each workspace.runnerIds as runnerId (runnerId)}
        <span class="code-chip">{runnerId}</span>
      {/each}
    </div>
  {/if}
</a>
