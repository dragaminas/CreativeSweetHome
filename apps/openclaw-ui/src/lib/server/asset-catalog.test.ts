import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  createAsset,
  listAssets,
  updateAsset,
  deleteAsset,
  getAssetReadiness,
  type AssetEntry,
  type AssetKind
} from './asset-catalog';

vi.mock('node:fs/promises', () => ({
  default: {
    access: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn()
  }
}));

vi.mock('./env', () => ({
  resolveRepoContext: () => ({
    repoRoot: '/fake/repo',
    pythonPath: '/fake/python',
    studioDir: '/tmp/studio-test',
    assets3dDir: '/tmp/studio-test/Assets3D',
    exportsDir: '/tmp/studio-test/Exports',
    blenderProjectsDir: '/tmp/studio-test/BlenderProjects',
    comfyWorkspaceDir: '/tmp/studio-test/ComfyUI',
    openclawProjectsDir: '/tmp/openclaw-projects',
    openclawStateDir: '/tmp/.openclaw',
    kimodoDir: '/tmp/Kimodo',
    appRoot: '/fake/repo'
  })
}));

function mockPathExists(exists: boolean) {
  vi.mocked(fs.access).mockImplementation(async () => {
    if (!exists) throw new Error('ENOENT');
  });
}

function mockPathExistsFalse() {
  mockPathExists(false);
}

function mockPathExistsTrue() {
  mockPathExists(true);
}

function mockReadFile(content: string | null) {
  vi.mocked(fs.readFile).mockImplementation(async (_pathArg: unknown) => {
    if (content === null) throw new Error('ENOENT');
    return content;
  });
}

function mockWriteFile() {
  vi.mocked(fs.writeFile).mockResolvedValue(undefined);
  vi.mocked(fs.mkdir).mockResolvedValue(undefined);
}

describe('asset-catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile();
  });

  describe('createAsset', () => {
    it('creates a character asset when catalog does not exist', async () => {
      mockPathExistsFalse();
      mockReadFile(null);

      const result = await createAsset({
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'character',
        label: 'Hero'
      });

      expect(result.status).toBe('created');
      expect(result.assetId).toBeDefined();
      expect(result.assetId).toMatch(/^chr-/);
      expect(result.message).toContain('Hero');
      expect(result.asset?.label).toBe('Hero');
      expect(result.asset?.kind).toBe('character');
      expect(result.asset?.stage).toBe('description');
      expect(result.asset?.stageState).toBe('pending');
    });

    it('creates an object asset', async () => {
      mockPathExistsFalse();
      mockReadFile(null);

      const result = await createAsset({
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'object',
        label: 'Sword'
      });

      expect(result.status).toBe('created');
      expect(result.assetId).toMatch(/^obj-/);
      expect(result.asset?.kind).toBe('object');
    });

    it('returns collision when asset with same label exists', async () => {
      mockPathExistsTrue();
      const existingCatalog = JSON.stringify({
        schemaVersion: 1,
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'character',
        assets: [{
          assetId: 'chr-001',
          kind: 'character' as AssetKind,
          label: 'Hero',
          description: '',
          stage: 'description',
          stageState: 'pending',
          tags: [],
          references: [],
          manifestPath: '/fake/path',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }],
        readiness: {},
        updatedAt: new Date().toISOString()
      });
      mockReadFile(existingCatalog);

      const result = await createAsset({
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'character',
        label: 'Hero'
      });

      expect(result.status).toBe('collision');
      expect(result.message).toContain('Ya existe');
    });

    it('returns fail_compile when label is empty', async () => {
      const result = await createAsset({
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'character',
        label: '   '
      });

      expect(result.status).toBe('fail_compile');
      expect(result.message).toContain('obligatorio');
    });
  });

  describe('listAssets', () => {
    it('returns empty when catalog does not exist', async () => {
      mockPathExistsFalse();
      mockReadFile(null);

      const result = await listAssets({
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'character'
      });

      expect(result.status).toBe('empty');
      expect(result.total).toBe(0);
      expect(result.assets).toEqual([]);
    });

    it('returns assets when catalog exists', async () => {
      mockPathExistsTrue();
      const catalogContent = JSON.stringify({
        schemaVersion: 1,
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'character',
        assets: [
          {
            assetId: 'chr-001',
            kind: 'character' as AssetKind,
            label: 'Hero',
            description: 'The main hero',
            stage: 'description',
            stageState: 'ready' as const,
            tags: ['main'],
            references: [],
            manifestPath: '/fake/path',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        readiness: {},
        updatedAt: new Date().toISOString()
      });
      mockReadFile(catalogContent);

      const result = await listAssets({
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'character'
      });

      expect(result.status).toBe('ok');
      expect(result.total).toBe(1);
      expect(result.assets[0].label).toBe('Hero');
    });
  });

  describe('updateAsset', () => {
    it('updates an existing asset', async () => {
      mockPathExistsTrue();
      const catalogContent = JSON.stringify({
        schemaVersion: 1,
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'character',
        assets: [{
          assetId: 'chr-001',
          kind: 'character' as AssetKind,
          label: 'Hero',
          description: 'Old description',
          stage: 'description',
          stageState: 'pending',
          tags: [],
          references: [],
          manifestPath: '/fake/path',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }],
        readiness: {},
        updatedAt: new Date().toISOString()
      });
      mockReadFile(catalogContent);

      const result = await updateAsset({
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'character',
        assetId: 'chr-001',
        label: 'Super Hero',
        description: 'New description',
        stageState: 'ready'
      });

      expect(result.status).toBe('updated');
      expect(result.asset?.label).toBe('Super Hero');
      expect(result.asset?.description).toBe('New description');
      expect(result.asset?.stageState).toBe('ready');
    });

    it('returns not_found when asset does not exist', async () => {
      mockPathExistsTrue();
      mockReadFile(JSON.stringify({
        schemaVersion: 1,
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'character',
        assets: [],
        readiness: {},
        updatedAt: new Date().toISOString()
      }));

      const result = await updateAsset({
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'character',
        assetId: 'chr-999'
      });

      expect(result.status).toBe('not_found');
    });
  });

  describe('deleteAsset', () => {
    it('deletes an existing asset', async () => {
      mockPathExistsTrue();
      const catalogContent = JSON.stringify({
        schemaVersion: 1,
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'character',
        assets: [{
          assetId: 'chr-001',
          kind: 'character' as AssetKind,
          label: 'Hero',
          description: '',
          stage: 'description',
          stageState: 'pending',
          tags: [],
          references: [],
          manifestPath: '/fake/path',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }],
        readiness: {},
        updatedAt: new Date().toISOString()
      });
      mockReadFile(catalogContent);

      const result = await deleteAsset({
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'character',
        assetId: 'chr-001'
      });

      expect(result.status).toBe('deleted');
      expect(result.message).toContain('Hero');
    });

    it('returns not_found when asset does not exist', async () => {
      mockPathExistsTrue();
      mockReadFile(JSON.stringify({
        schemaVersion: 1,
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'character',
        assets: [],
        readiness: {},
        updatedAt: new Date().toISOString()
      }));

      const result = await deleteAsset({
        projectId: 'test-project',
        sceneId: 'test-scene',
        kind: 'character',
        assetId: 'chr-999'
      });

      expect(result.status).toBe('not_found');
    });
  });

  describe('getAssetReadiness', () => {
    it('returns default readiness when no catalogs exist', async () => {
      mockPathExistsFalse();
      mockReadFile(null);

      const result = await getAssetReadiness('test-project', 'test-scene');

      expect(result.characters.description).toBe('pending');
      expect(result.objects.model_3d).toBe('pending');
      expect(result.overall.description).toBe('pending');
    });
  });
});
