# Phase Index

Plantillas para abrir nuevas fases o tareas:
[prompt-templates.md](prompt-templates.md)

Indice canonico de estado por tarea:
[task-status-index.md](task-status-index.md)

## Phase 0: Fundacion del repo

### Status
`done`

### Purpose
Definir la base reproducible del repo: estructura, convenciones, configuracion
central y primeros scripts comunes.

### Current Decision
La configuracion declarativa del proyecto parte de `.env` y scripts
idempotentes.

### Stable Artifacts
- [`../../.env.example`](../../.env.example)
- [`../../scripts/lib/common.sh`](../../scripts/lib/common.sh)

### Reusable Infrastructure Produced
- convenciones de scripts y codigos de salida
- base de configuracion declarativa

### Open Tasks
- Ninguna

## Phase 1: Hardening del sistema anfitrion

### Status
`done`

### Purpose
Reducir superficie de riesgo del host antes de operar el runtime creativo de
forma diaria.

### Current Decision
El runtime debe operar como usuario no privilegiado y con discos sensibles
fuera del flujo normal.

### Stable Artifacts
- [`../security/disks-and-automount.md`](../security/disks-and-automount.md)
- [`../security/runtime-user-hardening.md`](../security/runtime-user-hardening.md)
- [`../../scripts/hardening/check-user.sh`](../../scripts/hardening/check-user.sh)
- [`../../scripts/hardening/check-mounts.sh`](../../scripts/hardening/check-mounts.sh)

### Reusable Infrastructure Produced
- checks de usuario, grupos, discos, montajes y GNOME

### Open Tasks
- [`1.2`](tasks/1.2-runtime-user-hardening.md): cerrar el hardening del usuario runtime y su evidencia documental

## Phase 2: Bootstrap de OpenClaw

### Status
`done`

### Purpose
Instalar `OpenClaw` y dejarlo operativo de forma reproducible desde el propio
repo.

### Current Decision
El bootstrap converge el estado del sistema desde `.env` y scripts del repo.

### Stable Artifacts
- [`../../scripts/bootstrap/apply-workstation.sh`](../../scripts/bootstrap/apply-workstation.sh)
- [`../operations/bootstrap.md`](../operations/bootstrap.md)

### Reusable Infrastructure Produced
- provision declarativa de `OpenClaw`
- diagnostico operativo base

### Open Tasks
- Ninguna

## Phase 3: Integracion de aplicaciones creativas

### Status
`done`

### Purpose
Conectar el runtime con Blender, `ComfyUI` y wrappers pensados para uso seguro.

### Current Decision
Las aplicaciones creativas se exponen por wrappers locales controlados, no por
acceso shell general.

### Stable Artifacts
- [`../../scripts/apps/blender.sh`](../../scripts/apps/blender.sh)
- [`../../scripts/apps/comfyui.sh`](../../scripts/apps/comfyui.sh)
- [`../../plugins/studio-actions/index.js`](../../plugins/studio-actions/index.js)

### Reusable Infrastructure Produced
- wrappers de apps
- plugin local `studio-actions`

### Open Tasks
- Ninguna

## Phase 4: Capa de acciones seguras

### Status
`done`

### Purpose
Traducir mensajes de WhatsApp a acciones locales seguras y acotadas.

### Current Decision
La capa segura debe interceptar primero, exigir wake word y evitar shell libre.

### Stable Artifacts
- [`../architecture/actions.md`](../architecture/actions.md)
- [`../../plugins/studio-actions/index.js`](../../plugins/studio-actions/index.js)

### Reusable Infrastructure Produced
- catalogo de acciones seguras
- parser de wake word y bloqueo silencioso

### Open Tasks
- Ninguna

## Phase 5: Experiencia sin consola

### Status
`done`

### Purpose
Hacer operable la workstation sin depender de terminal para uso cotidiano.

### Current Decision
La experiencia diaria se apoya en accesos `.desktop`, servicios de usuario y
documentacion operativa corta.

### Stable Artifacts
- [`../operations/daily-use.md`](../operations/daily-use.md)
- [`../operations/admin-maintenance.md`](../operations/admin-maintenance.md)
- [`../../configs/desktop/README.md`](../../configs/desktop/README.md)

### Reusable Infrastructure Produced
- accesos directos administrativos
- scripts de servicios de usuario

### Open Tasks
- Ninguna

## Phase 6: Respaldo, restauracion y actualizaciones

### Status
`done`

### Purpose
Mantener el sistema recuperable y actualizable sin perder el enfoque
reproducible.

### Current Decision
Backup, restore y update forman parte del stack operativo del repo, no de un
procedimiento externo.

### Stable Artifacts
- [`../../scripts/openclaw/backup.sh`](../../scripts/openclaw/backup.sh)
- [`../../scripts/openclaw/restore.sh`](../../scripts/openclaw/restore.sh)
- [`../../scripts/openclaw/update.sh`](../../scripts/openclaw/update.sh)

### Reusable Infrastructure Produced
- ciclo basico de backup y restore
- update auditable

### Open Tasks
- Ninguna

## Phase 7: Validacion integral

### Status
`done`

### Purpose
Confirmar el caso de uso final del sistema completo en la maquina objetivo.

### Current Decision
La aceptacion del stack exige evidencia operativa real, no solo checks
unitarios.

### Stable Artifacts
- [`../operations/acceptance.md`](../operations/acceptance.md)

### Reusable Infrastructure Produced
- checklist de aceptacion y evidencia final

### Open Tasks
- Ninguna

## Phase 8: Productizacion de workflows ComfyUI para imagen y video

### Status
`active`

### Purpose
Cerrar la capa operativa de imagen y video en `ComfyUI` con workflows locales,
runner canonico y exposicion segura.

### Current Decision
El runner de `ComfyUI` y la biblioteca `openclaw-workflows` son la base unica
para smoke, operacion y futura validacion rica.

### Stable Artifacts
- [`../comfyui/interface.md`](../comfyui/interface.md)
- [`../architecture/runner-interface.md`](../architecture/runner-interface.md)
- [`../comfyui/whatsapp-comfyui-extension.md`](../comfyui/whatsapp-comfyui-extension.md)
- [`../comfyui/general-video-render-workflow.md`](../comfyui/general-video-render-workflow.md)

### Reusable Infrastructure Produced
- runner canonico `comfyui`
- biblioteca de workflows visibles en `ComfyUI`
- smoke validation y bridge por WhatsApp

### Open Tasks
- [`8.18`](tasks/8.18-comfyui-atomic-composed-validation-results.md): ejecutar y publicar la validacion atomica/compuesta con evidencia real

## Phase 9: MVP 3D en ComfyUI con SF3D

### Status
`paused`

### Purpose
Conservar el valor reutilizable de la linea `SF3D` sin seguir tratandola como
ruta principal de producto.

### Current Decision
`SF3D` queda como benchmark historico y la lectura de escenas sigue abierta solo
como gap documental y de evidencia.

### Stable Artifacts
- [`../comfyui/3d-io-contract.md`](../comfyui/3d-io-contract.md)
- [`../comfyui/3d-blender-bridge.md`](../comfyui/3d-blender-bridge.md)
- [`../comfyui/general-3d-object-workflow-results.md`](../comfyui/general-3d-object-workflow-results.md)

### Reusable Infrastructure Produced
- taxonomia `UC-3D-*`
- handoff canonico a `Blender`
- validaciones 3D sobre `ComfyUI`

### Open Tasks
- [`9.11.3`](tasks/9.11.3-scene-validation-results.md): cerrar o bloquear formalmente la evidencia real de escenas

## Phase 10: Linea 3D nativa con Hunyuan3D

### Status
`archived`

### Purpose
Conservar el material reusable de la etapa `Hunyuan3D` sin seguir tratandolo
como alcance activo del repo.

### Current Decision
`Hunyuan3D` queda como legado historico y referencia tecnica. La ruta 3D
vigente del repo pasa a leerse desde la fase `11` con `Trellis2 GGUF`.

### Stable Artifacts
- [`../hunyuan3d/installation.md`](../hunyuan3d/installation.md)
- [`../hunyuan3d/native-runtime-architecture.md`](../hunyuan3d/native-runtime-architecture.md)
- [`../hunyuan3d/runner-integration.md`](../hunyuan3d/runner-integration.md)
- [`../../src/openclaw_studio/runners/hunyuan3d.py`](../../src/openclaw_studio/runners/hunyuan3d.py)

### Reusable Infrastructure Produced
- runner nativo `hunyuan3d`
- smoke validation propia
- integracion con `Blender` y catalogo de flujos

### Open Tasks
- Ninguna

## Phase 11: Reapertura 3D en ComfyUI con Trellis2 GGUF

### Status
`done`

### Purpose
Consolidar `Trellis2 GGUF` como ruta 3D vigente del repo dentro de un runtime
`ComfyUI` aislado, manteniendo la operacion reproducible.

### Current Decision
`Trellis2 GGUF` es la linea 3D vigente del repo. `UC-3D-*` ya apunta al
baseline local de Trellis dentro de `ComfyUI`, mientras `Hunyuan3D` y `SF3D`
quedan retenidos solo como referencias historicas.

### Stable Artifacts
- [`../comfyui/trellis2-gguf-interface.md`](../comfyui/trellis2-gguf-interface.md)
- [`../comfyui/trellis2-gguf-validation-results.md`](../comfyui/trellis2-gguf-validation-results.md)
- [`../../scripts/apps/install-trellis2-gguf.sh`](../../scripts/apps/install-trellis2-gguf.sh)
- [`archive/phase-11-trellis2-summary.md`](archive/phase-11-trellis2-summary.md)

### Reusable Infrastructure Produced
- runtime aislado de laboratorio
- prepare-layout y preflight reproducibles
- codigos de salida `0` y `10-14`

### Open Tasks
- Ninguna

## Phase 12: Integracion de Kimodo para diseno de movimiento

### Status
`done`

### Purpose
Incorporar `Kimodo` como herramienta local de diseno de movimiento sin abrir
otra ruta de instalacion fuera del bootstrap declarativo del repo.

### Current Decision
`Kimodo` queda integrado al bootstrap declarativo mediante
`scripts/apps/install-kimodo.sh`, con baseline `source` sobre el upstream
oficial `nv-tlabs/kimodo`, alternativa `package` para uso black-box y la
variante del gist de `Aero-Ex` retenida solo como nota experimental.

### Stable Artifacts
- [`../../scripts/apps/install-kimodo.sh`](../../scripts/apps/install-kimodo.sh)
- [`../kimodo/installation.md`](../kimodo/installation.md)
- [`../../scripts/bootstrap/apply-workstation.sh`](../../scripts/bootstrap/apply-workstation.sh)
- [`../../scripts/bootstrap/show-config.sh`](../../scripts/bootstrap/show-config.sh)

### Reusable Infrastructure Produced
- flags declarativas `KIMODO_*` en `.env`
- instalador idempotente `audit/apply`
- documentacion canonica para baseline oficial y compatibilidad experimental

### Open Tasks
- Ninguna

## Phase 13: Cleanup 3D pre-rigging con Blender e Instant Meshes

### Status
`active`

### Purpose
Preparar modelos humanoides 3D generados por AI para una etapa posterior de
rigging mediante una cadena reproducible y beginner-friendly:
`OpenClaw -> Blender cleanup -> Instant Meshes`.

### Current Decision
La orquestacion debe entrar por un unico entrypoint canonico del contrato de
runner. `Blender` en background hace import, cleanup conservador, validacion y
export; `Instant Meshes` remalla como etapa separada; el rigging posterior
queda fuera del alcance de esta fase.

### Stable Artifacts
- [`../architecture/runner-interface.md`](../architecture/runner-interface.md)
- [`../../scripts/actions/runner-action.sh`](../../scripts/actions/runner-action.sh)
- [`../../scripts/apps/blender.sh`](../../scripts/apps/blender.sh)
- [`../../scripts/apps/install-3d-pre-rig-deps.sh`](../../scripts/apps/install-3d-pre-rig-deps.sh)
- [`../../scripts/apps/instant-meshes.sh`](../../scripts/apps/instant-meshes.sh)
- [`../../src/openclaw_studio/runners/blender.py`](../../src/openclaw_studio/runners/blender.py)
- [`../operations/blender.md`](../operations/blender.md)
- [`../operations/3d-pre-rig-cleanup.md`](../operations/3d-pre-rig-cleanup.md)
- [`../comfyui/3d-blender-bridge.md`](../comfyui/3d-blender-bridge.md)

### Reusable Infrastructure Produced
- contrato canonico de orquestacion por runner reutilizable para backends DCC
- wrapper local de `Blender` e `Instant Meshes` integrados al repo
- script canonico de instalacion y audit para dependencias de host de phase `13`
- hook declarativo al bootstrap central para dependencias de cleanup pre-rig
- `inputs` y `options` estructurados en el entrypoint canonico de runner
- helper reusable de Blender background para cleanup conservador
- convenciones de handoff 3D y rutas base en `Assets3D`

### First Slice
- `OpenClaw` debe ser la unica UX y capa de orquestacion: seleccion de
  archivos, `run_id`, estados, evidencia y modo `auto` o `debug`
- `Blender` background Python debe hacer import, cleanup conservador,
  validacion y export
- `Instant Meshes` debe ejecutarse como etapa separada de remeshing antes del
  handoff siguiente
- el cleanup `v1` debe cubrir: aplicar transforms de escala y rotacion,
  centrar personaje, apoyar el punto mas bajo en `Z=0`, recalcular normales,
  remover loose geometry cuando sea seguro, detectar y permitir remover
  flotantes muy pequenos, unir piezas solo con justificacion, reducir
  poligonos solo por encima de un umbral conservador, exportar a `Instant
  Meshes` y recolectar la salida remesheada
- la evidencia minima debe incluir modelos before/after, logs de comando y un
  cleanup report simple; la aceptacion no requiere un rig perfecto

### Open Tasks
- [`13.3`](tasks/13.3-phase13-e2e-proof.md): ejecutar la prueba end-to-end
  real de la fase `13` con dependencias instaladas, input humanoide y
  evidencia revisable

## Phase 14: Rigging humanoide automatizado con Blender y Rigify

### Status
`active`

### Purpose
Definir una ruta local, gratuita y Linux-first para que un usuario principiante
pueda pasar de un humanoide ya `cleaned/remeshed` a un modelo riggeado
mediante una accion simple de `OpenClaw`, con `Blender` ejecutando el trabajo
real en background.

### Current Decision
La fase depende del handoff preparado por la fase `13`. `OpenClaw` debe seguir
siendo la unica capa de orquestacion y UX mediante el entrypoint canonico del
contrato de runner; `Blender` background Python debe resolver import,
metarig/armature, activacion de `Rigify`, generacion del rig, pesos,
validacion basica y export. El primer slice queda fijado con `Rigify` bundled
en `Blender` mas `Armature Deform With Automatic Weights`; no se justifica
anadir otro helper libre al camino core hasta que la prueba real de la fase
demuestre un bloqueo repetible. Herramientas pagas, Windows-only o web-only
pueden servir solo como comparativa, no como ruta core.

### Stable Artifacts
- [`../architecture/runner-interface.md`](../architecture/runner-interface.md)
- [`../../scripts/actions/runner-action.sh`](../../scripts/actions/runner-action.sh)
- [`../../scripts/apps/blender.sh`](../../scripts/apps/blender.sh)
- [`../operations/blender.md`](../operations/blender.md)
- [`../comfyui/3d-blender-bridge.md`](../comfyui/3d-blender-bridge.md)

### Reusable Infrastructure Produced
- decision documentada para la ruta gratuita de rigging humanoide Linux-first
- baseline del primer slice: `Rigify` + auto weights + export local
- contrato reutilizable de handoff `cleanup -> rigging`
- contrato futuro `prepared humanoid -> create rig -> validate -> export`
- script canonico `install-3d-rigging-deps.sh` con audit de `Rigify`, export y
  preview render
- plan de validacion automatica de deformaciones para personajes humanoides
- reporting beginner-friendly y criterios de diagnostico/fallback

### First Slice
- `OpenClaw` debe seguir siendo la unica UX: el usuario aporta un humanoide ya
  preparado y solo necesita una accion simple como `Create rig`
- la entrada obligatoria de la fase es el output `cleaned/remeshed` de la fase
  `13`, sin abrir otro pipeline paralelo de preparacion
- `Blender` background Python debe hacer import, activacion de `Rigify`,
  generacion del rig, asignacion de pesos con `automatic weights`, validacion
  y export
- la validacion automatica debe cubrir al menos: levantar brazos, doblar
  codos, doblar rodillas, rotar cabeza e inclinar torso
- la salida debe incluir evidencia revisable y feedback legible para
  principiantes sin exigir UI de `Blender`

### Planned Breakdown
- resolver la ruta de `dependency installation/audit` de la fase como tarea
  hoja dedicada, no como prose dentro del planning
- registrar una futura operacion canonica tipo `create_rig_humanoid` bajo el
  runner `blender`, sin abrir una CLI ad hoc paralela
- preparar el futuro script canonico `scripts/apps/install-3d-rigging-deps.sh`
  y su hook declarativo al bootstrap, auditando `Blender`, disponibilidad o
  activacion de `Rigify` y helpers adicionales solo si el gate real lo exige
- usar el output `cleaned/remeshed` y la evidencia de la fase `13` como input
  obligatorio del handoff, no como nota informal
- ejecutar una prueba end-to-end real como gate explicito antes de marcar la
  fase como `done`
- fijar criterios de `pass`, `soft_pass_with_fallback`, `fail_quality` y
  `blocked_*` para rigging humanoide automatico

### Open Tasks
- [`14.2`](tasks/14.2-phase14-e2e-proof.md): reservar y ejecutar despues la
  prueba end-to-end real de la fase `14` como gate de cierre

## Phase 15: Producto UI web con SvelteKit y workspaces embebidos

### Status
`done`

### Purpose
Convertir la UI web en la experiencia principal del producto sin duplicar el
contrato canonico de `runner`, estados, evidencia o layout de artefactos.

### Current Decision
`SvelteKit` sera el shell de producto; `ComfyUI` queda encapsulado como motor y
`Kimodo` se reutiliza casi tal cual dentro de un workspace embebido. La capa
web debe traducir prompts y descripciones humanas hacia contratos consumibles
por `ComfyUI`, `Kimodo`, `Blender` y futuros backends sin exponer sus UIs
internas como experiencia primaria.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../architecture/runner-interface.md`](../architecture/runner-interface.md)
- [`../comfyui/interface.md`](../comfyui/interface.md)
- [`../kimodo/installation.md`](../kimodo/installation.md)
- [`../../scripts/apps/install-ui-web-deps.sh`](../../scripts/apps/install-ui-web-deps.sh)
- [`../../apps/openclaw-ui/`](../../apps/openclaw-ui/)

### Reusable Infrastructure Produced
- shell unico de `SvelteKit` en `apps/openclaw-ui/`
- capa comun `web -> server routes -> runner contract`
- traductor compartido de prompts y briefs por consumidor
- feedback reutilizable de progreso, cancelacion, evidencia y errores legibles

### Open Tasks
- Ninguna

## Decision transversal UI (`phases 16-33`)

### Status
`active`

### Purpose
Alinear todas las tareas UI (pendientes y ya cerradas) con un unico contrato de
negocio orientado a pipeline para evitar modelos paralelos por fase o backend.

### Current Decision
El contrato canonico de dominio UI queda centralizado en:
`apps/openclaw-ui/src/lib/types/project.ts` y su capa de interaccion UI en
`apps/openclaw-ui/src/lib/types/navigation/projectEdition/`, con enfoque
normalizado y referencial (`Project`, `Scene`, `Shot`, `AssetDefinition`,
`Location`) y trazabilidad explicita por `OperationRef` y `ArtifactRef`.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`ui-domain-model-rollout.md`](ui-domain-model-rollout.md)
- [`../architecture/runner-interface.md`](../architecture/runner-interface.md)
- [`../SAD.md`](../SAD.md)
- [`../../apps/openclaw-ui/src/lib/types/project.ts`](../../apps/openclaw-ui/src/lib/types/project.ts)
- [`../../apps/openclaw-ui/src/lib/types/navigation/projectEdition/baseEdition.ts`](../../apps/openclaw-ui/src/lib/types/navigation/projectEdition/baseEdition.ts)
- [`../../apps/openclaw-ui/src/lib/types/navigation/projectEdition/sceneEdition.ts`](../../apps/openclaw-ui/src/lib/types/navigation/projectEdition/sceneEdition.ts)
- [`../../apps/openclaw-ui/src/lib/types/navigation/projectEdition/shotEdition.ts`](../../apps/openclaw-ui/src/lib/types/navigation/projectEdition/shotEdition.ts)
- [`../../apps/openclaw-ui/src/lib/types/navigation/projectEdition/applicationServices.ts`](../../apps/openclaw-ui/src/lib/types/navigation/projectEdition/applicationServices.ts)

### Reusable Infrastructure Produced
- contrato de estado por etapas con `StageState`
- gating uniforme de automation por `PipelineStage`, `ShotStage`, `SceneStage`
- contratos UI thin de `view + events`, con punteros explicitos de `@service`
  y payloads minimos por `id`
- separacion formal `query/command` para maquetas UI y backend real
- pauta de adopcion incremental para tareas `done` y `pending` en `15-33`

### Open Tasks
- aplicar este contrato en cada task pendiente de `18` a `33`
- migrar incrementalmente payloads legacy cuando se toque codigo de tasks ya
  cerradas (`15`, `16.2`, `17.*`)

## Phase 16: Descripcion de escena en UI

### Status
`done`

### Purpose
Abrir la entrada principal del pipeline como una experiencia guiada para
describir escenas en lenguaje natural sin exigir prompts expertos.

### Current Decision
La fase debe capturar intencion, tono, personajes, objetos y restricciones de
produccion en un `scene brief` estructurado. La UI debe mejorar la descripcion
humana antes de derivarla a consumidores finales.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../comfyui/usecases.md`](../comfyui/usecases.md)
- [`../architecture/runner-interface.md`](../architecture/runner-interface.md)

### Reusable Infrastructure Produced
- workspace guiado de `scene brief`
- contrato canonico `scene brief -> translated consumer inputs`
- checkpoints de feedback legible para brief aceptado, incompleto o ambiguo
- prueba browser-backed `phase16-scene-brief` sobre `tests/e2e/shell.spec.ts`
  con persistencia real en `STUDIO_DIR/Scenes/.../briefs/scene-brief.json`
- adapters de contrato UI thin (`DomainSnapshot -> NavigationPanel/Edition views`)
  en `src/lib/navigation/adapters/project-edition-adapters.ts`
- implementacion deterministic `in-memory` de `ProjectUiServices` en
  `src/lib/navigation/mocks/in-memory-project-ui-services.ts`
- prueba browser-backed `phase16-ui-contract-mock` sobre
  `tests/e2e/shell.spec.ts` para validar query/command seams desde el shell

### Open Tasks
- Ninguna

## Phase 17: Estructura automatizada de almacenamiento de escena

### Status
`done`

### Purpose
Crear desde la UI el scaffold filesystem-first de una escena sin abrir otra
raiz de trabajo fuera de `STUDIO_DIR`.

### Current Decision
La estructura de escena debe ampliar los layouts ya canonicos como
`Assets3D/` y `Exports/`, generando carpetas y manifiestos base de forma
reproducible desde una accion de producto.
La autoridad operativa queda en `STUDIO_DIR/Scenes/...`; `openclaw-projects`
se conserva como proyeccion derivada reconciliada para navegacion y
compatibilidad, no como segunda fuente manual.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../comfyui/blender-bridge.md`](../comfyui/blender-bridge.md)
- [`../../scripts/openclaw/setup-workspace.sh`](../../scripts/openclaw/setup-workspace.sh)

### Reusable Infrastructure Produced
- scaffold canonico `scene -> assets -> shots -> exports`
- manifiestos iniciales de escena y shot
- feedback de creacion y colisiones de estructura
- ruta canonica `POST /api/scenes/scaffold`
- manifests base:
  `Scenes/<project>/<scene>/manifests/scene-storage.json`,
  `Scenes/<project>/<scene>/manifests/assets.json`,
  `Scenes/<project>/<scene>/shots/<shot>/manifests/shot.json`
- estructura de handoff inicial para `Exports/<project>/<shot>/{blender,comfyui}`
- prueba browser-backed `phase17-scaffold` sobre `tests/e2e/shell.spec.ts`
  con validacion en disco de manifiestos y directorios de export bajo
  `STUDIO_DIR`

### Open Tasks
- Ninguna

## Phase 18: Catalogacion de assets en UI

### Status
`active`

### Purpose
Permitir que la UI catalogue personajes y objetos como entidades reutilizables
del pipeline sin introducir una base de datos paralela en el MVP.

### Current Decision
El catalogo debe seguir siendo filesystem-first y manifest-driven, con estados,
tags y evidencia sobre layouts ya existentes de `Assets3D/` y futuros
directorios de referencias.
La madurez de asset usa pipeline de 5 etapas (hasta benchmark/correccion),
mientras el pipeline de 7 etapas queda para desarrollo de tomas/escenas.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../comfyui/3d-blender-bridge.md`](../comfyui/3d-blender-bridge.md)
- [`../architecture/runner-interface.md`](../architecture/runner-interface.md)
- [`../../apps/openclaw-ui/src/lib/server/asset-catalog.ts`](../../apps/openclaw-ui/src/lib/server/asset-catalog.ts)
- [`../../apps/openclaw-ui/src/routes/api/assets/+server.ts`](../../apps/openclaw-ui/src/routes/api/assets/+server.ts)
- [`../../apps/openclaw-ui/src/routes/workspaces/assets/+page.svelte`](../../apps/openclaw-ui/src/routes/workspaces/assets/+page.svelte)

### Reusable Infrastructure Produced
- catalogo de assets basado en manifiestos
- estados de asset legibles por la UI
- separacion explicita entre madurez de asset y progreso de tomas/escenas
- feedback de readiness para pasos posteriores
- API REST para CRUD de assets
- sincronizacion del indice relacional `assets.json` con los catalogos
  `character/object` para evitar doble verdad de relaciones

### Open Tasks
- [`18.1`](tasks/18.1-ui-asset-catalog.md): implementar el catalogo de
  personajes y objetos dentro del shell web — `done`
- [`18.2`](tasks/18.2-phase18-e2e-proof.md): probar una alta y actualizacion
  real de assets con evidencia revisable — `done`

## Phase 19: Referencias de assets con ComfyUI encapsulado

### Status
`active`

### Purpose
Exponer en la UI la generacion o importacion de referencias de assets sin
mostrar el canvas ni la UI general de `ComfyUI`.

### Current Decision
La UI debe exponer presets, inputs simplificados, progreso, previews
intermedios, artefactos finales y errores legibles, mientras `ComfyUI` opera
como engine detras del contrato canonico. El backend base de fase queda en
`comfyui operate` con `asset-reference-import` y
`asset-reference-generate`.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../comfyui/interface.md`](../comfyui/interface.md)
- [`../comfyui/usecases.md`](../comfyui/usecases.md)

### Reusable Infrastructure Produced
- panel de referencias con presets e import mixto
- traductor `asset brief -> prompt/tool inputs`
- feedback canonico para referencias aceptadas o fallidas

### Open Tasks
- [`19.0`](tasks/19.0-backend-comfyui-asset-reference-operation.md): cerrar la
  operacion backend canonica para referencias de assets antes de la e2e UI
  — `done`
- [`19.1`](tasks/19.1-ui-asset-reference-images.md): implementar la capa UI de
  referencias con `ComfyUI` completamente encapsulado
- [`19.2`](tasks/19.2-phase19-e2e-proof.md): probar una corrida real de
  referencias con evidencia y cancelacion

## Phase 20: Importacion o modelado 3D de assets en UI

### Status
`pending`

### Purpose
Llevar a la UI el paso `asset brief -> importado/modelado 3D` reutilizando la
linea 3D vigente del repo.

### Current Decision
La UI debe orquestar handoff hacia `Trellis2 GGUF` o importacion local sin
crear otro pipeline 3D paralelo. Los resultados deben publicarse bajo
`Assets3D/` con evidencia consistente.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../comfyui/trellis2-gguf-interface.md`](../comfyui/trellis2-gguf-interface.md)
- [`../comfyui/3d-blender-bridge.md`](../comfyui/3d-blender-bridge.md)

### Reusable Infrastructure Produced
- panel de import/modeling 3D guiado
- contracto `asset -> 3D candidate -> evidence`
- checkpoints de calidad para asset usable o proxy

### Open Tasks
- [`20.0`](tasks/20.0-backend-asset-3d-operation.md): cerrar la operacion
  backend canonica `asset -> 3D` antes de la e2e UI
- [`20.1`](tasks/20.1-ui-asset-3d-import-or-modeling.md): implementar la
  integracion UI con la ruta 3D vigente del repo
- [`20.2`](tasks/20.2-phase20-e2e-proof.md): probar un asset real hasta el
  resultado 3D publicado bajo `Assets3D/`

## Phase 21: Cleanup automatizado de meshes en UI

### Status
`pending`

### Purpose
Consumir la fase `13` desde la UI como un paso guiado y visible para personas
no tecnicas.

### Current Decision
La UI solo debe orquestar el target canonico de cleanup pre-rigging, mostrar
antes/despues, progreso, evidencia y diagnosticos legibles; no una CLI ni un
runner paralelo.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../operations/3d-pre-rig-cleanup.md`](../operations/3d-pre-rig-cleanup.md)
- [`../architecture/runner-interface.md`](../architecture/runner-interface.md)

### Reusable Infrastructure Produced
- panel de cleanup con evidencia before/after
- feedback de readiness para rigging
- handoff canonico desde asset catalog hacia `cleanup/<run_id>/`

### Open Tasks
- [`21.1`](tasks/21.1-ui-mesh-cleanup-integration.md): integrar en la UI el
  runner de cleanup de la fase `13`
- [`21.2`](tasks/21.2-phase21-e2e-proof.md): probar una corrida real de
  cleanup desde la UI hasta evidencia publicada

## Phase 22: Rigging automatizado de assets en UI

### Status
`pending`

### Purpose
Consumir la fase `14` desde la UI como una accion simple de `Create rig` con
diagnostico legible y sin requerir `Blender UI`.

### Current Decision
La UI debe depender del handoff `cleaned/remeshed` de la fase `21` y reflejar
estados, previews, warnings y evidencia del target canonico de rigging.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../operations/blender.md`](../operations/blender.md)
- [`../architecture/runner-interface.md`](../architecture/runner-interface.md)

### Reusable Infrastructure Produced
- panel de rigging con criterios `pass` y `soft_pass_with_fallback`
- feedback legible de deformaciones basicas
- handoff canonico `cleanup -> rigging`

### Open Tasks
- [`22.1`](tasks/22.1-ui-rigging-integration.md): integrar en la UI el futuro
  target canonico de rigging humanoide
- [`22.2`](tasks/22.2-phase22-e2e-proof.md): probar una corrida real de
  rigging desde la UI hasta evidencia revisable

## Phase 23: Descripcion de tomas en UI

### Status
`pending`

### Purpose
Traducir la escena y sus assets listos a una capa de authoring de tomas guiada
para la persona usuaria.

### Current Decision
La fase debe producir `shot briefs` estructurados, conectados al estado de la
escena, de los assets y del pipeline, listos para animacion y composicion.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../comfyui/blender-bridge.md`](../comfyui/blender-bridge.md)
- [`../architecture/runner-interface.md`](../architecture/runner-interface.md)

### Reusable Infrastructure Produced
- workspace de shot brief
- traductor `shot brief -> inputs de animacion/composicion`
- feedback de consistencia entre escena, shot y assets

### Open Tasks
- [`23.1`](tasks/23.1-ui-shot-description-workspace.md): implementar la
  captura guiada de tomas dentro del shell de producto
- [`23.2`](tasks/23.2-phase23-e2e-proof.md): probar la creacion real de una
  toma conectada a una escena y assets existentes

## Phase 24: Animacion de personajes en Kimodo embebido

### Status
`pending`

### Purpose
Reutilizar `Kimodo` casi tal cual como herramienta de authoring de motion,
embebida dentro del dominio y workspace del producto.

### Current Decision
`Kimodo` debe abrirse en un panel dedicado, proxied por la app, con contexto
alrededor: personaje, shot, asset, pipeline state y rutas de salida. La UI no
debe reimplementar su authoring si la UI nativa ya resuelve bien timeline y
constraints.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../kimodo/installation.md`](../kimodo/installation.md)
- [`../architecture/runner-interface.md`](../architecture/runner-interface.md)

### Reusable Infrastructure Produced
- workspace embebido de `Kimodo`
- contrato de contexto `shot + character + output paths`
- feedback de animacion base y checkpoints de guardado/publicacion

### Open Tasks
- [`24.0`](tasks/24.0-backend-kimodo-embedded-context-bridge.md): cerrar el
  bridge backend de embed y contexto de `Kimodo` antes de la e2e UI
- [`24.1`](tasks/24.1-kimodo-embedded-shot-animation-workspace.md): implementar
  el panel embebido de `Kimodo` y el paso de contexto canonico
- [`24.2`](tasks/24.2-phase24-e2e-proof.md): probar una sesion real de
  animacion en `Kimodo` dentro del shell web

## Phase 25: Aplicacion automatizada de animacion a personajes

### Status
`pending`

### Purpose
Conectar el output de `Kimodo` con la aplicacion automatizada de animacion
sobre personajes riggeados dentro del pipeline canonico.

### Current Decision
La UI debe orquestar el handoff `Kimodo -> Blender rigged character`, publicar
evidencia del binding o bake y ofrecer diagnosticos legibles de exito o
problemas de aplicacion.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../operations/blender.md`](../operations/blender.md)
- [`../kimodo/installation.md`](../kimodo/installation.md)

### Reusable Infrastructure Produced
- contrato `kimodo output -> rigged character -> applied animation`
- feedback de aplicacion, bake y warnings de compatibilidad
- handoff canonico para composicion de shot

### Open Tasks
- [`25.0`](tasks/25.0-backend-animation-apply-bridge.md): cerrar el bridge
  backend `Kimodo -> personaje riggeado` antes de la e2e UI
- [`25.1`](tasks/25.1-ui-animation-application-to-characters.md): implementar
  la orquestacion UI de aplicacion automatizada de animacion
- [`25.2`](tasks/25.2-phase25-e2e-proof.md): probar la aplicacion real de una
  animacion a un personaje riggeado

## Phase 26: Composicion automatizada de toma en Blender

### Status
`pending`

### Purpose
Llevar a la UI el paso automatizado que prepara una toma en `Blender` usando
shot brief, personajes animados y assets listos.

### Current Decision
La composicion debe publicar salidas bajo `Exports/<project>/<shot>/blender/`
y seguir el bridge `Blender -> ComfyUI` ya documentado.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../comfyui/blender-bridge.md`](../comfyui/blender-bridge.md)
- [`../operations/blender.md`](../operations/blender.md)

### Reusable Infrastructure Produced
- panel de composicion automatizada
- evidencia de shot construido y exports intermedios
- handoff canonico hacia refinamiento o export base

### Open Tasks
- [`26.0`](tasks/26.0-backend-blender-shot-composition-operation.md): cerrar la
  operacion backend canonica de composicion automatizada antes de la e2e UI
- [`26.1`](tasks/26.1-ui-blender-shot-composition.md): implementar la
  orquestacion UI de composicion automatizada en `Blender`
- [`26.2`](tasks/26.2-phase26-e2e-proof.md): probar la composicion real de una
  toma hasta `Exports/.../blender/`

## Phase 27: Refinamiento manual de toma en Blender

### Status
`pending`

### Purpose
Dar a la persona usuaria un paso asistido de refinamiento manual en `Blender`
sin romper el seguimiento canonico del pipeline.

### Current Decision
La UI debe lanzar o asistir el refinamiento local de `Blender`, mostrar
contexto, checklist y estado, y recoger evidencia de regreso; no intentar
simular la UI completa de `Blender` en web.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../operations/blender.md`](../operations/blender.md)
- [`../comfyui/blender-bridge.md`](../comfyui/blender-bridge.md)

### Reusable Infrastructure Produced
- workspace asistido de refinamiento manual
- checklist y estado de refinamiento por shot
- handoff canonico hacia export base de video

### Open Tasks
- [`27.0`](tasks/27.0-backend-blender-refine-session-bridge.md): cerrar el
  bridge backend de sesion y retorno de estado para refine manual antes de la
  e2e UI
- [`27.1`](tasks/27.1-ui-blender-shot-manual-refinement.md): implementar el
  paso asistido de refinamiento manual en `Blender`
- [`27.2`](tasks/27.2-phase27-e2e-proof.md): probar un refinamiento real con
  retorno de estado y evidencia a la UI

## Phase 28: Exportacion de videos base de tomas

### Status
`pending`

### Purpose
Volver verificable desde la UI la exportacion de videos base que alimentan el
render final y los pasos de `ComfyUI`.

### Current Decision
La fase debe auditar la ruta real de export de `Blender`, codecs y previews, y
publicar artefactos base bajo `Exports/<project>/<shot>/blender/`.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../comfyui/blender-bridge.md`](../comfyui/blender-bridge.md)
- [`../operations/blender.md`](../operations/blender.md)

### Reusable Infrastructure Produced
- export base reproducible de shot
- auditoria canonica de video export para `Blender`
- feedback de frames, video base y errores de codec o render

### Open Tasks
- [`28.0`](tasks/28.0-backend-blender-base-video-export-operation.md): cerrar
  la operacion backend canonica de export base de video antes de la e2e UI
- [`28.1`](tasks/28.1-ui-base-video-export.md): implementar la capa UI de
  export base de video de toma
- [`28.1.1`](tasks/28.1.1-phase28-dependency-installation.md): cerrar la ruta
  canonica de auditoria para video export y codecs de `Blender`
- [`28.2`](tasks/28.2-phase28-e2e-proof.md): probar una exportacion real de
  video base y su evidencia revisable

## Phase 29: Imagen inicial desde video base y referencias

### Status
`pending`

### Purpose
Exponer como paso de producto la generacion de imagen inicial a partir del
video base y referencias sin mostrar la UI general de `ComfyUI`.

### Current Decision
La UI debe consumir los exports base del shot, aplicar traduccion de prompts y
presentar solo presets, inputs, progreso, previews y evidencia final.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../comfyui/interface.md`](../comfyui/interface.md)
- [`../comfyui/blender-bridge.md`](../comfyui/blender-bridge.md)

### Reusable Infrastructure Produced
- panel de imagen inicial basado en shot
- contrato `base video + refs -> initial image`
- feedback de previews y aceptacion de imagen semilla

### Open Tasks
- [`29.0`](tasks/29.0-backend-comfyui-initial-image-operation.md): cerrar la
  operacion backend canonica de imagen inicial antes de la e2e UI
- [`29.1`](tasks/29.1-ui-initial-image-from-base-video.md): implementar la UI
  de imagen inicial con `ComfyUI` completamente encapsulado
- [`29.2`](tasks/29.2-phase29-e2e-proof.md): probar una corrida real de imagen
  inicial a partir de un shot exportado

## Phase 30: Generacion de tomas con ComfyUI como engine

### Status
`pending`

### Purpose
Convertir la generacion final de tomas en una capa de producto propia, usando
`ComfyUI` solo como motor.

### Current Decision
La UI no debe mostrar canvas ni UI general. Debe exponer solo presets,
parametros simplificados, progreso, cancelacion, previews intermedios,
artefactos finales, evidencia y errores legibles.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../comfyui/interface.md`](../comfyui/interface.md)
- [`../comfyui/general-video-render-workflow.md`](../comfyui/general-video-render-workflow.md)

### Reusable Infrastructure Produced
- panel canonico de shot generation
- contracto `shot package -> render outputs -> evidence`
- feedback legible para corridas largas y cancelables

### Open Tasks
- [`30.0`](tasks/30.0-backend-comfyui-shot-generation-operation.md): cerrar la
  operacion backend canonica de generacion final de shot antes de la e2e UI
- [`30.1`](tasks/30.1-ui-shot-generation-with-comfyui-engine.md): implementar
  la experiencia final de generacion de tomas con `ComfyUI` encapsulado
- [`30.2`](tasks/30.2-phase30-e2e-proof.md): probar una toma real generada
  desde el shell web con evidencia publicada

## Phase 31: Montaje automatizado de tomas en DaVinci Resolve

### Status
`pending`

### Purpose
Introducir una ruta canonica para montaje automatizado en `DaVinci Resolve`
desde la UI principal.

### Current Decision
La fase debe tratar `DaVinci Resolve` como backend local con audit y bridge
propios. La UI debe orquestar el montaje sin depender de pasos manuales
ocultos ni de un layout de evidencia paralelo.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../architecture/runner-interface.md`](../architecture/runner-interface.md)
- [`../comfyui/blender-bridge.md`](../comfyui/blender-bridge.md)

### Reusable Infrastructure Produced
- auditoria canonica de `DaVinci Resolve` y scripting local
- contrato `shot outputs -> resolve assembly`
- feedback legible de assembly y errores de host/licencia

### Open Tasks
- [`31.0`](tasks/31.0-backend-davinci-resolve-assembly-bridge.md): cerrar el
  bridge backend de assembly antes de la e2e UI
- [`31.1`](tasks/31.1-ui-davinci-resolve-automated-assembly.md): implementar
  la capa UI y bridge de assembly automatizado en `DaVinci Resolve`
- [`31.1.1`](tasks/31.1.1-phase31-dependency-installation.md): cerrar la ruta
  canonica de auditoria o integracion local de `DaVinci Resolve`
- [`31.2`](tasks/31.2-phase31-e2e-proof.md): probar un montaje real de tomas
  con evidencia revisable

## Phase 32: Refinamiento manual de escena en DaVinci Resolve

### Status
`pending`

### Purpose
Asistir desde la UI el refinamiento manual de escena en `DaVinci Resolve`
sin perder trazabilidad del pipeline.

### Current Decision
La UI debe abrir o asistir el workspace de `Resolve`, reflejar contexto,
checklist y estado, y recuperar evidencia de vuelta al pipeline.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../architecture/runner-interface.md`](../architecture/runner-interface.md)
- [`../comfyui/blender-bridge.md`](../comfyui/blender-bridge.md)

### Reusable Infrastructure Produced
- workspace asistido de refinamiento en `Resolve`
- checklist y estado de refine por escena
- handoff canonico hacia export final

### Open Tasks
- [`32.0`](tasks/32.0-backend-davinci-resolve-refine-session-bridge.md):
  cerrar el bridge backend de refine manual antes de la e2e UI
- [`32.1`](tasks/32.1-ui-davinci-resolve-manual-scene-refinement.md):
  implementar el paso asistido de refinamiento manual en `Resolve`
- [`32.2`](tasks/32.2-phase32-e2e-proof.md): probar un refine real con retorno
  de estado y evidencia a la UI

## Phase 33: Exportacion final de escena

### Status
`pending`

### Purpose
Cerrar el pipeline de producto con una exportacion final de escena visible,
evidenciable y repetible desde la UI.

### Current Decision
La UI debe orquestar el export final sobre la misma integracion de `Resolve`,
publicar artefactos en una ruta canonica y devolver un resumen legible de
resultado.

### Stable Artifacts
- [`UIPlan.md`](UIPlan.md)
- [`../architecture/runner-interface.md`](../architecture/runner-interface.md)
- [`../comfyui/blender-bridge.md`](../comfyui/blender-bridge.md)

### Reusable Infrastructure Produced
- export final de escena con evidencia revisable
- contrato `resolve scene -> final delivery`
- feedback de export, errores y artefactos listos para entrega

### Open Tasks
- [`33.0`](tasks/33.0-backend-davinci-resolve-final-export-operation.md):
  cerrar la operacion backend canonica de export final antes de la e2e UI
- [`33.1`](tasks/33.1-ui-final-scene-export.md): implementar el paso UI de
  exportacion final de escena
- [`33.2`](tasks/33.2-phase33-e2e-proof.md): probar una exportacion final real
  con artefactos y resumen revisables
