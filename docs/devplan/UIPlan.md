# UI Plan

## Objetivo

Definir la linea de producto UI del repo con estas reglas estables:

- `SvelteKit` sera la experiencia principal del producto.
- `ComfyUI` queda encapsulado como motor; no como UI principal.
- `Kimodo` se reutiliza casi tal cual, pero embebido bajo el dominio y shell de
  la app.
- `OpenClaw` sigue reutilizando el contrato canonico de `runner`, `run_id`,
  manifiestos, evidencia y cancelacion.
- la UI debe traducir y mejorar el input humano antes de entregarlo a
  consumidores como `ComfyUI`, `Kimodo`, `Blender` o `DaVinci Resolve`.

## Decision de producto

La arquitectura objetivo queda asi:

```text
Persona usuaria
  -> SvelteKit product shell
    -> workspaces por fase del pipeline
    -> server routes / adapters
      -> runner canonico y wrappers existentes
        -> ComfyUI / Kimodo / Blender / Resolve
```

Reglas de UX:

- `ComfyUI` no expone canvas ni UI general en la experiencia principal.
- la UI propia solo muestra: intencion o preset, inputs simplificados,
  progreso, cancelacion, previews intermedios, artefactos finales, evidencia y
  errores legibles
- `Kimodo` se abre en un panel o workspace dedicado y proxied bajo la misma
  app, con contexto alrededor: personaje, shot, asset, estado del pipeline y
  rutas de salida
- `Blender` y `DaVinci Resolve` no necesitan iframe; el MVP puede tratarlos
  como herramientas locales lanzadas o asistidas desde la web con contexto,
  estados y evidencia canonicos

## Decision tecnica

Para no abrir una arquitectura paralela:

- la app web vive como un unico frontend `SvelteKit` en
  `apps/openclaw-ui/`
- las rutas servidoras de `SvelteKit` adaptan HTTP al contrato canonico del
  repo; no crean un segundo runner, manifiesto ni taxonomy de estados
- el storage sigue siendo filesystem-first bajo `STUDIO_DIR`
- los layouts ya canonicos se reutilizan y amplian:
  - `Assets3D/<project>/<entity_id>/...`
  - `Exports/<project>/<shot>/...`
- el catalogo de assets y escenas en MVP debe apoyarse en manifiestos y
  directorios existentes, no en una base de datos nueva
- la capa de traduccion de prompts se vuelve infraestructura compartida de la
  UI, no logica ad hoc por workflow

## Contrato de dominio pipeline-first

La UI y sus adapters deben tratar el modelo de negocio como contrato canónico,
no como tipos locales por workspace. La fuente unica queda en:

- `apps/openclaw-ui/src/lib/types/project.ts`
- `apps/openclaw-ui/src/lib/types/navigation/projectEdition/baseEdition.ts`
- `apps/openclaw-ui/src/lib/types/navigation/projectEdition/sceneEdition.ts`
- `apps/openclaw-ui/src/lib/types/navigation/projectEdition/shotEdition.ts`
- `apps/openclaw-ui/src/lib/types/navigation/projectEdition/applicationServices.ts`

Reglas de arquitectura y logica:

- `Shot` consume assets por referencias (`ShotAssetBinding`) y nunca copia
  payloads completos de asset
- cada entidad de negocio debe poder reportar estado por etapa
  (`StageState`) para habilitar gates automatizados
- cada operacion debe dejar trazabilidad estable (`OperationRef`) y refs de
  artefacto (`ArtifactRef`) bajo rutas canonicas de `STUDIO_DIR`
- la progresion de madurez de asset es secuencial:
  `description -> reference_image -> model_3d -> default_benchmark_animation -> asset_correction_through_benchmark_animation`
- el flujo de produccion de tomas/escenas conserva su progreso operativo:
  `description -> reference_image -> model_3d -> base_animation -> asset_animation -> animation_composition -> composition_render`
- la capa de UI dispara solo eventos de intencion (`UiEventPointer`) con
  payload minimo por `id`; la logica compleja vive en servicios de aplicacion
  (`ProjectApplicationService`, `SceneApplicationService`,
  `ShotApplicationService`, `AssetApplicationService`)
- los servicios de lectura para maqueta o implementacion real deben entrar por
  contratos de consulta explicitos (`ProjectNavigationQueryService`,
  `ProjectEditionQueryService`)
- autoridad operativa unica para estado de escena/asset/shot/proyecto:
  `STUDIO_DIR/Scenes/...`; cualquier `openclaw-projects/...` se trata como
  proyeccion derivada reconciliada automaticamente y no se edita a mano como
  origen primario

Regla UX obligatoria:

- complejidad referencial transparente para la persona usuaria: la UI muestra
  labels, readiness y acciones sugeridas; los `id` y joins quedan en adapters
  y view-models resueltos

Plan de adopcion transversal (tareas cerradas + pendientes):

- [`ui-domain-model-rollout.md`](ui-domain-model-rollout.md)

## Snapshot implementado en `15.1` y validado en `15.2`

La implementacion actual del shell ya deja materializadas estas fronteras:

- overview del producto en `/`
- workspace de escena en `/workspaces/scene`
- workspace de assets en `/workspaces/assets`
- seam embebida de `Kimodo` en `/workspaces/kimodo` con superficie same-origin
  reservada en `/workspaces/kimodo/embed`
- workspace asistido de `Blender` en `/workspaces/blender`
- workspace engine-boundary de `ComfyUI` en `/workspaces/comfyui`
- workspace reservado de `DaVinci Resolve` en `/workspaces/resolve`

La adaptacion `web -> runner canonico` ya queda expuesta desde la propia app
mediante rutas servidoras compartidas:

- `GET /api/runners`
- `GET /api/runners/[runnerId]/targets`
- `POST /api/runs`
- `GET /api/runs/[runnerId]/[runId]`
- `POST /api/runs/[runnerId]/[runId]/cancel`
- `POST /api/briefs`
- `POST /api/briefs/scene`
- `POST /api/scenes/scaffold`

Para `UX-01` (phase `16`) la captura guiada persiste el brief en una ruta
revisable y filesystem-first bajo:

- `STUDIO_DIR/Scenes/<project_id>/<scene_id>/briefs/scene-brief.json`

La prueba browser-backed de `16.2` valida la captura real y persistencia de
esa ruta desde el flujo canonico en `tests/e2e/shell.spec.ts` (`phase16-scene-brief`),
incluyendo `workspace` de escena y `POST /api/briefs/scene`.

La task `16.3` materializa el seam ejecutable de navegacion/edicion con
frontera `query/command` sobre contrato thin UI:

- `apps/openclaw-ui/src/lib/navigation/adapters/project-edition-adapters.ts`
- `apps/openclaw-ui/src/lib/navigation/mocks/in-memory-project-ui-services.ts`

Ese seam se expone de forma minima en el shell (`/`) para iteracion de maqueta
sin backend real y queda validado por la prueba browser-backed
`phase16-ui-contract-mock` en `tests/e2e/shell.spec.ts`.

Para `UX-02` (phase `17`) el shell ahora crea el scaffold canonico desde el
brief guardado en:

- `POST /api/scenes/scaffold`
- `STUDIO_DIR/Scenes/<project_id>/<scene_id>/manifests/scene-storage.json`
- `STUDIO_DIR/Scenes/<project_id>/<scene_id>/manifests/assets.json`
- `STUDIO_DIR/Scenes/<project_id>/<scene_id>/shots/<shot_id>/manifests/shot.json`

La misma accion crea estructura reusable para fases siguientes, reusando
`Assets3D/` y `Exports/` sin abrir una raiz paralela:

- `STUDIO_DIR/Scenes/<project_id>/<scene_id>/assets/{characters,objects}/`
- `STUDIO_DIR/Assets3D/<project_id>/`
- `STUDIO_DIR/Exports/<project_id>/<shot_id>/{blender,comfyui}/...`

La prueba browser-backed de `17.2` valida este flujo desde
`/workspaces/scene` y `POST /api/scenes/scaffold`, comprobando en disco la
creacion real de `scene-storage.json`, `assets.json`, `shot.json` y la
estructura de `Exports/<project>/<shot>/{blender,comfyui}/...`.

Para `UX-04` (phase `19`) el workspace `/workspaces/assets` ya expone el flujo
de referencias encapsulado sobre `comfyui operate`:

- `reference_import`: copia rutas fuente declaradas hacia
  `STUDIO_DIR/Scenes/<project>/<scene>/assets/<kind>/<asset_id>/references/published/`
- `reference_generate`: registra solicitud estructurada en
  `.../references/requests/<run_id>__request.json` con brief traducido desde
  inputs de producto
- feedback de run: estado legible, checkpoints, artefactos y ruta de evidencia
  (`STUDIO_DIR/Validation/comfyui/operate/<run_id>/...`) sin exponer canvas de
  `ComfyUI`

La prueba browser-backed `phase19-asset-references` valida la importacion real
de una referencia desde la UI y confirma persistencia canonica + actualizacion
de etapa `reference_image` para el asset.
La task `19.2` queda cerrada en `pass` con evidencia real en
`STUDIO_DIR/Scenes/.../references/published/` y
`STUDIO_DIR/Validation/comfyui/operate/<run_id>/...`, incluyendo checkpoints
de progreso y preview de artefactos desde la superficie de producto.

Para `UX-05` (phase `20`) el backend canonico ya expone dos targets adicionales
en `comfyui operate` para `asset -> 3D candidate`:

- `asset-3d-import`: importa un modelo 3D existente y publica candidato canonico
  en `STUDIO_DIR/Assets3D/<project>/<asset>/comfyui/output/` con handoff
  preparado en `.../blender/imports/`
- `asset-3d-generate`: registra solicitud estructurada de modelado 3D en
  `.../comfyui/requests/<run_id>__request.json` y deja trazado el output
  esperado del candidato para orquestacion posterior
- feedback de run: estado legible, checkpoints y evidencia de la operacion en
  `STUDIO_DIR/Validation/comfyui/operate/<run_id>/...`

La prueba browser-backed de `15.2` confirma en maquina real que el shell
arranca, navega y consume el contrato canonico sobre estas superficies:

- `/`
- `/workspaces/comfyui`
- `/workspaces/kimodo`
- `/workspaces/kimodo/embed`
- `/api/runners`

Eso mantiene el shell sobre la CLI y el registro canonicos del repo, sin crear
un runner HTTP paralelo.

La provision canonica de dependencias del shell queda separada en:

- `scripts/apps/install-ui-web-deps.sh`
- `OPENCLAW_UI_INSTALL`
- `OPENCLAW_UI_APP_DIR`
- `OPENCLAW_UI_PLAYWRIGHT_BROWSERS_PATH`

Con eso, `SvelteKit`, `npm` y `Playwright` pasan a vivir dentro de la misma
ruta de bootstrap declarativo del repo.

## Flujos UI normalizados

Normalizacion del flujo principal para evitar la numeracion duplicada del
prompt fuente:

| UX ID | Phase | Paso UI | Backend dominante |
| --- | --- | --- | --- |
| `UX-01` | `16` | descripcion de escena | `SvelteKit` + traduccion |
| `UX-02` | `17` | estructura de almacenamiento de escena | filesystem + `OpenClaw` |
| `UX-03` | `18` | catalogacion de assets | manifests + `OpenClaw` |
| `UX-04` | `19` | referencias de assets | `ComfyUI` `operate` (`asset-reference-import` / `asset-reference-generate`) |
| `UX-05` | `20` | importacion o modelado 3D | `Trellis2 GGUF` / `Blender` |
| `UX-06` | `21` | limpieza automatizada de meshes | `Blender` + `Instant Meshes` |
| `UX-07` | `22` | rigging automatizado | `Blender` + `Rigify` |
| `UX-08` | `23` | descripcion de tomas | `SvelteKit` + traduccion |
| `UX-09` | `24` | animacion en Kimodo | `Kimodo` embebido |
| `UX-10` | `25` | aplicacion automatizada de animacion | `Kimodo` + `Blender` |
| `UX-11` | `26` | composicion automatizada de toma | `Blender` |
| `UX-12` | `27` | refinamiento manual de toma | `Blender` asistido |
| `UX-13` | `28` | exportacion de videos base | `Blender` |
| `UX-14` | `29` | imagen inicial desde video base y refs | `ComfyUI` engine |
| `UX-15` | `30` | generacion de tomas | `ComfyUI` engine |
| `UX-16` | `31` | montaje automatizado de tomas | `DaVinci Resolve` |
| `UX-17` | `32` | refinamiento manual de escena | `DaVinci Resolve` |
| `UX-18` | `33` | exportacion final de escena | `DaVinci Resolve` |

## Fases nuevas

| Phase | Enfoque | Dependencias |
| --- | --- | --- |
| `15` | shell principal `SvelteKit`, workspaces y capa comun de traduccion | nueva ruta canonica `install-ui-web-deps.sh` |
| `16` | UI de descripcion de escena | reutiliza phase `15` |
| `17` | scaffolding de almacenamiento de escena | reutiliza phase `15` y `STUDIO_DIR` |
| `18` | catalogo de assets y estados | reutiliza phase `15` y layouts filesystem |
| `19` | referencias de assets con `ComfyUI` encapsulado | reutiliza phases `8` y `15` |
| `20` | importacion/modelado 3D | reutiliza phases `11`, `13`, `15` |
| `21` | cleanup de meshes en UI | reutiliza phase `13` |
| `22` | rigging en UI | reutiliza phase `14` |
| `23` | workspace de descripcion de tomas | reutiliza phase `15` |
| `24` | workspace embebido de `Kimodo` | reutiliza phases `12` y `15` |
| `25` | aplicacion automatizada de animacion | reutiliza phases `14`, `24` |
| `26` | composicion automatizada de toma | reutiliza `Blender` y `Exports/` |
| `27` | refinamiento manual asistido en `Blender` | reutiliza phase `26` |
| `28` | export de video base | nueva auditoria `install-blender-video-export-deps.sh` |
| `29` | imagen inicial desde video base | reutiliza phases `8`, `15`, `28` |
| `30` | generacion de tomas con `ComfyUI` engine | reutiliza phases `8`, `15`, `29` |
| `31` | montaje automatizado en `DaVinci Resolve` | nueva auditoria `install-davinci-resolve-deps.sh` |
| `32` | refinamiento manual asistido en `DaVinci Resolve` | reutiliza phase `31` |
| `33` | export final de escena | reutiliza phase `31` |

## Validation Gate Chain

Esta linea UI debe ejecutarse como pipeline secuencial endurecido. Para
avanzar, la fase siguiente no debe apoyarse solo en planning: debe reutilizar
la evidencia y los artefactos canonicos validados del paso anterior.

Regla operativa:

- el gate minimo de avance es `pass` o `soft_pass_with_fallback` en la task
  `e2e proof` de la fase anterior
- la fase siguiente debe nombrar explicitamente que artefacto validado
  reutiliza
- si una task de dependencias puede adelantarse por conveniencia, eso no cambia
  el gate del flujo UX principal

| Phase | Puede arrancar cuando | Resultado validado que reutiliza |
| --- | --- | --- |
| `15` | sin fase UI previa | shell web y capa comun de adaptacion |
| `16` | `15.2` en `pass` o `soft_pass_with_fallback` | shell web validado |
| `17` | `16.2` en `pass` o `soft_pass_with_fallback` | `scene brief` validado |
| `18` | `17.2` en `pass` o `soft_pass_with_fallback` | scaffold de escena validado |
| `19` | `18.2` en `pass` o `soft_pass_with_fallback` | catalogo de assets validado |
| `20` | `19.2` en `pass` o `soft_pass_with_fallback` | referencias de asset validadas |
| `21` | `20.2` en `pass` o `soft_pass_with_fallback` | candidato 3D validado |
| `22` | `21.2` en `pass` o `soft_pass_with_fallback` | handoff `cleanup/<run_id>/` validado |
| `23` | `22.2` en `pass` o `soft_pass_with_fallback` | estado de personaje y pipeline validado |
| `24` | `23.2` en `pass` o `soft_pass_with_fallback` | `shot brief` validado |
| `25` | `24.2` en `pass` o `soft_pass_with_fallback` | animacion base de `Kimodo` validada |
| `26` | `25.2` en `pass` o `soft_pass_with_fallback` | animacion aplicada validada |
| `27` | `26.2` en `pass` o `soft_pass_with_fallback` | composicion de shot validada |
| `28` | `27.2` en `pass` o `soft_pass_with_fallback` | shot refinado validado |
| `29` | `28.2` en `pass` o `soft_pass_with_fallback` | video base validado |
| `30` | `29.2` en `pass` o `soft_pass_with_fallback` | imagen inicial validada |
| `31` | `30.2` en `pass` o `soft_pass_with_fallback` | tomas generadas validadas |
| `32` | `31.2` en `pass` o `soft_pass_with_fallback` | assembly de escena validado |
| `33` | `32.2` en `pass` o `soft_pass_with_fallback` | refine de escena validado |

## Backend Readiness Review

No todas las fases UI parten de un backend ya implementado como feature
ejecutable del repo. Para que las e2e de UI sean reales y no simuladas, las
fases con backend incompleto deben abrir una tarea backend companera antes de
su prueba end-to-end.

| Phase UI | Estado backend actual | Accion de endurecimiento |
| --- | --- | --- |
| `16-18` | la logica vive en el propio shell web y filesystem del repo | no requiere backend externo nuevo |
| `19` | el runner canonico de `ComfyUI` ya expone `operate` para referencias de assets (`asset-reference-import` y `asset-reference-generate`) | reutilizar task `19.0` como backend base de la UI |
| `20` | existe linea 3D validada, pero no una operacion canonica de producto para `asset -> 3D` | anadir task backend companera |
| `21` | backend ya existe en phase `13` | reutilizar phase `13` |
| `22` | backend ya esta planificado en phase `14`, pero aun no esta cerrado | la UI queda gated por phase `14` |
| `23` | la logica vive en el shell web y manifiestos del repo | no requiere backend externo nuevo |
| `24` | `Kimodo` solo cubre instalacion; falta bridge de embed y contexto | anadir task backend companera |
| `25` | no existe aun bridge canonico `Kimodo -> personaje riggeado` | anadir task backend companera |
| `26` | no existe aun operacion canonica de composicion automatizada en `Blender` | anadir task backend companera |
| `27` | no existe aun bridge canonico de sesion y retorno de estado para refine manual en `Blender` | anadir task backend companera |
| `28` | falta operacion canonica de export base de video, ademas de la ruta de dependencias | anadir task backend companera |
| `29` | `ComfyUI` existe, pero no una operacion canonica de imagen inicial desde video base | anadir task backend companera |
| `30` | `ComfyUI` existe, pero no una operacion canonica de generacion final de shot para producto | anadir task backend companera |
| `31` | no existe aun integracion canonica de `DaVinci Resolve` | anadir task backend companera |
| `32` | no existe aun bridge canonico de refine manual en `DaVinci Resolve` | anadir task backend companera |
| `33` | no existe aun operacion canonica de export final de escena en `DaVinci Resolve` | anadir task backend companera |

## Estimacion de esfuerzo backend

Base objetiva del repo hoy:

- `src/openclaw_studio/runners/registry.py` solo registra `blender`,
  `comfyui` y `hunyuan3d`
- `src/openclaw_studio/runners/comfyui.py` hoy productiza sobre todo la
  validacion `validate_smoke` y ya expone `operate` para referencias de assets
  (`asset-reference-import` y `asset-reference-generate`); el resto de fases UI
  nuevas sigue pendiente de operaciones dedicadas
- `src/openclaw_studio/runners/blender.py` hoy solo cierra
  `cleanup_pre_rig_humanoid`
- `Kimodo` hoy esta provisionado, pero no integrado como bridge o embed de
  producto
- `DaVinci Resolve` todavia no tiene integracion canonica en el repo

Lectura de esfuerzo para estimar el avance real de la UI:

| Bucket | Phases | Lectura de esfuerzo |
| --- | --- | --- |
| `Bajo` | `16-18`, `23` | mayormente UI, manifests y traduccion sobre infraestructura ya canonica |
| `Medio` | `19`, `20`, `24`, `27` | hace falta cerrar una operacion o bridge nuevo, pero reutilizando backends ya instalados |
| `Alto` | `25`, `26`, `28`, `29`, `30` | requiere contratos nuevos entre herramientas, outputs canonicos y pruebas e2e reales con artefactos |
| `Muy alto` | `31-33` | falta toda la linea canonica de `DaVinci Resolve`: dependencias, bridge, estado de sesion, assembly y export final |

Resumen practico:

- el MVP UI puede arrancar solido por `15 -> 18` sin esperar toda la
  infraestructura pesada
- el primer cuello real de backend aparece en `19-20`, donde `ComfyUI` y la
  linea 3D todavia necesitan operaciones de producto dedicadas
- el segundo cuello aparece en `24-30`, donde hay que cerrar handoffs reales
  entre `Kimodo`, `Blender` y `ComfyUI`
- el bloque mas incierto y costoso hoy es `31-33` por la ausencia total de una
  ruta canonica para `DaVinci Resolve`

## Checkpoints de feedback

La UI debe emitir feedback visible y legible, como minimo, en estos puntos:

- generacion o importacion de referencias de assets
- modelado o importacion 3D de assets
- cleanup pre-rigging
- rigging humanoide
- descripciones de shot aceptadas
- animacion base de `Kimodo`
- aplicacion de animacion al personaje
- composicion automatizada en `Blender`
- export de video base
- imagen inicial
- generacion final de toma
- assembly y export en `DaVinci Resolve`

## Fuera del MVP inicial

Quedan fuera de esta linea de fases inicial:

- sintesis de dialogo
- sincronizacion de audio y video
- efectos de sonido
- storyboard
- video con imagen inicial y final usando `Wan2.2`
- flujos automatizados con `GIMP` e `Inkscape`

## Artefactos del plan

- `docs/devplan/01-phase-index.md`
- `docs/devplan/feature-map.md`
- `docs/devplan/tasks/15.*` a `docs/devplan/tasks/33.*`
- `docs/devplan/ui-domain-model-rollout.md`
