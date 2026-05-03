# OpenClaw Workstation

Repositorio para preparar y operar una workstation Linux dedicada a `OpenClaw`
como asistente creativo local, con WhatsApp como interfaz segura y aplicaciones
del sistema como backends controlados.

## Caso soportado hoy

El repo ya cubre una instalacion reproducible y operable para:

- bootstrap declarativo desde `.env`
- hardening base del host y del runtime de `OpenClaw`
- servicios `systemd --user` para `OpenClaw` y `ComfyUI`
- acciones seguras por WhatsApp a traves del plugin `studio-actions`
- uso local de Blender
- provision y operacion diaria de `ComfyUI`
- linea 3D nativa con `Hunyuan3D`
- laboratorio aislado de `Trellis2 GGUF` en evaluacion

## Comandos principales

Bootstrap inicial o convergencia del host:

```bash
cp .env.example .env
editor .env
scripts/bootstrap/show-config.sh
scripts/bootstrap/apply-workstation.sh audit
scripts/bootstrap/apply-workstation.sh apply
```

Comprobacion rapida del estado:

```bash
scripts/doctor/openclaw-status.sh
scripts/doctor/workstation-health.sh
scripts/services/user-services.sh status
```

Operacion diaria de aplicaciones:

```bash
scripts/apps/blender.sh status
scripts/apps/comfyui.sh service-status
scripts/apps/comfyui.sh open-ui
scripts/apps/hunyuan3d.sh status
```

Prueba del puente seguro:

```bash
scripts/openclaw/test-studio-actions-plugin.sh "studio como esta blender"
scripts/openclaw/test-studio-actions-plugin.sh "studio como esta comfyui"
scripts/actions/runner-action.sh describe comfyui
```

## Donde seguir

- Arquitectura actual: [docs/SAD.md](docs/SAD.md)
- Reglas estables para futuras tareas: [docs/devplan/00-project-invariants.md](docs/devplan/00-project-invariants.md)
- Indice compacto de fases: [docs/devplan/01-phase-index.md](docs/devplan/01-phase-index.md)
- Mapa entre features, arquitectura y plan: [docs/devplan/feature-map.md](docs/devplan/feature-map.md)
- Tareas activas autocontenidas: [docs/devplan/tasks/](docs/devplan/tasks/)
- Resumenes historicos: [docs/devplan/archive/](docs/devplan/archive/)

## Documentacion operativa

- Bootstrap: [docs/operations/bootstrap.md](docs/operations/bootstrap.md)
- WhatsApp: [docs/operations/whatsapp.md](docs/operations/whatsapp.md)
- ComfyUI: [docs/operations/comfyui.md](docs/operations/comfyui.md)
- Blender: [docs/operations/blender.md](docs/operations/blender.md)
- Uso diario: [docs/operations/daily-use.md](docs/operations/daily-use.md)
- Mantenimiento y backups: [docs/operations/admin-maintenance.md](docs/operations/admin-maintenance.md), [docs/operations/backup-and-updates.md](docs/operations/backup-and-updates.md)

## Estructura relevante

```text
.
├── README.md
├── SAD.md
├── DevPlan.md
├── docs/
│   ├── SAD.md
│   └── devplan/
├── configs/
├── plugins/
├── scripts/
└── src/
```

`SAD.md` y `DevPlan.md` en la raiz existen solo como puntos de compatibilidad.
Las fuentes canonicas viven en `docs/SAD.md` y `docs/devplan/`.
