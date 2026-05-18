import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createSceneStorageScaffold } from './scene-storage';
import {
  buildShotBriefArtifact,
  parseShotList,
  persistShotBrief
} from './shot-brief';
import { persistSceneBrief } from './scene-brief';

async function seedScene(studioDir: string, projectId: string, sceneId: string, shotId: string): Promise<void> {
  await persistSceneBrief(
    {
      projectId,
      sceneId,
      intent: 'Preparar escena para shot brief.',
      tone: 'Nocturno y cinematografico.',
      narrative: 'Una piloto cruza un callejon con un dron.',
      characters: ['Nora'],
      objects: ['dron'],
      constraints: ['continuidad visual']
    },
    { studioDir, now: new Date('2026-05-18T10:00:00.000Z') }
  );

  await createSceneStorageScaffold(
    {
      projectId,
      sceneId,
      initialShotId: shotId
    },
    {
      studioDir,
      assets3dDir: path.join(studioDir, 'Assets3D'),
      now: new Date('2026-05-18T10:10:00.000Z')
    }
  );
}

describe('shot-brief workflow', () => {
  it('classifies a guided shot brief as accepted when required fields are clear', () => {
    const artifact = buildShotBriefArtifact({
      projectId: 'pilot-project',
      sceneId: 'opening-alley',
      shotId: 'sh010',
      intent: 'Mostrar la entrada de Nora al callejon.',
      framing: 'Plano medio con dolly de seguimiento.',
      durationMs: 4800,
      characters: ['Nora'],
      constraints: ['24fps', 'continuidad de lluvia'],
      narrative: 'La camara acompana el movimiento de Nora durante cuatro segundos.',
      references: ['moodboard lluvia nocturna']
    });

    expect(artifact.checkpoint.status).toBe('accepted');
    expect(artifact.briefId).toBe('pilot-project:opening-alley:sh010');
    expect(artifact.sharedBrief.structure.workspaceId).toBe('shot');
    expect(artifact.sharedBrief.extractedKeywords.length).toBeGreaterThan(0);
  });

  it('marks incomplete when required shot fields are missing', () => {
    const artifact = buildShotBriefArtifact({
      projectId: 'pilot-project',
      sceneId: 'opening-alley',
      shotId: 'sh010',
      intent: '',
      framing: '',
      durationMs: 0,
      characters: [],
      constraints: []
    });

    expect(artifact.checkpoint.status).toBe('incomplete');
    expect(artifact.checkpoint.notes.join(' ')).toMatch(/intent/i);
    expect(artifact.checkpoint.notes.join(' ')).toMatch(/framing/i);
    expect(artifact.checkpoint.notes.join(' ')).toMatch(/duration/i);
    expect(artifact.checkpoint.notes.join(' ')).toMatch(/characters/i);
  });

  it('marks ambiguous when uncertainty markers are detected', () => {
    const artifact = buildShotBriefArtifact({
      projectId: 'pilot-project',
      sceneId: 'opening-alley',
      shotId: 'sh010',
      intent: 'Quizas mostrar la entrada, no se.',
      framing: 'Tal vez plano abierto o close, etc.',
      durationMs: 3200,
      characters: ['Nora'],
      constraints: ['continuidad base']
    });

    expect(artifact.checkpoint.status).toBe('ambiguous');
    expect(artifact.checkpoint.notes.join(' ')).toMatch(/ambigu/i);
  });

  it('persists the shot brief in the canonical shot path and reports consistency feedback', async () => {
    const previousStudioDir = process.env.STUDIO_DIR;
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-shot-brief-'));
    process.env.STUDIO_DIR = tempStudioDir;

    try {
      await seedScene(tempStudioDir, 'pilot-feature', 'opening-alley', 'sh010');

      const persisted = await persistShotBrief(
        {
          projectId: 'pilot-feature',
          sceneId: 'opening-alley',
          shotId: 'sh010',
          intent: 'Nora entra al callejon y mira a camara.',
          framing: 'Plano medio con travelling corto.',
          durationMs: 4200,
          characters: ['Nora'],
          constraints: ['24fps', 'evitar cortes bruscos'],
          references: ['shotdeck-rain-night']
        },
        { now: new Date('2026-05-18T10:20:00.000Z') }
      );

      const expectedPath = path.join(
        tempStudioDir,
        'Scenes',
        'pilot-feature',
        'opening-alley',
        'shots',
        'sh010',
        'briefs',
        'shot-brief.json'
      );

      expect(persisted.filePath).toBe(expectedPath);
      expect(persisted.artifact.consistency.status).toBe('needs_review');
      expect(persisted.artifact.consistency.notes.join(' ')).toMatch(/catalogo/i);

      const saved = JSON.parse(await fs.readFile(expectedPath, 'utf8')) as {
        briefId: string;
        checkpoint: { status: string };
        consistency: { status: string };
      };

      expect(saved.briefId).toBe('pilot-feature:opening-alley:sh010');
      expect(saved.checkpoint.status).toBe('accepted');
      expect(saved.consistency.status).toBe('needs_review');
    } finally {
      if (previousStudioDir === undefined) {
        delete process.env.STUDIO_DIR;
      } else {
        process.env.STUDIO_DIR = previousStudioDir;
      }
    }
  });

  it('parses guided list fields from strings and arrays', () => {
    expect(parseShotList('nora, drone\ncallejon')).toEqual(['nora', 'drone', 'callejon']);
    expect(parseShotList(['  uno  ', '', 'dos'])).toEqual(['uno', 'dos']);
  });
});
