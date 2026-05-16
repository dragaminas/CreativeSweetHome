# OpenClaw Projects Navigation Design

## Goal

Make the product shell navigation reflect the real project folder structure, using `openclaw-projects` as the filesystem-backed source of truth for projects, scenes, shots, assets, and their relationships.

## Current Context

The shell sidebar in `apps/openclaw-ui/src/routes/+layout.svelte` is currently flat and reads `apps/openclaw-ui/src/lib/data/project-editor-content.json` directly. The repo already has a stronger UI boundary in `apps/openclaw-ui/src/lib/types/navigation/projectNavigation`, `ProjectUiServices`, `DomainSnapshot`, adapter helpers, and an in-memory seam. The implementation should reuse those contracts instead of adding a second UI domain model.

The current code has two asset taxonomies: `AssetType` in `navigation/projectEdition/assetEdition.ts` and `AssetKind` in `apps/openclaw-ui/src/lib/types/project.ts`. That duplication should be removed. The project domain model is the source of truth for asset kinds, and navigation should keep only user-facing editor and navigator contracts.

The implementation should normalize asset typing first:

```ts
export type AssetKind = 'character' | 'object' | 'location';
```

`navigation/projectEdition/assetEdition.ts` should import `AssetKind` from `types/project.ts` instead of defining its own `AssetType` enum. Location assets should use the same domain kind as characters and objects when they appear in navigation, editor contracts, relation manifests, and filesystem manifests.

The existing `Location` interface may remain in `types/project.ts` only for location-specific metadata such as zones, constraints, and layout artifacts. It must not create a separate navigation taxonomy. A navigable location is an asset with `kind: 'location'`; specialized location metadata can be resolved by matching the same id in `locations` when needed.

## Environment And Default Root

Add a server-side projects root setting:

```text
OPENCLAW_PROJECTS_DIR=/absolute/path/to/openclaw-projects
```

If the variable is absent or empty, the default is:

```text
<repoRoot>/openclaw-projects
```

This root is resolved on the server through the existing `resolveRepoContext()` flow in `apps/openclaw-ui/src/lib/server/env.ts`. The UI should not read from `process.env` directly.

## Filesystem Layout

Each project lives in a folder under `openclaw-projects`:

```text
openclaw-projects/
  pilot-project/
    project.json
    relations.json
    scenes/
      sc001/
        scene.json
        shots/
          sh010/
            shot.json
          sh020/
            shot.json
    assets/
      characters/
        asset-nora/
          asset.json
      objects/
      locations/
        loc-alley/
          asset.json
```

`project.json` stores project identity, display name, description, and top-level ordering. `scene.json`, `shot.json`, and `asset.json` store the editable metadata needed to build `SceneEdition`, `ShotEdition`, and `AssetEditor` projections. Empty category folders are valid and should still render category headers.

Locations are stored under `assets/locations/<id>/asset.json` for navigation and editing consistency. Their manifests use the same `AssetKind` field as characters and objects:

```json
{
  "id": "loc-alley",
  "name": "Rainy Alley",
  "kind": "location"
}
```

If existing scene storage emits richer `locations` metadata, the loader maps that metadata onto the same location asset id without creating a second navigation entity.

## Relation Manifest

Each project has one relation manifest at:

```text
openclaw-projects/<projectId>/relations.json
```

The manifest is the source of truth for cross-entity relationships. It prevents the UI from inferring semantic relationships only from folder names.

Initial shape:

```json
{
  "schemaVersion": 1,
  "projectId": "pilot-project",
  "sceneOrder": ["sc001"],
  "assetOrder": {
    "characters": ["asset-nora"],
    "objects": [],
    "locations": ["loc-alley"]
  },
  "scenes": {
    "sc001": {
      "shotOrder": ["sh010", "sh020"],
      "assetIds": ["asset-nora", "loc-alley"],
      "locationIds": ["loc-alley"]
    }
  },
  "shots": {
    "sh010": {
      "sceneId": "sc001",
      "assetIds": ["asset-nora", "loc-alley"]
    },
    "sh020": {
      "sceneId": "sc001",
      "assetIds": []
    }
  },
  "assets": {
    "asset-nora": {
      "kind": "character",
      "sceneIds": ["sc001"],
      "shotIds": ["sh010"]
    },
    "loc-alley": {
      "kind": "location",
      "sceneIds": ["sc001"],
      "shotIds": ["sh010"]
    }
  }
}
```

The loader validates that referenced entities exist. Missing references do not crash the shell; they are omitted from navigation and surfaced as warnings in server logs or a future diagnostics area.

## Navigation Projection

The sidebar renders this hierarchy:

```text
Projects
  Pilot Project
    Scenes
      Opening Alley
        Shots
          Shot 010
          Shot 020
    Assets
      Characters
        Nora
      Objects
      Locations
        Rainy Alley
```

Click behavior:

```text
Projects -> /?editor=projects
Project -> /?editor=project&projectId=<projectId>
Scene -> /?editor=scene&projectId=<projectId>&sceneId=<sceneId>
Shot -> /?editor=shot&projectId=<projectId>&sceneId=<sceneId>&shotId=<shotId>
Asset -> /?editor=asset&projectId=<projectId>&assetId=<assetId>
```

The projection should remain aligned with `apps/openclaw-ui/src/lib/types/navigation/projectNavigation`. The implementation may refine the existing interfaces so that `AssetNavigation` follows the same `Navigator` shape as scenes and shots, and so assets can be grouped by `characters`, `objects`, and `locations`.

Navigation contracts should depend on domain types where they need domain categories. For example, asset navigation grouping can use `AssetKind` from `types/project.ts`, but should not define a separate enum or duplicate the allowed values in the navigation folder.

## Data Flow

1. Server resolves `OPENCLAW_PROJECTS_DIR` or defaults to `<repoRoot>/openclaw-projects`.
2. Server loads project manifests and relation manifests from disk.
3. Loader builds a canonical `DomainSnapshot` and adapts it through the existing `ProjectUiServices` query contracts.
4. `+layout.server.ts` provides the navigation panel to `+layout.svelte`.
5. `+page.server.ts` or a shared query helper loads the selected editor view model by URL search params.
6. `+layout.svelte` renders only the navigation tree and delegates editor content to the page slot.

The browser should receive serializable view models, not filesystem paths or Node APIs.

## Error Handling

If `openclaw-projects` does not exist, the server creates or seeds a minimal `pilot-project` fixture only in development/test contexts. In production-like contexts, it returns an empty `Projects` tree with a clear message rather than failing the shell.

If a project folder is malformed, the loader skips that project and records the reason. If an individual scene, shot, or asset manifest is malformed, the loader omits only that entity and keeps the rest of the navigation usable.

If `relations.json` is missing, the loader can derive a conservative relation manifest from folder order for first-run compatibility, then write the manifest only when explicitly scaffolding or saving project changes. Passive navigation reads should avoid surprising filesystem writes.

## Testing Strategy

Unit tests cover:

- Asset type normalization: `navigation` imports `AssetKind` from `types/project.ts` and no longer exports a separate `AssetType`.
- `OPENCLAW_PROJECTS_DIR` resolution and default `<repoRoot>/openclaw-projects`.
- Filesystem fixture loading into navigation hierarchy.
- Relation manifest validation and omission of missing references.
- Asset grouping into `Characters`, `Objects`, and `Locations`.
- Editor query selection for project, scene, shot, and asset URLs.

Svelte/component tests cover:

- Nested navigation markup renders the expected tree and links.
- Empty asset categories remain visible.

Playwright covers:

- Visiting `/` shows `Projects > Pilot Project > Scenes > Opening Alley > Shots > Shot 010`.
- Clicking a scene, shot, and asset opens the expected editor in the right panel.
- The default project root works without setting `OPENCLAW_PROJECTS_DIR`.

## Out Of Scope

This design does not add full project creation workflows, drag-and-drop reordering, concurrent edit locking, a database, or a dedicated location editor. It only establishes the filesystem-backed project tree, relation manifest, and editor navigation path.
