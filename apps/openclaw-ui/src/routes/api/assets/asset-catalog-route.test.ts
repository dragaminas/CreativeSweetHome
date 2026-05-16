import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { DELETE, GET, POST } from './+server';

describe('asset catalog route', () => {
  it('keeps tags and references when update omits those fields', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-assets-route-update-'));
    process.env.STUDIO_DIR = tempStudioDir;

    try {
      const createResponse = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            kind: 'character',
            label: 'Nora',
            tags: ['lead'],
            references: ['turnaround-nora']
          })
        })
      } as never);

      expect(createResponse.status).toBe(201);

      const createPayload = (await createResponse.json()) as {
        accepted: boolean;
        assetId: string;
      };

      expect(createPayload.accepted).toBe(true);

      const updateResponse = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            kind: 'character',
            assetId: createPayload.assetId,
            stageState: 'ready'
          })
        })
      } as never);

      expect(updateResponse.status).toBe(200);

      const listResponse = await GET({
        url: new URL(
          'http://localhost/api/assets?projectId=pilot-feature&sceneId=opening-alley&kind=character'
        )
      } as never);

      expect(listResponse.status).toBe(200);

      const listPayload = (await listResponse.json()) as {
        total: number;
        assets: Array<{ tags: string[]; references: string[] }>;
      };

      expect(listPayload.total).toBe(1);
      expect(listPayload.assets[0]?.tags).toEqual(['lead']);
      expect(listPayload.assets[0]?.references).toEqual(['turnaround-nora']);
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });

  it('lists characters and objects together when kind filter is absent', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-assets-route-list-all-'));
    process.env.STUDIO_DIR = tempStudioDir;

    try {
      const createCharacter = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            kind: 'character',
            label: 'Nora'
          })
        })
      } as never);
      expect(createCharacter.status).toBe(201);

      const createObject = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            kind: 'object',
            label: 'Dron'
          })
        })
      } as never);
      expect(createObject.status).toBe(201);

      const listResponse = await GET({
        url: new URL('http://localhost/api/assets?projectId=pilot-feature&sceneId=opening-alley')
      } as never);

      expect(listResponse.status).toBe(200);

      const listPayload = (await listResponse.json()) as {
        total: number;
        assets: Array<{ kind: string; label: string }>;
      };

      expect(listPayload.total).toBe(2);
      expect(listPayload.assets.map((asset) => `${asset.kind}:${asset.label}`)).toEqual(
        expect.arrayContaining(['character:Nora', 'object:Dron'])
      );
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });

  it('does not reuse deleted asset ids', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-assets-route-id-'));
    process.env.STUDIO_DIR = tempStudioDir;

    try {
      const createFirst = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            kind: 'character',
            label: 'Nora'
          })
        })
      } as never);
      const firstPayload = (await createFirst.json()) as { assetId: string };

      const createSecond = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            kind: 'character',
            label: 'Dax'
          })
        })
      } as never);
      const secondPayload = (await createSecond.json()) as { assetId: string };

      expect(firstPayload.assetId).toBe('chr-001');
      expect(secondPayload.assetId).toBe('chr-002');

      const deleteResponse = await DELETE({
        url: new URL(
          `http://localhost/api/assets?projectId=pilot-feature&sceneId=opening-alley&kind=character&assetId=${firstPayload.assetId}`
        ),
        request: new Request('http://localhost/api/assets', { method: 'DELETE' })
      } as never);

      expect(deleteResponse.status).toBe(200);

      const createThird = await POST({
        request: new Request('http://localhost/api/assets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            projectId: 'pilot-feature',
            sceneId: 'opening-alley',
            kind: 'character',
            label: 'Ivo'
          })
        })
      } as never);

      expect(createThird.status).toBe(201);

      const thirdPayload = (await createThird.json()) as { assetId: string };
      expect(thirdPayload.assetId).toBe('chr-003');
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });
});
