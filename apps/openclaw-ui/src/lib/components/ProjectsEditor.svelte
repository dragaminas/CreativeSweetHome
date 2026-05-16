<script lang="ts">
  import type { Projects } from '$lib/types/navigation/projectNavigation/navigation';

  export let projects: Projects;
</script>

<section class="projects-editor" data-testid="projects-editor" aria-labelledby="projects-editor-title">
  <header class="projects-editor-header">
    <div>
      <p class="eyebrow">Projects</p>
      <h2 id="projects-editor-title">Projects Editor</h2>
    </div>

    <button type="button" on:click={projects.addProject}>Add Project</button>
  </header>

  {#if projects.projectsList.length}
    <ul class="projects-editor-list" aria-label="Projects list">
      {#each projects.projectsList as projectName}
        <li>
          <a href={projects.editorUrl}>{projectName}</a>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">No projects yet.</p>
  {/if}
</section>
