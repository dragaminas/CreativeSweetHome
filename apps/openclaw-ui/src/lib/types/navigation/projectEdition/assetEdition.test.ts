import { describe, expect, it } from 'vitest';

import * as assetEditionRuntime from './assetEdition';
import type { AssetDescription, AssetLiteralDescription } from './assetEdition';
import type { AssetKind } from '../../project';

function acceptAssetKind(kind: AssetKind): AssetKind {
  return kind;
}

describe('asset edition typing', () => {
  it('uses canonical project asset kinds including location', () => {
    const kinds: AssetKind[] = [
      acceptAssetKind('character'),
      acceptAssetKind('object'),
      acceptAssetKind('location')
    ];

    expect(kinds).toEqual(['character', 'object', 'location']);
  });

  it('does not export a navigation-specific AssetType runtime enum', () => {
    expect('AssetType' in assetEditionRuntime).toBe(false);
  });

  it('uses AssetKind in asset editor description contracts', () => {
    const description: AssetDescription = {
      description: 'A reusable alley set.',
      assetType: 'location'
    };

    const literal: AssetLiteralDescription = {
      assetName: 'Rainy Alley',
      assetType: 'location',
      assetSystemPath: 'openclaw-projects/pilot-project/assets/locations/loc-alley',
      assetDescription: description
    };

    expect(literal.assetDescription.assetType).toBe('location');
  });
});
