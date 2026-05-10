<script lang="ts">
  import type { BadgeTone } from '$lib/types/product';
  import StatusBadge from './StatusBadge.svelte';

  export let src: string;
  export let title: string;
  export let caption: string;
  export let stateLabel: string;
  export let stateTone: BadgeTone = 'info';
</script>

<div class="panel frame-shell">
  <div class="section-heading">
    <h3>{title}</h3>
    <StatusBadge label={stateLabel} tone={stateTone} />
  </div>
  <iframe {src} {title}></iframe>
  <p class="frame-caption">{caption}</p>
</div>
