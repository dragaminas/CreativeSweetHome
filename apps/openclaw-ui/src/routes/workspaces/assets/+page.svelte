<script lang="ts">
  import PathList from '$lib/components/PathList.svelte';
  import type { DirectoryStatus } from '$lib/types/product';

  export let data;

  function selectAssetDirectories(directories: DirectoryStatus[]): DirectoryStatus[] {
    return directories.filter((directory) =>
      ['assets3d', 'exports', 'blender-projects'].includes(directory.id)
    );
  }
</script>

<div class="page">
  <section class="panel page-header fade-in">
    <div class="eyebrow">Asset pipeline</div>
    <h2>Filesystem-first asset lanes</h2>
    <p class="lede">
      Este workspace fija el boundary para phases 18-20: catalogo, referencias y salidas
      3D sobre rutas controladas por el repo, no sobre storage de navegador ni una base de
      datos nueva.
    </p>
  </section>

  <section class="grid two">
    <article class="panel fade-in">
      <h3>Canonical roots</h3>
      <PathList directories={selectAssetDirectories(data.studio.directories)} />
    </article>

    <article class="panel fade-in">
      <h3>Rules already enforced by the shell</h3>
      <ul class="list">
        <li>La UI no inventa otro layout fuera de <code>STUDIO_DIR</code>.</li>
        <li>Los briefs compartidos conectan scene authoring, assets y backends reales.</li>
        <li>Los futuros manifests deben seguir siendo revisables y repo-owned.</li>
      </ul>
    </article>
  </section>
</div>
