# SAD

## Proposito

Describir la arquitectura actual de la workstation `OpenClaw` tal como existe
hoy en el repo: bootstrap declarativo, runtime de `OpenClaw`, capa segura de
acciones, contrato canonico de runners y backends creativos activos.

## Alcance actual

El sistema soporta hoy estas capacidades operativas:

- instalacion y convergencia del host a partir de `.env`
- servicios `systemd --user` para `OpenClaw` y `ComfyUI`
- plugin local `studio-actions` para WhatsApp
- wrappers seguros para Blender y `ComfyUI`
- runner canonico para validaciones y operaciones de `ComfyUI`
- linea 3D actual basada en `Trellis2 GGUF` dentro de un runtime `ComfyUI`
  aislado
- instalacion opcional de `Kimodo` como backend local de motion design
- artefactos `Hunyuan3D` retenidos solo como referencia historica y legado
  tecnico

No es un historial del proyecto. La evolucion por fases vive en
[devplan](devplan/01-phase-index.md) y sus [resumenes de archive](devplan/archive/).

## Contexto del sistema

```text
WhatsApp / CLI / futuras UIs
        |
        v
OpenClaw + plugin studio-actions
        |
        v
registro canonico de runners y wrappers seguros
        |
        +--> Blender
        +--> ComfyUI
        +--> runtime 3D Trellis2 GGUF
        +--> Kimodo
```

## Componentes y limites

### Host y bootstrap

El host Linux es el primer limite de seguridad y de operacion. El bootstrap
debe poder converger desde `.env` sin depender de pasos manuales largos.

Piezas canonicas:

- `.env.example`
- [operations/bootstrap.md](operations/bootstrap.md)
- `scripts/bootstrap/apply-workstation.sh`
- `scripts/doctor/openclaw-status.sh`
- `scripts/doctor/workstation-health.sh`

Responsabilidades:

- validar precondiciones
- endurecer usuario, discos y GNOME
- instalar o actualizar `OpenClaw`
- preparar el workspace creativo
- orquestar dependencias creativas habilitadas por `.env` desde scripts del repo
- provisionar servicios de usuario
- instalar o regenerar `ComfyUI`
- instalar opcionalmente `Kimodo`

### Runtime de OpenClaw y `studio-actions`

`OpenClaw` corre como usuario no privilegiado y recibe mensajes del canal
enlazado. El plugin local `studio-actions` intercepta comandos seguros antes
de que el mensaje llegue al agente general.

Piezas canonicas:

- `plugins/studio-actions/index.js`
- [architecture/actions.md](architecture/actions.md)
- [operations/whatsapp.md](operations/whatsapp.md)

Responsabilidades:

- exigir wake word
- aceptar solo canales autorizados
- enrutar a wrappers o runners conocidos
- consumir en silencio mensajes de WhatsApp sin wake word
- no exponer shell arbitrario

### Contrato de runners y evidencia

Las operaciones con ciclo de vida, `run_id`, estado, evidencia y cancelacion no
deben vivir en un canal ad hoc. Deben pasar por el contrato canonico de
runner.

Piezas canonicas:

- [architecture/runner-interface.md](architecture/runner-interface.md)
- `src/openclaw_studio/runners/contracts.py`
- `src/openclaw_studio/runners/registry.py`
- `scripts/actions/runner-action.sh`

Responsabilidades:

- describir runners y targets
- lanzar corridas con `run_id` estable
- publicar estados y resultados
- reutilizar la misma estructura de evidencia entre CLI, WhatsApp y futuras UIs

### Dominio de negocio UI pipeline-first

La capa UI de producto (`SvelteKit`) debe operar con un modelo de negocio
normalizado, referencial y orientado a etapas de pipeline, no con tipos ad hoc
por ruta o workspace.

Piezas canonicas:

- `apps/openclaw-ui/src/lib/types/project.ts`
- `apps/openclaw-ui/src/lib/types/navigation/projectEdition/baseEdition.ts`
- `apps/openclaw-ui/src/lib/types/navigation/projectEdition/sceneEdition.ts`
- `apps/openclaw-ui/src/lib/types/navigation/projectEdition/shotEdition.ts`
- `apps/openclaw-ui/src/lib/types/navigation/projectEdition/applicationServices.ts`
- `docs/devplan/UIPlan.md`
- `docs/devplan/ui-domain-model-rollout.md`

Responsabilidades:

- mantener una identidad unica de `Project`, `Scene`, `Shot`, `AssetDefinition`
  y `Location`
- tratar `STUDIO_DIR/Scenes/...` como autoridad operativa de estado de
  escena/asset/shot/proyecto y `openclaw-projects/...` como proyeccion derivada
  reconciliada
- registrar estado por etapa (`StageState`) para habilitar gates de
  automatizacion
- mapear cada corrida de backend a `OperationRef` y cada output a `ArtifactRef`
- evitar duplicacion de payload en tomas: `Shot` consume assets por
  referencias (`ShotAssetBinding`)
- exponer la interaccion UI como eventos de intencion (`UiEventPointer`)
  apuntando a servicios de aplicacion con contratos de query/command

### Backends y flujos

#### Blender

Backend local para proyectos, inspeccion, handoff y cleanup pre-rig.

Piezas canonicas:

- `scripts/apps/blender.sh`
- `scripts/apps/install-3d-pre-rig-deps.sh`
- `scripts/apps/instant-meshes.sh`
- `scripts/apps/blender_pre_rig_cleanup.py`
- `src/openclaw_studio/runners/blender.py`
- `scripts/actions/blender-action.sh`
- `scripts/actions/runner-action.sh`
- [operations/blender.md](operations/blender.md)
- [operations/3d-pre-rig-cleanup.md](operations/3d-pre-rig-cleanup.md)

#### ComfyUI

Backend principal para imagen y video, con servicio de usuario, biblioteca de
workflows locales y runner de smoke ya operativo. La ruta 3D activa de
`Trellis2 GGUF` se publica desde la misma biblioteca `openclaw-workflows`;
no requiere un runner 3D nuevo paralelo.

Piezas canonicas:

- `scripts/apps/comfyui.sh`
- `scripts/actions/comfyui-action.sh`
- `src/openclaw_studio/runners/comfyui.py`
- [operations/comfyui.md](operations/comfyui.md)
- [comfyui/interface.md](comfyui/interface.md)

#### Hunyuan3D

Material historico fuera del alcance activo actual del repo. Sus scripts,
docs y runner permanecen como referencia tecnica mientras la linea 3D vigente
se consolida sobre `Trellis2 GGUF`. El runner `hunyuan3d` debe leerse como
legado historico, no como ownership vigente de `UC-3D-*`.

Piezas canonicas:

- `scripts/apps/install-hunyuan3d.sh`
- `scripts/apps/hunyuan3d.sh`
- `src/openclaw_studio/runners/hunyuan3d.py`
- [hunyuan3d/native-runtime-architecture.md](hunyuan3d/native-runtime-architecture.md)
- [hunyuan3d/runner-integration.md](hunyuan3d/runner-integration.md)

#### Trellis2 GGUF

Ruta 3D actual del repo dentro de un runtime `ComfyUI` aislado. La operacion
vigente y la documentacion activa deben partir de esta linea, no de
`Hunyuan3D`.

Piezas canonicas:

- `scripts/apps/install-trellis2-gguf.sh`
- `scripts/apps/comfyui-trellis2-gguf-prepare-layout.sh`
- `scripts/apps/comfyui-trellis2-gguf-validation.sh`
- `ComfyUIWorkflows/local/minimum/uc-3d-02-image-to-asset-trellis2-gguf-q4-v1.json`
- [comfyui/trellis2-gguf-interface.md](comfyui/trellis2-gguf-interface.md)
- [comfyui/trellis2-gguf-validation-results.md](comfyui/trellis2-gguf-validation-results.md)

#### Kimodo

Backend local opcional para diseno de movimiento, instalado desde el mismo
bootstrap declarativo y aislado en su propio `venv`. En el estado actual del
repo solo cubre instalacion reproducible y uso local por CLI/demo; todavia no
abre un runner, accion segura ni bridge dedicado a `Blender`.

Piezas canonicas:

- `scripts/apps/install-kimodo.sh`
- [kimodo/installation.md](kimodo/installation.md)

#### SF3D

Permanece como baseline historico y benchmark tecnico, no como ruta principal
de producto.

Piezas canonicas:

- [comfyui/general-3d-object-workflow-results.md](comfyui/general-3d-object-workflow-results.md)
- [comfyui/3d-atomic-composed-validation-results.md](comfyui/3d-atomic-composed-validation-results.md)
- [hunyuan3d/sf3d-decision.md](hunyuan3d/sf3d-decision.md)

## Fronteras de seguridad

- el runtime normal no corre como `root`
- se prefieren servicios `systemd --user`
- GNOME no debe automontar unidades
- los discos sensibles deben seguir fuera del flujo normal
- WhatsApp no expone shell libre
- las rutas operativas deben limitarse al workspace autorizado
- los mensajes sin wake word no deben llegar al agente general

Documentacion de apoyo:

- [security/disks-and-automount.md](security/disks-and-automount.md)
- [architecture/actions.md](architecture/actions.md)

## Puntos de extension

- nuevos runners registrados en `src/openclaw_studio/runners/registry.py`
- nuevos workflows `ComfyUI` publicados desde `ComfyUIWorkflows/local/`
- nuevas acciones seguras sobre el mismo plugin `studio-actions`
- nuevos casos de uso 3D reutilizando los alias `UC-3D-*`
- nuevos checks y gates siempre que reutilicen la estructura canonica de
  manifiestos, `run_id` y evidencia

## Decisiones actuales

- `.env` es la fuente declarativa principal del setup
- el host Linux y el usuario no privilegiado son el primer sandbox
- el runtime principal usa servicios de usuario antes que servicios root
- la capa de chat usa wake word y acciones seguras, no shell arbitrario
- las operaciones con ciclo de vida reutilizan el contrato de runner
- `Trellis2 GGUF` es la ruta 3D vigente del repo y se publica desde la
  biblioteca `openclaw-workflows`
- `Kimodo` se instala como backend local opcional desde el bootstrap, sin ruta
  paralela y sin exposicion por chat en esta fase
- `Hunyuan3D` queda fuera del alcance activo actual y solo se conserva como
  referencia historica
- `SF3D` queda en estado `legacy` y benchmark

## Documentos relacionados

- Entrada de usuario: [../README.md](../README.md)
- Reglas estables: [devplan/00-project-invariants.md](devplan/00-project-invariants.md)
- Indice de fases: [devplan/01-phase-index.md](devplan/01-phase-index.md)
- Mapa de features: [devplan/feature-map.md](devplan/feature-map.md)
