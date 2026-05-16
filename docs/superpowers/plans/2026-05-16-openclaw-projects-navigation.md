# OpenClaw Projects Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat JSON-backed shell navigation with filesystem-backed `openclaw-projects` navigation, while making `types/project.ts` the single source of truth for asset kinds.

**Architecture:** Add `OPENCLAW_PROJECTS_DIR` resolution to the existing server environment context, load project folders into canonical `DomainSnapshot` objects, and adapt those snapshots through the existing navigation/editor contracts. Server routes return serializable snapshots and navigation projections; Svelte components attach local no-op editor callbacks where the current editor contracts require functions.

**Tech Stack:** SvelteKit, TypeScript, Vitest, Playwright, Node `fs/promises`, existing OpenClaw UI contracts in `apps/openclaw-ui/src/lib/types`.

---

## File Structure

- Modify `apps/openclaw-ui/src/lib/types/project.ts`
  - Owns canonical `AssetKind`, including `location`.
- Modify `apps/openclaw-ui/src/lib/types/navigation/projectEdition/assetEdition.ts`
  - Removes `AssetType`; imports `AssetKind` from `types/project.ts`.
- Modify `apps/openclaw-ui/src/lib/types/navigation/projectEdition/applicationServices.ts`
  - Uses `AssetKind` for asset commands.
- Modify `apps/openclaw-ui/src/lib/types/navigation/projectNavigation/assetNavigation.ts`
  - Makes asset navigation use the common `Navigator` shape and grouped asset lists.
- Modify `apps/openclaw-ui/src/lib/types/navigation/projectNavigation/navigation.ts`
  - Points `ProjectNavigation.assetsNavigation` at grouped asset navigation.
- Modify `apps/openclaw-ui/src/lib/navigation/adapters/project-edition-adapters.ts`
  - Emits grouped navigation and shell editor query URLs.
- Modify `apps/openclaw-ui/src/lib/navigation/mocks/in-memory-project-ui-services.ts`
  - Uses canonical `AssetKind`, includes a location asset in seed data, and stays compatible with tests.
- Modify `apps/openclaw-ui/src/lib/server/env.ts`
  - Adds `openclawProjectsDir`.
- Create `apps/openclaw-ui/src/lib/server/openclaw-projects.ts`
  - Loads and optionally seeds filesystem project manifests into `DomainSnapshot[]`.
- Create `apps/openclaw-ui/src/lib/navigation/project-editor-route-data.ts`
  - Converts serializable snapshots and URL params into view data consumed by `+page.svelte`.
- Modify `apps/openclaw-ui/src/routes/+layout.server.ts`
  - Loads filesystem navigation into layout data.
- Modify `apps/openclaw-ui/src/routes/+layout.svelte`
  - Renders nested `Projects > Project > Scenes > Scene > Shots` and `Assets > Characters/Objects/Locations`.
- Modify `apps/openclaw-ui/src/routes/+page.server.ts`
  - Loads serializable project editor route data from filesystem snapshots.
- Modify `apps/openclaw-ui/src/routes/+page.svelte`
  - Removes direct JSON import and builds current editor props from route data.
- Create `apps/openclaw-ui/src/lib/components/ProjectEditor.svelte`
  - Renders the selected project's editor contract.
- Create `apps/openclaw-ui/src/lib/components/ProjectEditor.test.ts`
  - Guards project editor rendering.
- Modify `apps/openclaw-ui/src/app.css`
  - Adds stable nested tree navigation styles.
- Create `apps/openclaw-ui/src/lib/types/navigation/projectEdition/assetEdition.test.ts`
  - Guards the asset type normalization.
- Modify `apps/openclaw-ui/src/lib/navigation/project-ui-services.test.ts`
  - Guards grouped navigation and location assets.
- Create `apps/openclaw-ui/src/lib/server/env.test.ts`
  - Guards default and env-based project root resolution.
- Create `apps/openclaw-ui/src/lib/server/openclaw-projects.test.ts`
  - Guards filesystem loading, relation validation, asset grouping, and seeding.
- Create repo-local `openclaw-projects/pilot-project` project, scene, shot, character asset, location asset, and relation manifest files
  - Provides the default repo-local project folder used when no `.env` override is set.
- Create `.env.example`
  - Documents `OPENCLAW_PROJECTS_DIR`.
- Modify `apps/openclaw-ui/tests/e2e/shell.spec.ts`
  - Updates shell navigation expectations from flat JSON to filesystem tree.

---

### Task 1: Normalize Asset Kinds

**Files:**
- Modify: `apps/openclaw-ui/src/lib/types/project.ts`
- Modify: `apps/openclaw-ui/src/lib/types/navigation/projectEdition/assetEdition.ts`
- Modify: `apps/openclaw-ui/src/lib/types/navigation/projectEdition/applicationServices.ts`
- Modify: `apps/openclaw-ui/src/lib/navigation/adapters/project-edition-adapters.ts`
- Modify: `apps/openclaw-ui/src/lib/navigation/mocks/in-memory-project-ui-services.ts`
- Modify: `apps/openclaw-ui/src/routes/+page.svelte`
- Modify: `apps/openclaw-ui/src/lib/components/EntityEditors.test.ts`
- Create: `apps/openclaw-ui/src/lib/types/navigation/projectEdition/assetEdition.test.ts`

- [ ] **Step 1: Write the failing asset kind normalization test**

Create `apps/openclaw-ui/src/lib/types/navigation/projectEdition/assetEdition.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import * as assetEditionRuntime from './assetEdition';
import type {
  AssetDescription,
  AssetLiteralDescription
} from './assetEdition';
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
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
npm --prefix apps/openclaw-ui run test -- assetEdition
```

Expected: FAIL because `AssetKind` does not include `location` and `assetEditionRuntime` still exports `AssetType`.

- [ ] **Step 3: Update canonical project asset kind**

In `apps/openclaw-ui/src/lib/types/project.ts`, replace:

```ts
export type AssetKind = 'character' | 'object';
```

with:

```ts
export type AssetKind = 'character' | 'object' | 'location';
```

- [ ] **Step 4: Remove `AssetType` from asset edition contracts**

In `apps/openclaw-ui/src/lib/types/navigation/projectEdition/assetEdition.ts`, replace the top of the file and all `AssetType` references with:

```ts
import type { AssetKind } from '../../project';
import type { Editor } from './editor';

export interface AssetEditor extends Editor {
    literalDescription: AssetLiteralDescription;
    literalDescriptionEditor: LiteralDescriptionEditor;
    assetVisualization: AssetVisualization;
    assetEdition: AssetEdition;
}

export interface AssetLiteralDescription{
    assetName: string;
    assetType: AssetKind;
    assetSystemPath: string;
    assetDescription: AssetDescription;
}

export interface LiteralDescriptionEditor{
    editAssetName: (name: string) => void;
    editAssetType: (type: AssetKind) => void;
    editAssetDescription: (description: string) => AssetDescription;
}

export interface AssetDescription {
    description: string;
    assetType: AssetKind;
}
```

Keep the existing `AssetVisualization`, `AssetPreview`, `SingleAsset3DMetrics`, `AssetEdition`, `SingleAssetEdition`, and `ImprovementDetails` declarations below that block. Delete `AssetType`, `SingleAsset`, and `ComplexAsset` from this file.

- [ ] **Step 5: Update asset command contracts**

In `apps/openclaw-ui/src/lib/types/navigation/projectEdition/applicationServices.ts`, replace the first import:

```ts
import type { AssetDescription, AssetEditor, AssetType, ImprovementDetails } from "./assetEdition";
```

with:

```ts
import type { AssetKind } from "../../project";
import type { AssetDescription, AssetEditor, ImprovementDetails } from "./assetEdition";
```

Then replace:

```ts
assetType?: AssetType;
```

with:

```ts
assetType?: AssetKind;
```

and replace:

```ts
assetType: AssetType;
```

with:

```ts
assetType: AssetKind;
```

- [ ] **Step 6: Update adapter and in-memory imports**

In `apps/openclaw-ui/src/lib/navigation/adapters/project-edition-adapters.ts`, replace:

```ts
import { AssetType, type AssetDescription, type AssetEditor } from '../../types/navigation/projectEdition/assetEdition';
```

with:

```ts
import type { AssetDescription, AssetEditor } from '../../types/navigation/projectEdition/assetEdition';
```

Delete the `resolveAssetType()` helper and change `createAssetDescription()` to:

```ts
function createAssetDescription(asset: AssetDefinition): AssetDescription {
  return {
    description: asset.description ?? '',
    assetType: asset.kind
  };
}
```

Change every `resolveAssetType(asset.kind)` call in this file to `asset.kind`, and change the `editAssetType` parameter type to `AssetKind` if TypeScript cannot infer it.

In `apps/openclaw-ui/src/lib/navigation/mocks/in-memory-project-ui-services.ts`, delete the `AssetType` import. Replace `resolveAssetKind()` with:

```ts
function defaultAssetName(kind: AssetKind, index: number): string {
  if (kind === 'character') {
    return `Character ${index}`;
  }

  if (kind === 'location') {
    return `Location ${index}`;
  }

  return `Asset ${index}`;
}
```

Change the add-asset default kind expression to:

```ts
const kind = command.assetType ?? 'object';
```

Change `asset.kind = resolveAssetKind(command.assetType);` to:

```ts
asset.kind = command.assetType;
```

- [ ] **Step 7: Update route and component tests that imported `AssetType`**

In `apps/openclaw-ui/src/routes/+page.svelte`, replace the asset import with:

```ts
  import type { AssetKind } from '$lib/types/project';
  import type { AssetEditor as AssetEditorModel } from '$lib/types/navigation/projectEdition/assetEdition';
```

Replace:

```ts
    const assetType = asset.type as AssetType;
```

with:

```ts
    const assetType = asset.type.toLowerCase() as AssetKind;
```

In `apps/openclaw-ui/src/lib/components/EntityEditors.test.ts`, replace the `AssetType` import with a type-only `AssetEditor` import, and use string kinds:

```ts
assetType: 'character'
```

- [ ] **Step 8: Run focused tests and commit**

Run:

```bash
npm --prefix apps/openclaw-ui run test -- assetEdition EntityEditors
```

Expected: PASS.

Commit:

```bash
git add apps/openclaw-ui/src/lib/types/project.ts apps/openclaw-ui/src/lib/types/navigation/projectEdition/assetEdition.ts apps/openclaw-ui/src/lib/types/navigation/projectEdition/applicationServices.ts apps/openclaw-ui/src/lib/navigation/adapters/project-edition-adapters.ts apps/openclaw-ui/src/lib/navigation/mocks/in-memory-project-ui-services.ts apps/openclaw-ui/src/routes/+page.svelte apps/openclaw-ui/src/lib/components/EntityEditors.test.ts apps/openclaw-ui/src/lib/types/navigation/projectEdition/assetEdition.test.ts
git commit -m "refactor(openclaw-ui): use canonical asset kinds"
```

### Task 2: Group Navigation Assets By Canonical Kind

**Files:**
- Modify: `apps/openclaw-ui/src/lib/types/navigation/projectNavigation/assetNavigation.ts`
- Modify: `apps/openclaw-ui/src/lib/types/navigation/projectNavigation/navigation.ts`
- Modify: `apps/openclaw-ui/src/lib/navigation/adapters/project-edition-adapters.ts`
- Modify: `apps/openclaw-ui/src/lib/navigation/project-ui-services.test.ts`
- Modify: `apps/openclaw-ui/src/lib/navigation/mocks/in-memory-project-ui-services.ts`

- [ ] **Step 1: Write failing grouped navigation assertions**

In `apps/openclaw-ui/src/lib/navigation/project-ui-services.test.ts`, extend the first test after `expect(panel.projectNavigation[0]?.elementName).toBe('Pilot Project');`:

```ts
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
```

- [ ] **Step 2: Run focused test and confirm it fails**

Run:

```bash
npm --prefix apps/openclaw-ui run test -- project-ui-services
```

Expected: FAIL because `assetsNavigation` is currently a flat array and the seed snapshot has no location asset navigation.

- [ ] **Step 3: Update asset navigation contract**

Replace `apps/openclaw-ui/src/lib/types/navigation/projectNavigation/assetNavigation.ts` with:

```ts
import type { AssetKind } from '../../project';
import type { Navigator } from './navigation';

export interface AssetsNavigation {
    charactersNavigation: AssetNavigation[];
    objectsNavigation: AssetNavigation[];
    locationsNavigation: AssetNavigation[];
}

export interface AssetNavigation extends Navigator {
    assetKind: AssetKind;
}
```

In `apps/openclaw-ui/src/lib/types/navigation/projectNavigation/navigation.ts`, replace the asset import:

```ts
import type { AssetNavigation} from "./assetNavigation";
```

with:

```ts
import type { AssetsNavigation } from "./assetNavigation";
```

and replace:

```ts
assetsNavigation: AssetNavigation[];
```

with:

```ts
assetsNavigation: AssetsNavigation;
```

- [ ] **Step 4: Update navigation adapter grouping**

In `apps/openclaw-ui/src/lib/navigation/adapters/project-edition-adapters.ts`, replace the asset navigation import with:

```ts
import type { AssetNavigation, AssetsNavigation } from '../../types/navigation/projectNavigation/assetNavigation';
```

Add this helper:

```ts
function emptyAssetsNavigation(): AssetsNavigation {
  return {
    charactersNavigation: [],
    objectsNavigation: [],
    locationsNavigation: []
  };
}
```

Replace `buildAssetNavigation()` with:

```ts
function buildAssetNavigation(snapshot: DomainSnapshot): AssetsNavigation {
  const grouped = emptyAssetsNavigation();

  const navigationItems = snapshot.project.assetIds
    .map((assetId) => snapshot.assets.find((entry) => entry.id === assetId))
    .filter((entry): entry is AssetDefinition => Boolean(entry))
    .map((asset): AssetNavigation => ({
      elementName: asset.name,
      elementUrl: `/?editor=asset&projectId=${asset.projectId}&assetId=${asset.id}`,
      assetKind: asset.kind
    }));

  for (const item of navigationItems) {
    if (item.assetKind === 'character') {
      grouped.charactersNavigation.push(item);
    } else if (item.assetKind === 'location') {
      grouped.locationsNavigation.push(item);
    } else {
      grouped.objectsNavigation.push(item);
    }
  }

  return grouped;
}
```

Also change scene and shot URLs in this file to shell editor URLs:

```ts
elementUrl: `/?editor=shot&projectId=${shot.projectId}&sceneId=${shot.sceneId}&shotId=${shot.id}`
```

and:

```ts
elementUrl: `/?editor=scene&projectId=${scene.projectId}&sceneId=${scene.id}`
```

Change the project URL to:

```ts
elementUrl: `/?editor=project&projectId=${project.id}`
```

- [ ] **Step 5: Add a location asset to the in-memory seed**

In `buildDefaultSnapshot()` in `apps/openclaw-ui/src/lib/navigation/mocks/in-memory-project-ui-services.ts`, add `loc-alley` to `project.assetIds`, create an `AssetDefinition` for the location, and include it in `assets`:

```ts
assetIds: ['asset-nora', 'loc-alley'],
```

Add after the character asset:

```ts
  const locationAsset: AssetDefinition = {
    id: 'loc-alley',
    name: 'Rainy Alley',
    description: 'Navigable location asset for the opening beat.',
    createdAt: now,
    updatedAt: now,
    projectId: project.id,
    sceneId: scene.id,
    kind: 'location',
    tags: ['location', 'phase16'],
    artifacts: [],
    operations: [],
    pipeline: createAssetPipeline()
  };
```

Return:

```ts
assets: [asset, locationAsset],
```

- [ ] **Step 6: Run focused test and commit**

Run:

```bash
npm --prefix apps/openclaw-ui run test -- project-ui-services
```

Expected: PASS.

Commit:

```bash
git add apps/openclaw-ui/src/lib/types/navigation/projectNavigation/assetNavigation.ts apps/openclaw-ui/src/lib/types/navigation/projectNavigation/navigation.ts apps/openclaw-ui/src/lib/navigation/adapters/project-edition-adapters.ts apps/openclaw-ui/src/lib/navigation/project-ui-services.test.ts apps/openclaw-ui/src/lib/navigation/mocks/in-memory-project-ui-services.ts
git commit -m "feat(openclaw-ui): group project navigation assets"
```

### Task 3: Add `OPENCLAW_PROJECTS_DIR` Environment Resolution

**Files:**
- Modify: `apps/openclaw-ui/src/lib/server/env.ts`
- Create: `apps/openclaw-ui/src/lib/server/env.test.ts`
- Create: `.env.example`

- [ ] **Step 1: Write failing environment tests**

Create `apps/openclaw-ui/src/lib/server/env.test.ts`:

```ts
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { resolveRepoContext } from './env';

const previousProjectsDir = process.env.OPENCLAW_PROJECTS_DIR;

afterEach(() => {
  if (previousProjectsDir === undefined) {
    delete process.env.OPENCLAW_PROJECTS_DIR;
  } else {
    process.env.OPENCLAW_PROJECTS_DIR = previousProjectsDir;
  }
});

describe('resolveRepoContext openclaw projects root', () => {
  it('defaults openclawProjectsDir to repoRoot/openclaw-projects', () => {
    delete process.env.OPENCLAW_PROJECTS_DIR;

    const context = resolveRepoContext();

    expect(context.openclawProjectsDir).toBe(path.join(context.repoRoot, 'openclaw-projects'));
  });

  it('resolves relative OPENCLAW_PROJECTS_DIR from the repo root', () => {
    process.env.OPENCLAW_PROJECTS_DIR = 'local-projects';

    const context = resolveRepoContext();

    expect(context.openclawProjectsDir).toBe(path.join(context.repoRoot, 'local-projects'));
  });

  it('uses absolute OPENCLAW_PROJECTS_DIR unchanged', () => {
    const absolutePath = path.join(path.sep, 'tmp', 'openclaw-projects-test');
    process.env.OPENCLAW_PROJECTS_DIR = absolutePath;

    const context = resolveRepoContext();

    expect(context.openclawProjectsDir).toBe(absolutePath);
  });
});
```

- [ ] **Step 2: Run focused test and confirm it fails**

Run:

```bash
npm --prefix apps/openclaw-ui run test -- env
```

Expected: FAIL because `RepoContext` does not expose `openclawProjectsDir`.

- [ ] **Step 3: Add environment resolution**

In `apps/openclaw-ui/src/lib/server/env.ts`, add to `RepoContext`:

```ts
  openclawProjectsDir: string;
```

Add this helper below `findRepoRoot()`:

```ts
function resolveRepoPath(repoRoot: string, value: string | undefined, fallbackName: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return path.join(repoRoot, fallbackName);
  }

  return path.isAbsolute(trimmed) ? trimmed : path.join(repoRoot, trimmed);
}
```

In the returned object from `resolveRepoContext()`, add:

```ts
    openclawProjectsDir: resolveRepoPath(
      repoRoot,
      process.env.OPENCLAW_PROJECTS_DIR,
      'openclaw-projects'
    ),
```

- [ ] **Step 4: Add `.env.example`**

Create `.env.example`:

```bash
# Optional. Defaults to ./openclaw-projects at the OpenClaw repo root.
OPENCLAW_PROJECTS_DIR=./openclaw-projects
```

- [ ] **Step 5: Run test and commit**

Run:

```bash
npm --prefix apps/openclaw-ui run test -- env
```

Expected: PASS.

Commit:

```bash
git add apps/openclaw-ui/src/lib/server/env.ts apps/openclaw-ui/src/lib/server/env.test.ts .env.example
git commit -m "feat(openclaw-ui): resolve openclaw projects directory"
```

### Task 4: Load Filesystem Projects Into Domain Snapshots

**Files:**
- Create: `apps/openclaw-ui/src/lib/server/openclaw-projects.ts`
- Create: `apps/openclaw-ui/src/lib/server/openclaw-projects.test.ts`
- Create: `openclaw-projects/pilot-project/project.json`
- Create: `openclaw-projects/pilot-project/relations.json`
- Create: `openclaw-projects/pilot-project/scenes/sc001/scene.json`
- Create: `openclaw-projects/pilot-project/scenes/sc001/shots/sh010/shot.json`
- Create: `openclaw-projects/pilot-project/assets/characters/asset-nora/asset.json`
- Create: `openclaw-projects/pilot-project/assets/locations/loc-alley/asset.json`
- Create directories: `openclaw-projects/pilot-project/assets/objects`

- [ ] **Step 1: Write failing filesystem loader tests**

Create `apps/openclaw-ui/src/lib/server/openclaw-projects.test.ts`:

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  loadOpenClawProjectSnapshots,
  seedDefaultOpenClawProjectTree
} from './openclaw-projects';

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function createPilotProject(rootDir: string): Promise<void> {
  const projectDir = path.join(rootDir, 'pilot-project');

  await writeJson(path.join(projectDir, 'project.json'), {
    id: 'pilot-project',
    name: 'Pilot Project',
    description: 'Filesystem-backed pilot project.',
    scriptIds: ['script-main']
  });

  await writeJson(path.join(projectDir, 'relations.json'), {
    schemaVersion: 1,
    projectId: 'pilot-project',
    sceneOrder: ['sc001'],
    assetOrder: {
      characters: ['asset-nora'],
      objects: [],
      locations: ['loc-alley']
    },
    scenes: {
      sc001: {
        shotOrder: ['sh010'],
        assetIds: ['asset-nora', 'loc-alley'],
        locationIds: ['loc-alley']
      }
    },
    shots: {
      sh010: {
        sceneId: 'sc001',
        assetIds: ['asset-nora', 'loc-alley']
      }
    },
    assets: {
      'asset-nora': {
        kind: 'character',
        sceneIds: ['sc001'],
        shotIds: ['sh010']
      },
      'loc-alley': {
        kind: 'location',
        sceneIds: ['sc001'],
        shotIds: ['sh010']
      }
    }
  });

  await writeJson(path.join(projectDir, 'scenes', 'sc001', 'scene.json'), {
    id: 'sc001',
    name: 'Opening Alley',
    description: 'Initial scene scaffolded from filesystem.',
    scriptId: 'script-main'
  });

  await writeJson(path.join(projectDir, 'scenes', 'sc001', 'shots', 'sh010', 'shot.json'), {
    id: 'sh010',
    name: 'Shot 010',
    description: 'Nora enters the rainy alley.',
    order: 1,
    durationMs: 4800,
    frameRate: 24,
    locationId: 'loc-alley',
    framing: {
      shotSize: 'ms',
      cameraAngle: 'eye',
      cameraMove: 'dolly',
      lensMm: 35
    }
  });

  await writeJson(path.join(projectDir, 'assets', 'characters', 'asset-nora', 'asset.json'), {
    id: 'asset-nora',
    name: 'Nora',
    description: 'Main character of the opening chase.',
    kind: 'character'
  });

  await writeJson(path.join(projectDir, 'assets', 'locations', 'loc-alley', 'asset.json'), {
    id: 'loc-alley',
    name: 'Rainy Alley',
    description: 'Neon-lit alley used in the opening beat.',
    kind: 'location'
  });

  await fs.mkdir(path.join(projectDir, 'assets', 'objects'), { recursive: true });
}

describe('openclaw project filesystem loader', () => {
  it('loads project folders into canonical domain snapshots', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-projects-'));
    await createPilotProject(rootDir);

    const result = await loadOpenClawProjectSnapshots({ projectsDir: rootDir });

    expect(result.rootDir).toBe(rootDir);
    expect(result.warnings).toEqual([]);
    expect(result.snapshots).toHaveLength(1);
    expect(result.snapshots[0]?.project.name).toBe('Pilot Project');
    expect(result.snapshots[0]?.project.sceneIds).toEqual(['sc001']);
    expect(result.snapshots[0]?.project.assetIds).toEqual(['asset-nora', 'loc-alley']);
    expect(result.snapshots[0]?.project.locationIds).toEqual(['loc-alley']);
    expect(result.snapshots[0]?.scenes[0]?.shotIds).toEqual(['sh010']);
    expect(result.snapshots[0]?.assets.map((asset) => asset.kind)).toEqual(['character', 'location']);
  });

  it('omits missing relation references and records warnings', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-projects-missing-ref-'));
    await createPilotProject(rootDir);

    const relationsPath = path.join(rootDir, 'pilot-project', 'relations.json');
    const raw = JSON.parse(await fs.readFile(relationsPath, 'utf8')) as {
      sceneOrder: string[];
    };
    raw.sceneOrder = ['sc001', 'missing-scene'];
    await writeJson(relationsPath, raw);

    const result = await loadOpenClawProjectSnapshots({ projectsDir: rootDir });

    expect(result.snapshots[0]?.project.sceneIds).toEqual(['sc001']);
    expect(result.warnings.some((warning) => warning.includes('missing-scene'))).toBe(true);
  });

  it('seeds the default pilot project tree when requested', async () => {
    const rootDir = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-projects-seed-')), 'projects');

    await seedDefaultOpenClawProjectTree(rootDir, new Date('2026-05-16T09:00:00.000Z'));
    const result = await loadOpenClawProjectSnapshots({ projectsDir: rootDir });

    expect(result.snapshots[0]?.project.id).toBe('pilot-project');
    await expect(fs.access(path.join(rootDir, 'pilot-project', 'relations.json'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(rootDir, 'pilot-project', 'assets', 'objects'))).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run focused test and confirm it fails**

Run:

```bash
npm --prefix apps/openclaw-ui run test -- openclaw-projects
```

Expected: FAIL because `openclaw-projects.ts` does not exist.

- [ ] **Step 3: Implement the filesystem loader API**

Create `apps/openclaw-ui/src/lib/server/openclaw-projects.ts` with these exports and behavior:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';

import type {
  AssetDefinition,
  AssetKind,
  DomainSnapshot,
  Location,
  PipelineStage,
  Project,
  ProjectStage,
  Scene,
  SceneStage,
  Script,
  Shot,
  ShotStage,
  StageState
} from '../types/project';
import { resolveRepoContext } from './env';

export interface OpenClawProjectsLoadOptions {
  projectsDir?: string;
  seedIfMissing?: boolean;
  now?: Date;
}

export interface OpenClawProjectsLoadResult {
  rootDir: string;
  snapshots: DomainSnapshot[];
  warnings: string[];
}

interface ProjectManifest {
  id: string;
  name: string;
  description?: string;
  scriptIds?: string[];
}

interface SceneManifest {
  id: string;
  name: string;
  description?: string;
  scriptId?: string;
}

interface ShotManifest {
  id: string;
  name: string;
  description?: string;
  order?: number;
  durationMs?: number;
  frameRate?: Shot['frameRate'];
  locationId?: string;
  framing?: Shot['framing'];
}

interface AssetManifest {
  id: string;
  name: string;
  description?: string;
  kind: AssetKind;
  tags?: string[];
}

interface RelationManifest {
  schemaVersion: 1;
  projectId: string;
  sceneOrder: string[];
  assetOrder: {
    characters: string[];
    objects: string[];
    locations: string[];
  };
  scenes: Record<string, { shotOrder: string[]; assetIds: string[]; locationIds: string[] }>;
  shots: Record<string, { sceneId: string; assetIds: string[] }>;
  assets: Record<string, { kind: AssetKind; sceneIds: string[]; shotIds: string[] }>;
}
```

Implementation requirements:

- `loadOpenClawProjectSnapshots()` resolves `projectsDir` from options or `resolveRepoContext().openclawProjectsDir`.
- If the root is missing and `seedIfMissing` is true, call `seedDefaultOpenClawProjectTree(rootDir, now)`.
- If the root is missing and `seedIfMissing` is false, return `{ rootDir, snapshots: [], warnings: [] }`.
- Use `fs.readdir(rootDir, { withFileTypes: true })` and load only directories with `project.json`.
- Load `project.json`, `relations.json`, scene manifests, shot manifests, and asset manifests with `JSON.parse`.
- Build `DomainSnapshot` using relation order arrays and skip referenced ids whose manifests are missing.
- Add warning strings such as `Project pilot-project references missing scene missing-scene.`.
- Use default pipelines with `project_setup`, `scene_brief`, `shot_brief`, and `description` marked `ready`; the rest can be `pending`.
- For assets with `kind: 'location'`, also create a compatible `Location` entry with the same id.

Use this stage helper:

```ts
function createStageState<TStage extends string>(stage: TStage, status: StageState<TStage>['status']): StageState<TStage> {
  return {
    stage,
    status,
    latestArtifactIds: [],
    blockers: []
  };
}
```

- [ ] **Step 4: Implement the default seed writer**

In the same file, export:

```ts
export async function seedDefaultOpenClawProjectTree(
  rootDir: string,
  now = new Date()
): Promise<void>
```

It writes the same pilot project structure used by the test:

```text
pilot-project/project.json
pilot-project/relations.json
pilot-project/scenes/sc001/scene.json
pilot-project/scenes/sc001/shots/sh010/shot.json
pilot-project/assets/characters/asset-nora/asset.json
pilot-project/assets/locations/loc-alley/asset.json
pilot-project/assets/objects/
```

Use `fs.mkdir(path.dirname(filePath), { recursive: true })` before each write and write newline-terminated pretty JSON.

- [ ] **Step 5: Add committed default project fixture**

Create the repo-local `openclaw-projects/pilot-project` files with the same JSON content from the test fixture. This makes the default `<repoRoot>/openclaw-projects` usable without a local `.env`.

- [ ] **Step 6: Run focused test and commit**

Run:

```bash
npm --prefix apps/openclaw-ui run test -- openclaw-projects
```

Expected: PASS.

Commit:

```bash
git add apps/openclaw-ui/src/lib/server/openclaw-projects.ts apps/openclaw-ui/src/lib/server/openclaw-projects.test.ts openclaw-projects
git commit -m "feat(openclaw-ui): load openclaw project folders"
```

### Task 5: Build Serializable Project Editor Route Data

**Files:**
- Create: `apps/openclaw-ui/src/lib/navigation/project-editor-route-data.ts`
- Create: `apps/openclaw-ui/src/lib/navigation/project-editor-route-data.test.ts`
- Modify: `apps/openclaw-ui/src/lib/navigation/adapters/project-edition-adapters.ts`

- [ ] **Step 1: Write failing route-data tests**

Create `apps/openclaw-ui/src/lib/navigation/project-editor-route-data.test.ts`:

```ts
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
    expect(panel.projectNavigation[0]?.scenesNavigation[0]?.shotsNavigation[0]?.elementName).toBe('Shot 010');
    expect(panel.projectNavigation[0]?.assetsNavigation.charactersNavigation[0]?.elementName).toBe('Nora');
    expect(panel.projectNavigation[0]?.assetsNavigation.locationsNavigation[0]?.elementName).toBe('Rainy Alley');
  });

  it('selects a shot editor from URL params', () => {
    const data = buildProjectEditorRouteData([makeSnapshot()], new URL('http://localhost/?editor=shot&projectId=pilot-project&sceneId=sc001&shotId=sh010'));

    expect(data.selectedEditor).toBe('shot');
    expect(data.selectedShot?.view.id).toBe('sh010');
    expect(data.projects.projectsList).toEqual(['Pilot Project']);
  });

  it('falls back to projects editor when an entity is missing', () => {
    const data = buildProjectEditorRouteData([makeSnapshot()], new URL('http://localhost/?editor=shot&shotId=missing-shot'));

    expect(data.selectedEditor).toBe('projects');
    expect(data.selectedShot).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run focused test and confirm it fails**

Run:

```bash
npm --prefix apps/openclaw-ui run test -- project-editor-route-data
```

Expected: FAIL because `project-editor-route-data.ts` does not exist.

- [ ] **Step 3: Implement route-data projection**

Create `apps/openclaw-ui/src/lib/navigation/project-editor-route-data.ts`:

```ts
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
}

function findSnapshotForEntity(snapshots: DomainSnapshot[], params: URLSearchParams): DomainSnapshot | undefined {
  const projectId = params.get('projectId');
  const sceneId = params.get('sceneId');
  const shotId = params.get('shotId');
  const assetId = params.get('assetId');

  return snapshots.find((snapshot) => {
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

    return snapshot.project.id === projectId;
  }) ?? snapshots[0];
}

export function buildNavigationPanelFromSnapshots(snapshots: DomainSnapshot[]): NavigationPanel {
  return {
    projectNavigation: snapshots.flatMap((snapshot) =>
      buildNavigationPanelFromSnapshot(snapshot, snapshot.project.id).projectNavigation
    )
  };
}

export function buildProjectEditorRouteData(
  snapshots: DomainSnapshot[],
  url: URL
): ProjectEditorRouteData {
  const params = url.searchParams;
  const selectedEditor = (params.get('editor') ?? 'projects') as SelectedProjectEditor;
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
```

This works because the route data is built inside Svelte after serialization in Task 6, not returned directly from `+page.server.ts`. If this module is used server-side, do not return the function-bearing editor objects from `load()`.

- [ ] **Step 4: Run focused test and commit**

Run:

```bash
npm --prefix apps/openclaw-ui run test -- project-editor-route-data
```

Expected: PASS.

Commit:

```bash
git add apps/openclaw-ui/src/lib/navigation/project-editor-route-data.ts apps/openclaw-ui/src/lib/navigation/project-editor-route-data.test.ts apps/openclaw-ui/src/lib/navigation/adapters/project-edition-adapters.ts
git commit -m "feat(openclaw-ui): project editor route projections"
```

### Task 6: Wire Filesystem Data Into Svelte Routes

**Files:**
- Create: `apps/openclaw-ui/src/lib/components/ProjectEditor.svelte`
- Create: `apps/openclaw-ui/src/lib/components/ProjectEditor.test.ts`
- Modify: `apps/openclaw-ui/src/routes/+layout.server.ts`
- Modify: `apps/openclaw-ui/src/routes/+layout.svelte`
- Modify: `apps/openclaw-ui/src/routes/+page.server.ts`
- Modify: `apps/openclaw-ui/src/routes/+page.svelte`
- Modify: `apps/openclaw-ui/src/app.css`

- [ ] **Step 1: Update e2e expectations first**

In `apps/openclaw-ui/tests/e2e/shell.spec.ts`, add a project click assertion to the first `project-editor-shell` test after the initial `Pilot Project` visibility assertion:

```ts
    await page.getByTestId('nav-project-pilot-project').click();
    await expect(page).toHaveURL(/editor=project/);
    await expect(page.getByTestId('project-editor')).toBeVisible();
    await expect(page.getByTestId('project-editor')).toContainText('Pilot Project');

    await page.getByTestId('nav-projects').click();
    await expect(page).toHaveURL(/editor=projects/);
    await expect(page.getByTestId('projects-editor')).toBeVisible();
```

Then replace the second `project-editor-shell` test name and navigation clicks:

```ts
  test('opens filesystem-backed asset, scene, and shot editors from nested navigation', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('nav-project-pilot-project')).toBeVisible();
    await expect(page.getByTestId('nav-scenes-pilot-project')).toContainText('Scenes');
    await expect(page.getByTestId('nav-assets-pilot-project')).toContainText('Assets');
    await expect(page.getByTestId('nav-asset-category-characters-pilot-project')).toContainText('Characters');
    await expect(page.getByTestId('nav-asset-category-objects-pilot-project')).toContainText('Objects');
    await expect(page.getByTestId('nav-asset-category-locations-pilot-project')).toContainText('Locations');

    await page.getByTestId('nav-asset-asset-nora').click();
    await expect(page).toHaveURL(/editor=asset/);
    const assetEditor = page.getByTestId('asset-editor');
    await expect(assetEditor).toBeVisible();
    await expect(assetEditor.getByRole('heading', { name: 'Nora' })).toBeVisible();
    await expect(assetEditor.getByText('openclaw-projects/pilot-project/assets/characters/asset-nora')).toBeVisible();

    await page.getByTestId('nav-scene-sc001').click();
    await expect(page).toHaveURL(/editor=scene/);
    const sceneEditor = page.getByTestId('scene-editor');
    await expect(sceneEditor).toBeVisible();
    await expect(sceneEditor.getByRole('heading', { name: 'Opening Alley' })).toBeVisible();
    await expect(sceneEditor.getByText('script-main')).toBeVisible();

    await page.getByTestId('nav-shot-sh010').click();
    await expect(page).toHaveURL(/editor=shot/);
    const shotEditor = page.getByTestId('shot-editor');
    await expect(shotEditor).toBeVisible();
    await expect(shotEditor.getByRole('heading', { name: 'Shot 010' })).toBeVisible();
    await expect(shotEditor.getByText('4800 ms')).toBeVisible();
  });
```

- [ ] **Step 2: Run e2e grep and confirm it fails**

Run:

```bash
npm --prefix apps/openclaw-ui run test:e2e -- --grep project-editor-shell
```

Expected: FAIL because the nested filesystem navigation is not rendered yet.

- [ ] **Step 3: Write the failing ProjectEditor component test**

Create `apps/openclaw-ui/src/lib/components/ProjectEditor.test.ts`:

```ts
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import ProjectEditor from './ProjectEditor.svelte';
import type { ProjectEdition } from '$lib/types/navigation/projectEdition/editor';

describe('ProjectEditor', () => {
  it('renders the selected project contract', () => {
    const project: ProjectEdition = {
      editorUrl: '/?editor=project&projectId=pilot-project',
      name: 'Pilot Project',
      projectDescription: 'Filesystem-backed pilot project.',
      addScene: () => undefined,
      addAsset: () => undefined
    };

    const { body } = render(ProjectEditor, {
      props: { project }
    });

    expect(body).toContain('Pilot Project');
    expect(body).toContain('Filesystem-backed pilot project.');
    expect(body).toContain('Add Scene');
    expect(body).toContain('Add Asset');
  });
});
```

Run:

```bash
npm --prefix apps/openclaw-ui run test -- ProjectEditor
```

Expected: FAIL because `ProjectEditor.svelte` does not exist.

- [ ] **Step 4: Implement ProjectEditor**

Create `apps/openclaw-ui/src/lib/components/ProjectEditor.svelte`:

```svelte
<script lang="ts">
  import type { ProjectEdition } from '$lib/types/navigation/projectEdition/editor';

  export let project: ProjectEdition;
</script>

<section class="projects-editor" data-testid="project-editor" aria-labelledby="project-editor-title">
  <header class="projects-editor-header">
    <div>
      <p class="eyebrow">Project</p>
      <h2 id="project-editor-title">{project.name}</h2>
    </div>

    <div class="inline-meta">
      <button type="button" on:click={project.addScene}>Add Scene</button>
      <button type="button" on:click={project.addAsset}>Add Asset</button>
    </div>
  </header>

  <p class="muted">{project.projectDescription}</p>
</section>
```

Run:

```bash
npm --prefix apps/openclaw-ui run test -- ProjectEditor
```

Expected: PASS.

- [ ] **Step 5: Load navigation in layout server**

In `apps/openclaw-ui/src/routes/+layout.server.ts`, add imports:

```ts
import { buildNavigationPanelFromSnapshots } from '$lib/navigation/project-editor-route-data';
import { loadOpenClawProjectSnapshots } from '$lib/server/openclaw-projects';
```

Change `load()` to include project snapshots:

```ts
export async function load() {
  const [runnerCatalog, studio, projectLoad] = await Promise.all([
    loadRunnerCatalog(),
    loadStudioState(),
    loadOpenClawProjectSnapshots({ seedIfMissing: process.env.NODE_ENV !== 'production' })
  ]);

  return {
    runnerCatalog,
    shell: buildProductShell(runnerCatalog.runners),
    studio,
    projectNavigation: buildNavigationPanelFromSnapshots(projectLoad.snapshots),
    projectWarnings: projectLoad.warnings
  };
}
```

- [ ] **Step 6: Render nested navigation in layout**

In `apps/openclaw-ui/src/routes/+layout.svelte`, remove the JSON import and add:

```svelte
  import type { LayoutData } from './$types';

  export let data: LayoutData;

  $: projectNavigation = data.projectNavigation.projectNavigation;

  function searchParam(url: string, key: string): string {
    return new URL(url, 'http://localhost').searchParams.get(key) ?? '';
  }

  function projectId(url: string, name: string): string {
    return searchParam(url, 'projectId') || name.toLowerCase().replaceAll(' ', '-');
  }
```

Replace the flat nav body with nested markup:

```svelte
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

            <section class="nav-branch" data-testid={`nav-scenes-${projectId(project.elementUrl, project.elementName)}`}>
              <div class="nav-section-label">Scenes</div>
              <ul class="nav-tree">
                {#each project.scenesNavigation as scene (scene.elementUrl)}
                  <li>
                    <a class="nav-link nav-link-compact" data-testid={`nav-scene-${searchParam(scene.elementUrl, 'sceneId')}`} href={scene.elementUrl}>
                      <span class="nav-label">{scene.elementName}</span>
                    </a>
                    <section class="nav-branch">
                      <div class="nav-section-label">Shots</div>
                      <ul class="nav-tree">
                        {#each scene.shotsNavigation as shot (shot.elementUrl)}
                          <li>
                            <a class="nav-link nav-link-compact" data-testid={`nav-shot-${searchParam(shot.elementUrl, 'shotId')}`} href={shot.elementUrl}>
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

            <section class="nav-branch" data-testid={`nav-assets-${projectId(project.elementUrl, project.elementName)}`}>
              <div class="nav-section-label">Assets</div>
              <section class="nav-branch" data-testid={`nav-asset-category-characters-${projectId(project.elementUrl, project.elementName)}`}>
                <div class="nav-section-label">Characters</div>
                {#each project.assetsNavigation.charactersNavigation as asset (asset.elementUrl)}
                  <a class="nav-link nav-link-compact" data-testid={`nav-asset-${searchParam(asset.elementUrl, 'assetId')}`} href={asset.elementUrl}>
                    <span class="nav-label">{asset.elementName}</span>
                  </a>
                {/each}
              </section>
              <section class="nav-branch" data-testid={`nav-asset-category-objects-${projectId(project.elementUrl, project.elementName)}`}>
                <div class="nav-section-label">Objects</div>
                {#each project.assetsNavigation.objectsNavigation as asset (asset.elementUrl)}
                  <a class="nav-link nav-link-compact" data-testid={`nav-asset-${searchParam(asset.elementUrl, 'assetId')}`} href={asset.elementUrl}>
                    <span class="nav-label">{asset.elementName}</span>
                  </a>
                {/each}
              </section>
              <section class="nav-branch" data-testid={`nav-asset-category-locations-${projectId(project.elementUrl, project.elementName)}`}>
                <div class="nav-section-label">Locations</div>
                {#each project.assetsNavigation.locationsNavigation as asset (asset.elementUrl)}
                  <a class="nav-link nav-link-compact" data-testid={`nav-asset-${searchParam(asset.elementUrl, 'assetId')}`} href={asset.elementUrl}>
                    <span class="nav-label">{asset.elementName}</span>
                  </a>
                {/each}
              </section>
            </section>
          </li>
        {/each}
      </ul>
```

- [ ] **Step 7: Load serializable snapshots in page server**

In `apps/openclaw-ui/src/routes/+page.server.ts`, replace the current load with:

```ts
import { loadOpenClawProjectSnapshots } from '$lib/server/openclaw-projects';
import { buildSharedBrief, SHELL_PREVIEW_INPUT } from '$lib/server/brief-translator';

export async function load() {
  const projectLoad = await loadOpenClawProjectSnapshots({
    seedIfMissing: process.env.NODE_ENV !== 'production'
  });

  return {
    briefPreview: buildSharedBrief(SHELL_PREVIEW_INPUT),
    projectSnapshots: projectLoad.snapshots,
    projectWarnings: projectLoad.warnings
  };
}
```

- [ ] **Step 8: Build editors from route data in page component**

In `apps/openclaw-ui/src/routes/+page.svelte`, remove `editorContent` and direct JSON mapping. Add `ProjectEditor` and route data imports:

```svelte
  import type { PageData } from './$types';
  import ProjectEditor from '$lib/components/ProjectEditor.svelte';
  import { buildProjectEditorRouteData } from '$lib/navigation/project-editor-route-data';

  export let data: PageData;

  $: routeData = buildProjectEditorRouteData(data.projectSnapshots, $page.url);
  $: projects = routeData.projects;
```

Update the render conditions:

```svelte
{#if routeData.selectedEditor === 'asset' && routeData.selectedAsset}
  <AssetEditor asset={routeData.selectedAsset} />
{:else if routeData.selectedEditor === 'project' && routeData.selectedProject}
  <ProjectEditor project={routeData.selectedProject} />
{:else if routeData.selectedEditor === 'scene' && routeData.selectedScene}
  <SceneEditor scene={routeData.selectedScene} />
{:else if routeData.selectedEditor === 'shot' && routeData.selectedShot}
  <ShotEditor shot={routeData.selectedShot} />
{:else}
  <ProjectsEditor {projects} />
{/if}
```

- [ ] **Step 9: Add nested tree CSS**

In `apps/openclaw-ui/src/app.css`, add:

```css
.nav-tree {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.nav-tree-item {
  display: grid;
  gap: 0.45rem;
}

.nav-branch {
  display: grid;
  gap: 0.35rem;
  margin-left: 0.65rem;
  padding-left: 0.75rem;
  border-left: 1px solid rgba(68, 50, 34, 0.16);
}

.nav-section-label {
  padding: 0.25rem 0.4rem;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nav-link-compact {
  padding: 0.48rem 0.58rem;
  border-radius: 0.5rem;
}
```

- [ ] **Step 10: Run Svelte check and e2e grep**

Run:

```bash
npm --prefix apps/openclaw-ui run check
npm --prefix apps/openclaw-ui run test:e2e -- --grep project-editor-shell
```

Expected: both PASS.

Commit:

```bash
git add apps/openclaw-ui/src/lib/components/ProjectEditor.svelte apps/openclaw-ui/src/lib/components/ProjectEditor.test.ts apps/openclaw-ui/src/routes/+layout.server.ts apps/openclaw-ui/src/routes/+layout.svelte apps/openclaw-ui/src/routes/+page.server.ts apps/openclaw-ui/src/routes/+page.svelte apps/openclaw-ui/src/app.css apps/openclaw-ui/tests/e2e/shell.spec.ts
git commit -m "feat(openclaw-ui): render filesystem project navigation"
```

### Task 7: Final Verification And Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/devplan/UIPlan.md`
- Modify: `docs/devplan/feature-map.md`

- [ ] **Step 1: Document the project root**

In `README.md`, add a short section near UI setup:

```md
### OpenClaw project folders

The UI reads editable project navigation from `OPENCLAW_PROJECTS_DIR`.
If unset, it defaults to `openclaw-projects/` at the repository root.

Each project folder contains `project.json`, `relations.json`, `scenes/`,
and grouped `assets/characters`, `assets/objects`, and `assets/locations`
folders. The relation manifest is the source of truth for scene, shot, and
asset relationships.
```

- [ ] **Step 2: Update devplan docs**

In `docs/devplan/UIPlan.md`, add:

```md
The shell project navigation is filesystem-backed by `OPENCLAW_PROJECTS_DIR`
and defaults to `openclaw-projects/` in the repo root. Asset kind values come
from `apps/openclaw-ui/src/lib/types/project.ts`; navigation contracts do not
define a second asset taxonomy.
```

In `docs/devplan/feature-map.md`, add one bullet under the UI/navigation area:

```md
- Project navigation mirrors `openclaw-projects/<project>/` with scenes,
  shots, and grouped assets, backed by `relations.json`.
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm --prefix apps/openclaw-ui run test
npm --prefix apps/openclaw-ui run check
npm --prefix apps/openclaw-ui run test:e2e -- --grep project-editor-shell
```

Expected: all PASS.

- [ ] **Step 4: Check git diff and commit docs**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; status contains only intended changes plus pre-existing user changes.

Commit:

```bash
git add README.md docs/devplan/UIPlan.md docs/devplan/feature-map.md
git commit -m "docs: document filesystem project navigation"
```
