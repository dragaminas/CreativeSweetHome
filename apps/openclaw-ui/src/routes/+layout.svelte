<script lang="ts">
  import '../app.css';
  import type { LayoutData } from './$types';

  export let data: LayoutData;

  $: projectNavigation = data.projectNavigation.projectNavigation;

  function searchParam(url: string, key: string): string {
    return new URL(url, 'http://localhost').searchParams.get(key) ?? '';
  }

  function projectId(url: string, name: string): string {
    return searchParam(url, 'projectId') || name.toLowerCase().replaceAll(' ', '-');
  }
</script>

<div class="app-shell">
  <aside class="sidebar" data-testid="project-navigation">
    <a href="/?editor=projects">
      <div class="eyebrow">OpenClaw</div>
      <h2>Project Navigation</h2>
    </a>

    <nav class="sidebar-nav" aria-label="Project navigation">
      <a class="nav-link" data-testid="nav-projects" href="/?editor=projects">
        <span class="nav-label">Projects</span>
      </a>

      <ul class="nav-tree" aria-label="Projects tree">
        {#each projectNavigation as project (project.elementUrl)}
          <li class="nav-tree-item">
            <a
              class="nav-link nav-link-compact"
              data-testid={`nav-project-${projectId(project.elementUrl, project.elementName)}`}
              href={project.elementUrl}
            >
              <span class="nav-label">{project.elementName}</span>
            </a>

            <section
              class="nav-branch"
              data-testid={`nav-scenes-${projectId(project.elementUrl, project.elementName)}`}
            >
              <div class="nav-section-label">Scenes</div>
              <ul class="nav-tree">
                {#each project.scenesNavigation as scene (scene.elementUrl)}
                  <li>
                    <a
                      class="nav-link nav-link-compact"
                      data-testid={`nav-scene-${searchParam(scene.elementUrl, 'sceneId')}`}
                      href={scene.elementUrl}
                    >
                      <span class="nav-label">{scene.elementName}</span>
                    </a>
                    <section class="nav-branch">
                      <div class="nav-section-label">Shots</div>
                      <ul class="nav-tree">
                        {#each scene.shotsNavigation as shot (shot.elementUrl)}
                          <li>
                            <a
                              class="nav-link nav-link-compact"
                              data-testid={`nav-shot-${searchParam(shot.elementUrl, 'shotId')}`}
                              href={shot.elementUrl}
                            >
                              <span class="nav-label">{shot.elementName}</span>
                            </a>
                          </li>
                        {/each}
                      </ul>
                    </section>
                  </li>
                {/each}
              </ul>
            </section>

            <section
              class="nav-branch"
              data-testid={`nav-assets-${projectId(project.elementUrl, project.elementName)}`}
            >
              <div class="nav-section-label">Assets</div>
              <section
                class="nav-branch"
                data-testid={`nav-asset-category-characters-${projectId(project.elementUrl, project.elementName)}`}
              >
                <div class="nav-section-label">Characters</div>
                {#each project.assetsNavigation.charactersNavigation as asset (asset.elementUrl)}
                  <a
                    class="nav-link nav-link-compact"
                    data-testid={`nav-asset-${searchParam(asset.elementUrl, 'assetId')}`}
                    href={asset.elementUrl}
                  >
                    <span class="nav-label">{asset.elementName}</span>
                  </a>
                {/each}
              </section>
              <section
                class="nav-branch"
                data-testid={`nav-asset-category-objects-${projectId(project.elementUrl, project.elementName)}`}
              >
                <div class="nav-section-label">Objects</div>
                {#each project.assetsNavigation.objectsNavigation as asset (asset.elementUrl)}
                  <a
                    class="nav-link nav-link-compact"
                    data-testid={`nav-asset-${searchParam(asset.elementUrl, 'assetId')}`}
                    href={asset.elementUrl}
                  >
                    <span class="nav-label">{asset.elementName}</span>
                  </a>
                {/each}
              </section>
              <section
                class="nav-branch"
                data-testid={`nav-asset-category-locations-${projectId(project.elementUrl, project.elementName)}`}
              >
                <div class="nav-section-label">Locations</div>
                {#each project.assetsNavigation.locationsNavigation as asset (asset.elementUrl)}
                  <a
                    class="nav-link nav-link-compact"
                    data-testid={`nav-asset-${searchParam(asset.elementUrl, 'assetId')}`}
                    href={asset.elementUrl}
                  >
                    <span class="nav-label">{asset.elementName}</span>
                  </a>
                {/each}
              </section>
            </section>
          </li>
        {/each}
      </ul>
    </nav>
  </aside>

  <main class="shell-main" data-testid="editor-panel">
    <slot />
  </main>
</div>
