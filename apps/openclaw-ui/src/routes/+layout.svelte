<script lang="ts">
  import { page } from '$app/stores';
  import '../app.css';
  import ProductSidebar from '$lib/components/ProductSidebar.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';

  export let data;
</script>

<svelte:head>
  <title>{data.shell.title}</title>
  <meta
    name="description"
    content="OpenClaw Studio web shell for canonical runners, prompts, and embedded workspaces."
  />
</svelte:head>

<div class="app-shell">
  <ProductSidebar
    workspaces={data.shell.workspaces}
    activePath={$page.url.pathname}
    bridge={data.runnerCatalog.bridge}
  />

  <div class="shell-main">
    <header class="topbar">
      <div>
        <div class="eyebrow">Canonical shell</div>
        <h1>{data.shell.title}</h1>
        <p class="muted">{data.shell.subtitle}</p>
      </div>

      <div class="panel-stack">
        <StatusBadge
          label={data.runnerCatalog.bridge.label}
          tone={data.runnerCatalog.bridge.tone}
        />
        <span class="code-chip" data-testid="runner-contract-path">
          {data.studio.runnerContractPath}
        </span>
      </div>
    </header>

    <slot />
  </div>
</div>
