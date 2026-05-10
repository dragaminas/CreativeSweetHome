<script lang="ts">
  import type { DirectoryStatus } from '$lib/types/product';
  import StatusBadge from './StatusBadge.svelte';

  export let directories: DirectoryStatus[] = [];
</script>

<div class="path-list">
  {#each directories as directory (directory.id)}
    <div class="path-row">
      <div class="path-label">
        <strong>{directory.label}</strong>
        <span>{directory.note}</span>
      </div>
      <div class="inline-meta">
        <span class="code-chip">{directory.path}</span>
        <StatusBadge
          label={directory.exists ? 'present' : 'missing'}
          tone={directory.exists ? 'positive' : 'warning'}
        />
      </div>
    </div>
  {/each}
</div>
