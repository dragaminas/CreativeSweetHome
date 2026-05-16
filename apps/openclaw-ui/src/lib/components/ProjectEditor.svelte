<script lang="ts">
  import type { ProjectEdition } from '$lib/types/navigation/projectEdition/editor';

  export let project: ProjectEdition;
</script>

<section class="projects-editor" data-testid="project-editor" aria-labelledby="project-editor-title">
  <header class="projects-editor-header">
    <div>
      <p class="eyebrow">Project</p>
      <h2 id="project-editor-title">{project.name}</h2>
    </div>

    <div class="inline-meta">
      <button type="button" on:click={project.addScene}>Add Scene</button>
      <button type="button" on:click={project.addAsset}>Add Asset</button>
    </div>
  </header>

  <p class="muted">{project.projectDescription}</p>
</section>
