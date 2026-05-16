# Plan de Implementacion del Modelo de Dominio UI

## Objetivo

Traducir el contrato de dominio definido en
`apps/openclaw-ui/src/lib/types/project.ts` a la ejecucion real del DevPlan UI
(`phases 15-33`), sin abrir modelos paralelos por workspace o por backend.

## Decisiones canonicas de logica de negocio

- modelo normalizado y referencial:
  `Project -> Scene -> Shot -> AssetDefinition/Location` sin duplicar payloads
  pesados en `Shot`
- `Shot` mantiene solo binding referencial de assets (`assetId`, role, etapa
  requerida y refs de artefactos)
- cada entidad de pipeline publica estado por etapa (`StageState`) para
  habilitar gates de automatizacion legibles
- cada paso automatizado debe producir trazabilidad estable:
  `OperationRef` + `ArtifactRef` + evidencia en rutas canonicas
- las etapas son progresivas y no opcionales en happy path:
  `description -> reference_image -> model_3d -> base_animation -> asset_animation -> animation_composition -> composition_render`

## Contrato tecnico canonico

Fuente unica de tipos:

- `apps/openclaw-ui/src/lib/types/project.ts`
- `apps/openclaw-ui/src/lib/types/navigation/projectEdition/baseEdition.ts`
- `apps/openclaw-ui/src/lib/types/navigation/projectEdition/sceneEdition.ts`
- `apps/openclaw-ui/src/lib/types/navigation/projectEdition/shotEdition.ts`
- `apps/openclaw-ui/src/lib/types/navigation/projectEdition/applicationServices.ts`

Tipos base esperados por fases UI:

- entidades: `Project`, `Script`, `Scene`, `Shot`, `AssetDefinition`, `Location`
- trazabilidad: `OperationRef`, `ArtifactRef`
- estado: `StageState`, `PipelineStage`, `ShotStage`, `SceneStage`, `ProjectStage`
- handoff de toma: `ShotAssetBinding`

Contratos de interaccion UI esperados por fases UI:

- eventos UI tipados por comando minimo e identificador (`UiEventPointer`)
- trazabilidad explicita de destino por servicio (`@service` y `target`)
- separacion de lectura y escritura en contratos de aplicacion:
  - queries: `ProjectNavigationQueryService`, `ProjectEditionQueryService`
  - commands: `ProjectApplicationService`, `SceneApplicationService`,
    `ShotApplicationService`, `AssetApplicationService`

## Review de tareas UI ya cerradas

Estado tomado de `docs/devplan/task-status-index.md` (fecha de lectura:
`2026-05-15`).

| Task | Estado | Lectura para el modelo |
| --- | --- | --- |
| `15.1`, `15.1.1`, `15.2` | `done` | base del shell y rutas API lista; se reutiliza como capa de orquestacion del contrato de dominio |
| `16.2` | `done` | confirma persistencia real de `scene brief`; se conserva como evidencia de entrada `description` |
| `17.1`, `17.2` | `done` | confirma scaffold y manifests iniciales; se conserva como base de identidad para `Scene/Shot` |

Accion de ajuste sobre tareas cerradas:

- no reabrirlas por refactor masivo
- cuando se toque codigo relacionado, migrar payloads/manifests al contrato
  `project.ts` por compatibilidad incremental

## Review de tareas UI pendientes y traduccion al plan

### Bloque A: identidad y madurez de assets (`18-22`)

Tareas impactadas:

- `18.1`, `18.2`, `19.0`, `19.1`, `19.2`, `20.0`, `20.1`, `20.2`, `21.1`,
  `21.2`, `22.1`, `22.2`

Regla de implementacion:

- estas tareas son dueñas de poblar `AssetDefinition.pipeline[]`,
  `AssetDefinition.operations[]` y `AssetDefinition.artifacts[]`
- cada corrida debe promover una etapa o reportar `blocked/failed` con
  evidencia
- no introducir taxonomias de estado ad hoc por workspace

### Bloque B: authoring y ejecucion de toma (`23-30`)

Tareas impactadas:

- `23.1`, `23.2`, `24.0`, `24.1`, `24.2`, `25.0`, `25.1`, `25.2`, `26.0`,
  `26.1`, `26.2`, `27.0`, `27.1`, `27.2`, `28.0`, `28.1`, `28.1.1`, `28.2`,
  `29.0`, `29.1`, `29.2`, `30.0`, `30.1`, `30.2`

Regla de implementacion:

- `Shot` se activa por `ShotAssetBinding[]` referencial; nunca copiando assets
- cada paso de compose/render debe registrar `Shot.pipeline[]`,
  `Shot.operations[]` y `Shot.artifacts[]`
- `ScriptBeat` debe enlazar la intencion narrativa con `sceneId/shotIds`
  antes de generar o renderizar

### Bloque C: ensamblado y entrega de escena (`31-33`)

Tareas impactadas:

- `31.0`, `31.1`, `31.1.1`, `31.2`, `32.0`, `32.1`, `32.2`, `33.0`, `33.1`,
  `33.2`

Regla de implementacion:

- consolidar estado a nivel `Scene.pipeline[]` y `Project.pipeline[]`
- export final solo cuando `SceneStage.final_scene_export` alcance `ready`
  o `soft_pass_with_fallback` equivalente documentado por runner

## Criterios de adopcion obligatorios por task nueva o pendiente

- usar `apps/openclaw-ui/src/lib/types/project.ts` como contrato de entrada y
  salida de negocio en UI/server adapters
- publicar refs de artefactos y operaciones con IDs estables, no solo strings
  sueltos de ruta
- reforzar tests para validar transiciones de etapa y prerequisitos
- mantener `filesystem-first` y rutas canonicas ya vigentes (`Scenes/`,
  `Assets3D/`, `Exports/`)

## Patron UI anti "tela de arana" referencial

- internamente: modelo referencial normalizado
- externamente: view-models denormalizados y legibles
- no mostrar IDs crudos como decision primaria de interfaz
- cada selector de UI debe incluir contexto minimo: label, estado y bloqueo
- cuando falte un prerequisito, mostrar accion siguiente concreta en vez de
  solo error tecnico

## Notas de reconciliacion de estado

- existe inconsistencia operativa (`16.1` pendiente con `16.2` done). Esta
  inconsistencia no invalida el modelo; debe resolverse al actualizar el
  estado real de tareas de implementacion.

## Documentos canonicos sincronizados por esta decision

- `docs/devplan/UIPlan.md`
- `docs/devplan/01-phase-index.md`
- `docs/devplan/feature-map.md`
- `docs/architecture/runner-interface.md`
- `docs/SAD.md`
