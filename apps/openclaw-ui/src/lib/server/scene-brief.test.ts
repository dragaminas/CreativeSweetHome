import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildSceneBriefArtifact,
  parseSceneList,
  persistSceneBrief
} from './scene-brief';

describe('scene-brief workflow', () => {
  it('classifies a guided brief as accepted when required fields are clear', () => {
    const artifact = buildSceneBriefArtifact({
      projectId: 'pilot-project',
      sceneId: 'opening-alley',
      intent: 'Abrir la historia con una persecucion corta.',
      tone: 'Nocturno, artesanal y cinematografico.',
      narrative:
        'Una piloto adolescente cruza un callejon lluvioso mientras un dron casero la sigue de cerca.',
      characters: ['Nora', 'drone companion'],
      objects: ['motocicleta electrica', 'poste de neones'],
      constraints: ['clip corto', 'continuidad visual entre personaje y dron'],
      references: ['moodboard de lluvia nocturna']
    });

    expect(artifact.checkpoint.status).toBe('accepted');
    expect(artifact.briefId).toBe('pilot-project:opening-alley');
    expect(artifact.sharedBrief.structure.workspaceId).toBe('scene');
    expect(artifact.sharedBrief.extractedKeywords.length).toBeGreaterThan(0);
  });

  it('marks incomplete when guided required fields are missing', () => {
    const artifact = buildSceneBriefArtifact({
      projectId: 'pilot-project',
      sceneId: 'missing-fields',
      intent: '',
      tone: 'Nocturno',
      narrative: 'Una escena inicial.',
      characters: [],
      objects: ['callejon'],
      constraints: []
    });

    expect(artifact.checkpoint.status).toBe('incomplete');
    expect(artifact.checkpoint.notes.join(' ')).toMatch(/intent/i);
    expect(artifact.checkpoint.notes.join(' ')).toMatch(/characters/i);
    expect(artifact.checkpoint.notes.join(' ')).toMatch(/constraints/i);
  });

  it('marks ambiguous when uncertainty markers are detected', () => {
    const artifact = buildSceneBriefArtifact({
      projectId: 'pilot-project',
      sceneId: 'ambiguous-draft',
      intent: 'Quizas una apertura, no se.',
      tone: 'Tal vez comico o dramatico, etc.',
      narrative: 'Algo medio raro que luego decidimos.',
      characters: ['persona principal'],
      objects: ['objeto'],
      constraints: ['restriccion base']
    });

    expect(artifact.checkpoint.status).toBe('ambiguous');
    expect(artifact.checkpoint.notes.join(' ')).toMatch(/ambigu/i);
  });

  it('persists the brief in the canonical scene path under STUDIO_DIR', async () => {
    const tempStudioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-scene-brief-'));

    const persisted = await persistSceneBrief(
      {
        projectId: 'Pilot Feature',
        sceneId: 'Opening Alley',
        intent: 'Definir la escena de apertura con accion breve.',
        tone: 'Cinematografico y humedo.',
        narrative:
          'Una piloto cruza un callejon lluvioso con un dron siguiendola, buscando tension y continuidad visual.',
        characters: ['Nora'],
        objects: ['dron', 'callejon'],
        constraints: ['clip corto', 'sin lluvia extrema']
      },
      { studioDir: tempStudioDir, now: new Date('2026-05-14T10:00:00.000Z') }
    );

    const expectedPath = path.join(
      tempStudioDir,
      'Scenes',
      'pilot-feature',
      'opening-alley',
      'briefs',
      'scene-brief.json'
    );

    expect(persisted.filePath).toBe(expectedPath);

    const saved = JSON.parse(await fs.readFile(expectedPath, 'utf8')) as {
      checkpoint: { status: string };
      briefId: string;
      source: { tone: string };
    };

    expect(saved.checkpoint.status).toBe('accepted');
    expect(saved.briefId).toBe('pilot-feature:opening-alley');
    expect(saved.source.tone).toBe('Cinematografico y humedo.');
  });

  it('parses guided list fields from strings and arrays', () => {
    expect(parseSceneList('nora, drone\ncallejon')).toEqual(['nora', 'drone', 'callejon']);
    expect(parseSceneList(['  uno  ', '', 'dos'])).toEqual(['uno', 'dos']);
  });
});
