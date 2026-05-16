import type { DomainSnapshot } from '../types/project';
import type { AssetEditor } from '../types/navigation/projectEdition/assetEdition';
import type { ProjectEdition, Projects } from '../types/navigation/projectEdition/editor';
import type { SceneEdition } from '../types/navigation/projectEdition/sceneEdition';
import type { ShotEdition } from '../types/navigation/projectEdition/shotEdition';
import type { NavigationPanel } from '../types/navigation/projectNavigation/navigation';
import {
  buildAssetEditionFromSnapshot,
  buildNavigationPanelFromSnapshot,
  buildProjectEditionFromSnapshot,
  buildSceneEditionFromSnapshot,
  buildShotEditionFromSnapshot
} from './adapters/project-edition-adapters';
import { createInMemoryProjectUiServices } from './mocks/in-memory-project-ui-services';

export type SelectedProjectEditor = 'projects' | 'project' | 'scene' | 'shot' | 'asset';

export interface ProjectEditorRouteData {
  projects: Projects;
  selectedEditor: SelectedProjectEditor;
  selectedProject?: ProjectEdition;
  selectedScene?: SceneEdition;
  selectedShot?: ShotEdition;
  selectedAsset?: AssetEditor;
}

function noOpAddProject(): void {
  // TODO: wire this to a filesystem command service in a later phase.
}

function findSnapshotForEntity(
  snapshots: DomainSnapshot[],
  params: URLSearchParams
): DomainSnapshot | undefined {
  const projectId = params.get('projectId');
  const sceneId = params.get('sceneId');
  const shotId = params.get('shotId');
  const assetId = params.get('assetId');

  return (
    snapshots.find((snapshot) => {
      if (projectId && snapshot.project.id !== projectId) {
        return false;
      }

      if (sceneId && snapshot.scenes.some((scene) => scene.id === sceneId)) {
        return true;
      }

      if (shotId && snapshot.shots.some((shot) => shot.id === shotId)) {
        return true;
      }

      if (assetId && snapshot.assets.some((asset) => asset.id === assetId)) {
        return true;
      }

      if (projectId) {
        return snapshot.project.id === projectId;
      }

      return true;
    }) ?? snapshots[0]
  );
}

export function buildNavigationPanelFromSnapshots(snapshots: DomainSnapshot[]): NavigationPanel {
  return {
    projectNavigation: snapshots.flatMap(
      (snapshot) => buildNavigationPanelFromSnapshot(snapshot, snapshot.project.id).projectNavigation
    )
  };
}

export function buildProjectEditorRouteData(
  snapshots: DomainSnapshot[],
  url: URL
): ProjectEditorRouteData {
  const params = url.searchParams;
  const rawEditor = params.get('editor') ?? 'projects';
  const selectedEditor: SelectedProjectEditor =
    rawEditor === 'project' ||
    rawEditor === 'scene' ||
    rawEditor === 'shot' ||
    rawEditor === 'asset'
      ? rawEditor
      : 'projects';
  const snapshot = findSnapshotForEntity(snapshots, params);

  const projects: Projects = {
    editorUrl: '/?editor=projects',
    projectsList: snapshots.map((entry) => entry.project.name),
    addProject: noOpAddProject
  };

  if (!snapshot || selectedEditor === 'projects') {
    return { projects, selectedEditor: 'projects' };
  }

  const services = createInMemoryProjectUiServices({ seedSnapshot: snapshot });

  if (selectedEditor === 'project') {
    return {
      projects,
      selectedEditor: 'project',
      selectedProject: buildProjectEditionFromSnapshot(snapshot, snapshot.project.id, services)
    };
  }

  if (selectedEditor === 'scene') {
    const sceneId = params.get('sceneId');
    if (sceneId && snapshot.scenes.some((scene) => scene.id === sceneId)) {
      return {
        projects,
        selectedEditor: 'scene',
        selectedScene: buildSceneEditionFromSnapshot(snapshot, sceneId, services)
      };
    }
  }

  if (selectedEditor === 'shot') {
    const shotId = params.get('shotId');
    if (shotId && snapshot.shots.some((shot) => shot.id === shotId)) {
      return {
        projects,
        selectedEditor: 'shot',
        selectedShot: buildShotEditionFromSnapshot(snapshot, shotId, services)
      };
    }
  }

  if (selectedEditor === 'asset') {
    const assetId = params.get('assetId');
    if (assetId && snapshot.assets.some((asset) => asset.id === assetId)) {
      return {
        projects,
        selectedEditor: 'asset',
        selectedAsset: buildAssetEditionFromSnapshot(snapshot, assetId, services)
      };
    }
  }

  return { projects, selectedEditor: 'projects' };
}
