<script lang="ts">
  import type { BadgeTone } from '$lib/types/product';

  export let label: string;
  export let tone: BadgeTone = 'muted';
</script>

<span class={`badge badge-${tone}`}>{label}</span>
