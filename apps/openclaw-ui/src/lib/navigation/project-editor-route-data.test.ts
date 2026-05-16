import { describe, expect, it } from 'vitest';

import type { DomainSnapshot } from '../types/project';
import {
  buildNavigationPanelFromSnapshots,
  buildProjectEditorRouteData
} from './project-editor-route-data';

function makeSnapshot(): DomainSnapshot {
  const now = '2026-05-16T09:00:00.000Z';

  return {
    project: {
      id: 'pilot-project',
      name: 'Pilot Project',
      description: 'Filesystem-backed pilot project.',
      createdAt: now,
      updatedAt: now,
      scriptIds: ['script-main'],
      sceneIds: ['sc001'],
      assetIds: ['asset-nora', 'loc-alley'],
      locationIds: ['loc-alley'],
      pipeline: []
    },
    scripts: [],
    scenes: [
      {
        id: 'sc001',
        name: 'Opening Alley',
        description: 'Initial scene.',
        createdAt: now,
        updatedAt: now,
        projectId: 'pilot-project',
        scriptId: 'script-main',
        shotIds: ['sh010'],
        locationIds: ['loc-alley'],
        assetIds: ['asset-nora', 'loc-alley'],
        artifacts: [],
        operations: [],
        pipeline: []
      }
    ],
    shots: [
      {
        id: 'sh010',
        name: 'Shot 010',
        description: 'Nora enters.',
        createdAt: now,
        updatedAt: now,
        projectId: 'pilot-project',
        sceneId: 'sc001',
        locationId: 'loc-alley',
        order: 1,
        durationMs: 4800,
        frameRate: 24,
        framing: { shotSize: 'ms' },
        assetBindings: [],
        artifacts: [],
        operations: [],
        pipeline: []
      }
    ],
    assets: [
      {
        id: 'asset-nora',
        name: 'Nora',
        description: 'Lead character.',
        createdAt: now,
        updatedAt: now,
        projectId: 'pilot-project',
        sceneId: 'sc001',
        kind: 'character',
        tags: [],
        artifacts: [],
        operations: [],
        pipeline: []
      },
      {
        id: 'loc-alley',
        name: 'Rainy Alley',
        description: 'Location asset.',
        createdAt: now,
        updatedAt: now,
        projectId: 'pilot-project',
        sceneId: 'sc001',
        kind: 'location',
        tags: [],
        artifacts: [],
        operations: [],
        pipeline: []
      }
    ],
    locations: []
  };
}

describe('project editor route data', () => {
  it('builds a multi-project navigation panel from snapshots', () => {
    const panel = buildNavigationPanelFromSnapshots([makeSnapshot()]);

    expect(panel.projectNavigation[0]?.elementName).toBe('Pilot Project');
    expect(panel.projectNavigation[0]?.scenesNavigation[0]?.shotsNavigation[0]?.elementName).toBe(
      'Shot 010'
    );
    expect(panel.projectNavigation[0]?.assetsNavigation.charactersNavigation[0]?.elementName).toBe(
      'Nora'
    );
    expect(panel.projectNavigation[0]?.assetsNavigation.locationsNavigation[0]?.elementName).toBe(
      'Rainy Alley'
    );
  });

  it('selects a shot editor from URL params', () => {
    const data = buildProjectEditorRouteData(
      [makeSnapshot()],
      new URL(
        'http://localhost/?editor=shot&projectId=pilot-project&sceneId=sc001&shotId=sh010'
      )
    );

    expect(data.selectedEditor).toBe('shot');
    expect(data.selectedShot?.view.id).toBe('sh010');
    expect(data.projects.projectsList).toEqual(['Pilot Project']);
  });

  it('selects a project editor from URL params', () => {
    const data = buildProjectEditorRouteData(
      [makeSnapshot()],
      new URL('http://localhost/?editor=project&projectId=pilot-project')
    );

    expect(data.selectedEditor).toBe('project');
    expect(data.selectedProject?.name).toBe('Pilot Project');
  });

  it('falls back to projects editor when an entity is missing', () => {
    const data = buildProjectEditorRouteData(
      [makeSnapshot()],
      new URL('http://localhost/?editor=shot&shotId=missing-shot')
    );

    expect(data.selectedEditor).toBe('projects');
    expect(data.selectedShot).toBeUndefined();
  });
});
