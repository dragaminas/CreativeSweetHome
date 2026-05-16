import { describe, expect, it } from 'vitest';

import {
  DEFAULT_IN_MEMORY_PROJECT_ID,
  DEFAULT_IN_MEMORY_SCENE_ID,
  createInMemoryProjectUiServices
} from './mocks/in-memory-project-ui-services';

describe('project-ui-services seam', () => {
  it('exposes deterministic seeded query contracts for project, scene, shot, and asset', async () => {
    const services = createInMemoryProjectUiServices();

    const panel = await services.navigationQueries.getNavigationPanel(DEFAULT_IN_MEMORY_PROJECT_ID);
    const projectEdition = await services.editionQueries.getProjectEdition(DEFAULT_IN_MEMORY_PROJECT_ID);
    const sceneEdition = await services.editionQueries.getSceneEdition(DEFAULT_IN_MEMORY_SCENE_ID);

    expect(panel.projectNavigation.length).toBe(1);
    expect(panel.projectNavigation[0]?.elementName).toBe('Pilot Project');
    const projectNavigation = panel.projectNavigation[0];
    expect(projectNavigation?.scenesNavigation[0]?.elementName).toBe('Opening Alley');
    expect(projectNavigation?.scenesNavigation[0]?.shotsNavigation[0]?.elementName).toBe('Shot 010');
    expect(projectNavigation?.assetsNavigation.charactersNavigation[0]).toMatchObject({
      elementName: 'Nora',
      assetKind: 'character'
    });
    expect(projectNavigation?.assetsNavigation.objectsNavigation).toEqual([]);
    expect(projectNavigation?.assetsNavigation.locationsNavigation[0]).toMatchObject({
      elementName: 'Rainy Alley',
      assetKind: 'location'
    });
    expect(sceneEdition.events.rename.target).toBe('SceneApplicationService.renameScene');
    expect(projectEdition.name).toBe('Pilot Project');
    expect(sceneEdition.view.shotIds).toEqual(['sh010']);
  });

  it('routes command seams to deterministic in-memory mutations', async () => {
    const services = createInMemoryProjectUiServices();

    await services.sceneCommands.addShotToScene({
      sceneId: DEFAULT_IN_MEMORY_SCENE_ID,
      shotId: 'sh020'
    });

    await services.assetCommands.renameAsset({
      assetId: 'asset-nora',
      name: 'Nora Prime'
    });

    const sceneEdition = await services.editionQueries.getSceneEdition(DEFAULT_IN_MEMORY_SCENE_ID);
    const assetEdition = await services.editionQueries.getAssetEdition('asset-nora');

    expect(sceneEdition.view.shotIds).toEqual(['sh010', 'sh020']);
    expect(assetEdition.literalDescription.assetName).toBe('Nora Prime');
  });

  it('dispatches edition event pointers through the underlying application services', async () => {
    const services = createInMemoryProjectUiServices();
    const sceneEdition = await services.editionQueries.getSceneEdition(DEFAULT_IN_MEMORY_SCENE_ID);

    await sceneEdition.events.rename.dispatch({
      entityId: DEFAULT_IN_MEMORY_SCENE_ID,
      name: 'Opening Alley Updated'
    });

    const reloadedScene = await services.editionQueries.getSceneEdition(DEFAULT_IN_MEMORY_SCENE_ID);
    expect(reloadedScene.view.name).toBe('Opening Alley Updated');
  });
});
