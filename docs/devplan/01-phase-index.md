# Phase Index

Plantillas para abrir nuevas fases o tareas:
[prompt-templates.md](prompt-templates.md)

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
