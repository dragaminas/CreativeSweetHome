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
`active`

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
`done`

### Purpose
Sustituir la ruta 3D principal por una linea nativa mas clara de operar y con
mejor lectura de producto.

### Current Decision
`Hunyuan3D` es la ruta 3D operativa actual por defecto; `SF3D` queda en
`legacy`.

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
`active`

### Purpose
Evaluar si `Trellis2 GGUF` mejora de forma suficiente la calidad 3D para
promocionarse sin romper la operacion estable ya lograda con `Hunyuan3D`.

### Current Decision
Existe `go_tecnico_trellis_q4_textured`, pero todavia faltan comparativa
formal, gates y politica de promocion/fallback.

### Stable Artifacts
- [`../comfyui/trellis2-gguf-interface.md`](../comfyui/trellis2-gguf-interface.md)
- [`../comfyui/trellis2-gguf-validation-results.md`](../comfyui/trellis2-gguf-validation-results.md)
- [`../../scripts/apps/install-trellis2-gguf.sh`](../../scripts/apps/install-trellis2-gguf.sh)

### Reusable Infrastructure Produced
- runtime aislado de laboratorio
- prepare-layout y preflight reproducibles
- codigos de salida `0` y `10-14`

### Open Tasks
- [`11.6`](tasks/11.6-trellis2-comparative-run.md): comparativa local con fixture historico e imagen creativa
- [`11.7`](tasks/11.7-trellis2-blender-import-metrics.md): import Blender y metricas de mesh
- [`11.8`](tasks/11.8-trellis2-visual-comparison.md): comparativa visual formal
- [`11.9`](tasks/11.9-trellis2-go-no-go-decision.md): decision `go/no-go` con evidencia final
- [`11.10.4`](tasks/11.10.4-trellis2-installation-docs.md): documentar instalacion, prerequisitos, artefactos y troubleshooting
- [`11.11.1`](tasks/11.11.1-trellis2-quality-gate.md): gate minimo de calidad
- [`11.11.2`](tasks/11.11.2-trellis2-operational-gate.md): gate operativo de preflight
- [`11.11.3`](tasks/11.11.3-trellis2-default-promotion.md): promocion a default
- [`11.11.4`](tasks/11.11.4-trellis2-hunyuan-fallback.md): fallback automatico a `Hunyuan3D`
- [`11.11.5`](tasks/11.11.5-trellis2-rollback.md): rollback explicito sin downtime
