<script lang="ts">
  import { page } from '$app/stores';
  import AssetEditor from '$lib/components/AssetEditor.svelte';
  import ProjectEditor from '$lib/components/ProjectEditor.svelte';
  import ProjectsEditor from '$lib/components/ProjectsEditor.svelte';
  import SceneEditor from '$lib/components/SceneEditor.svelte';
  import ShotEditor from '$lib/components/ShotEditor.svelte';
  import { buildProjectEditorRouteData } from '$lib/navigation/project-editor-route-data';
  import type { PageData } from './$types';

  export let data: PageData;

  $: routeData = buildProjectEditorRouteData(data.projectSnapshots, $page.url);
  $: projects = routeData.projects;
</script>

{#if routeData.selectedEditor === 'asset' && routeData.selectedAsset}
  <AssetEditor asset={routeData.selectedAsset} />
{:else if routeData.selectedEditor === 'project' && routeData.selectedProject}
  <ProjectEditor project={routeData.selectedProject} />
{:else if routeData.selectedEditor === 'scene' && routeData.selectedScene}
  <SceneEditor scene={routeData.selectedScene} />
{:else if routeData.selectedEditor === 'shot' && routeData.selectedShot}
  <ShotEditor shot={routeData.selectedShot} />
{:else}
  <ProjectsEditor {projects} />
{/if}
