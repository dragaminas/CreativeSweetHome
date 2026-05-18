import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import AssetEditor from './AssetEditor.svelte';
import SceneEditor from './SceneEditor.svelte';
import ShotEditor from './ShotEditor.svelte';
import type { AssetEditor as AssetEditorModel } from '$lib/types/navigation/projectEdition/assetEdition';
import type { SceneEdition } from '$lib/types/navigation/projectEdition/sceneEdition';
import type { ShotEdition } from '$lib/types/navigation/projectEdition/shotEdition';

describe('entity editors', () => {
  it('renders a specific asset from the AssetEditor contract', () => {
    const asset: AssetEditorModel = {
      editorUrl: '/?editor=asset&assetId=asset-nora',
      literalDescription: {
        assetName: 'Nora',
        assetType: 'character',
        assetSystemPath: 'Assets3D/pilot-project/asset-nora',
        assetDescription: {
          description: 'Main character of the opening chase.',
          assetType: 'character'
        }
      },
      literalDescriptionEditor: {
        editAssetName: () => undefined,
        editAssetType: () => undefined,
        editAssetDescription: (description) => ({
          description,
          assetType: 'character'
        })
      },
      assetVisualization: {
        assetImagePreview: {
          showAssetPreview: () => undefined
        },
        asset3DMetrics: {
          polygonCount: 2048,
          textureResolution: '1024x1024',
          riggingComplexity: 'low',
          otherMetrics: 'mock-projection'
        }
      },
      assetEdition: {
        generateImage: () => new File([], 'nora.png'),
        uploadImage: () => undefined,
        generateModel: () => new File([], 'nora.glb'),
        uploadModel: () => undefined,
        openInBlender: () => undefined
      }
    };

    const { body } = render(AssetEditor, { props: { asset } });

    expect(body).toContain('Nora');
    expect(body).toContain('character');
    expect(body).toContain('Assets3D/pilot-project/asset-nora');
    expect(body).toContain('2048');
    expect(body).toContain('Controles de asset 3D');
    expect(body).toContain('Generar referencia');
    expect(body).toContain('Generar modelo 3D');
    expect(body).toContain('Abrir en Blender');
  });

  it('renders a specific scene from the SceneEdition contract', () => {
    const scene: SceneEdition = {
      view: {
        id: 'sc001',
        projectId: 'pilot-project',
        editorUrl: '/?editor=scene&sceneId=sc001',
        name: 'Opening Alley',
        description: 'Initial scene scaffolded from the phase16 brief.',
        scriptId: 'script-main',
        shotIds: ['sh010'],
        locationIds: ['loc-alley'],
        assetIds: ['asset-nora'],
        pipeline: [
          {
            stage: 'scene_brief',
            status: 'ready',
            label: 'Scene Brief',
            blockers: []
          }
        ],
        sceneProgress: 50
      },
      visualization: {},
      events: {} as SceneEdition['events']
    };

    const { body } = render(SceneEditor, { props: { scene } });

    expect(body).toContain('Opening Alley');
    expect(body).toContain('script-main');
    expect(body).toContain('sh010');
    expect(body).toContain('50%');
  });

  it('renders a specific shot from the ShotEdition contract', () => {
    const shot: ShotEdition = {
      view: {
        id: 'sh010',
        projectId: 'pilot-project',
        editorUrl: '/?editor=shot&shotId=sh010',
        name: 'Shot 010',
        description: 'Nora enters the rainy alley.',
        sceneId: 'sc001',
        scriptBeatId: 'beat-001',
        locationId: 'loc-alley',
        order: 1,
        durationMs: 4800,
        frameRate: 24,
        framing: {
          shotSize: 'ms',
          cameraAngle: 'eye',
          cameraMove: 'dolly',
          lensMm: 35
        },
        bindings: [
          {
            role: 'primary',
            asset: {
              id: 'asset-nora',
              label: 'Nora',
              kind: 'character'
            },
            requiredStage: 'model_3d',
            readiness: 'pending',
            actions: []
          }
        ],
        pipeline: [
          {
            stage: 'shot_generation',
            status: 'pending',
            label: 'Shot Generation',
            blockers: []
          }
        ]
      },
      visualization: {},
      events: {} as ShotEdition['events']
    };

    const { body } = render(ShotEditor, { props: { shot } });

    expect(body).toContain('Shot 010');
    expect(body).toContain('4800 ms');
    expect(body).toContain('Nora');
    expect(body).toContain('Shot Generation');
  });
});
