<script lang="ts">
  import EmbeddedWorkspaceFrame from '$lib/components/EmbeddedWorkspaceFrame.svelte';

  export let data;
</script>

<div class="page">
  <section class="panel page-header fade-in">
    <div class="eyebrow">Embedded workspace</div>
    <h2>Kimodo</h2>
    <p class="lede">
      Phase 15 deja la seam same-origin donde la UI nativa de Kimodo quedara embebida con
      contexto de escena, shot, personaje y rutas de salida. La pagina ya vive dentro del
      shell y no se siente como un sitio aparte.
    </p>
  </section>

  <section class="grid two">
    <article class="panel fade-in">
      <h3>Context contract</h3>
      <div class="inline-meta">
        <span class="code-chip">{data.embed.outputRoot}</span>
      </div>
      <ul class="list">
        {#each data.embed.contextKeys as contextKey (contextKey)}
          <li>{contextKey}</li>
        {/each}
      </ul>
    </article>

    <article class="panel fade-in">
      <h3>Embed notes</h3>
      <ul class="list">
        {#each data.embed.notes as note (note)}
          <li>{note}</li>
        {/each}
      </ul>
      <p class="muted">
        Upstream actual: {data.embed.upstreamUrl || 'todavia no configurado en phase 15'}.
      </p>
    </article>
  </section>

  <EmbeddedWorkspaceFrame
    src={data.embed.sameOriginPath}
    title="Kimodo embedded workspace seam"
    caption="La ruta embebida ya existe bajo el mismo dominio del producto. Phase 24 podra reemplazar este placeholder por un proxy real sin mover el shell."
    stateLabel={data.embed.stateLabel}
    stateTone={data.embed.stateTone}
  />
</div>
