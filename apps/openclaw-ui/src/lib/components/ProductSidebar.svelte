<script lang="ts">
  import { resolve } from '$app/paths';
  import type { RunnerBridgeStatus, WorkspaceDefinition } from '$lib/types/product';
  import StatusBadge from './StatusBadge.svelte';

  export let workspaces: WorkspaceDefinition[] = [];
  export let activePath = '/';
  export let bridge: RunnerBridgeStatus;

  function isActive(targetPath: string): boolean {
    return targetPath === '/' ? activePath === '/' : activePath.startsWith(targetPath);
  }
</script>

<aside class="sidebar">
  <div class="panel-stack">
    <a href={resolve('/')}>
      <div class="eyebrow">OpenClaw</div>
      <h2>Studio Shell</h2>
      <p class="muted">
        Navegacion unica para briefs, engines y workspaces embebidos.
      </p>
    </a>
    <StatusBadge label={bridge.label} tone={bridge.tone} />
  </div>

  <nav class="sidebar-nav" aria-label="Product workspaces">
    <a class:active={isActive('/')} class="nav-link" href={resolve('/')}>
      <span class="nav-label">Overview</span>
      <span class="nav-caption">Shell, rutas y bridge canonico</span>
    </a>

    {#each workspaces as workspace (workspace.id)}
      <a
        class:active={isActive(workspace.path)}
        class="nav-link"
        href={resolve(workspace.path)}
      >
        <span class="nav-label">{workspace.label}</span>
        <span class="nav-caption">Phase {workspace.phase}</span>
      </a>
    {/each}
  </nav>

  <div class="card">
    <div class="eyebrow">Bridge command</div>
    <p class="muted">{bridge.command.join(' ')}</p>
  </div>
</aside>
