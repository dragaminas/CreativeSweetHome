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
- linea 3D nativa basada en `Hunyuan3D`
- laboratorio aislado de `Trellis2 GGUF` en `ComfyUI`

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
        +--> Hunyuan3D
        +--> laboratorio Trellis2 GGUF
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
- provisionar servicios de usuario
- instalar o regenerar `ComfyUI`

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

### Backends y flujos

#### Blender

Backend local para proyectos, inspeccion y handoff.

Piezas canonicas:

- `scripts/apps/blender.sh`
- `scripts/actions/blender-action.sh`
- [operations/blender.md](operations/blender.md)

#### ComfyUI

Backend principal para imagen y video, con servicio de usuario, biblioteca de
workflows locales y runner de smoke ya operativo.

Piezas canonicas:

- `scripts/apps/comfyui.sh`
- `scripts/actions/comfyui-action.sh`
- `src/openclaw_studio/runners/comfyui.py`
- [operations/comfyui.md](operations/comfyui.md)
- [comfyui/interface.md](comfyui/interface.md)

#### Hunyuan3D

Ruta 3D operativa actual por defecto. Corre fuera de `ComfyUI`, con su propio
runtime, `API` y bridge a `Blender`.

Piezas canonicas:

- `scripts/apps/install-hunyuan3d.sh`
- `scripts/apps/hunyuan3d.sh`
- `src/openclaw_studio/runners/hunyuan3d.py`
- [hunyuan3d/native-runtime-architecture.md](hunyuan3d/native-runtime-architecture.md)
- [hunyuan3d/runner-integration.md](hunyuan3d/runner-integration.md)

#### Trellis2 GGUF

Linea experimental dentro de un runtime `ComfyUI` aislado. No es el baseline
de producto todavia.

Piezas canonicas:

- `scripts/apps/install-trellis2-gguf.sh`
- `scripts/apps/comfyui-trellis2-gguf-prepare-layout.sh`
- `scripts/apps/comfyui-trellis2-gguf-validation.sh`
- [comfyui/trellis2-gguf-interface.md](comfyui/trellis2-gguf-interface.md)
- [comfyui/trellis2-gguf-validation-results.md](comfyui/trellis2-gguf-validation-results.md)

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
- `Hunyuan3D` es la ruta 3D operativa actual
- `Trellis2 GGUF` sigue en evaluacion y solo debe promocionarse con gates
  explicitos
- `SF3D` queda en estado `legacy` y benchmark

## Documentos relacionados

- Entrada de usuario: [../README.md](../README.md)
- Reglas estables: [devplan/00-project-invariants.md](devplan/00-project-invariants.md)
- Indice de fases: [devplan/01-phase-index.md](devplan/01-phase-index.md)
- Mapa de features: [devplan/feature-map.md](devplan/feature-map.md)
