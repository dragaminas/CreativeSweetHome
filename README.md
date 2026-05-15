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
- linea 3D actual con `Trellis2 GGUF` sobre un runtime `ComfyUI` aislado
- `Kimodo` como backend local optativo para diseno de movimiento (deteccion GPU automatica, prerequisitos auto-instalables)
- `Hunyuan3D` solo como material historico fuera del alcance activo actual

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
bash scripts/apps/comfyui-trellis2-gguf-validation.sh
```

Instalacion y uso de Kimodo (opcional, diseno de movimiento):

```bash
# Solo instalar Kimodo (con deteccion GPU automatica e instalacion de prerequisitos):
scripts/apps/install-kimodo.sh audit
scripts/apps/install-kimodo.sh apply

# O como parte del bootstrap si activas la flag:
KIMODO_INSTALL=true scripts/bootstrap/apply-workstation.sh audit
KIMODO_INSTALL=true scripts/bootstrap/apply-workstation.sh apply

# Usar Kimodo despues de instalar:
source ~/Kimodo/.venv/bin/activate
kimodo_demo     # modo interactivo
kimodo_gen --help  # linea de comando
```

### Troubleshooting Kimodo

**Canvas 3D en blanco / WebGL error en Firefox**

Si al abrir `http://localhost:7860` el canvas aparece en blanco y la consola del navegador muestra:
```
AllowWebgl2:false restricts context creation on this system.
THREE.WebGLRenderer: Error creating WebGL context.
```

Firefox tiene tu GPU en su lista de bloqueo interna. Solución:

1. Abre `about:config` en Firefox
2. Busca `webgl.force-enabled` y ponlo en `true`
3. Recarga `http://localhost:7860`

Si el problema persiste, verifica que el driver NVIDIA esté activo:
```bash
glxinfo | grep "OpenGL renderer"
```
Si muestra `llvmpipe` en lugar de tu GPU, lanza Firefox con el driver explícito:
```bash
__NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia firefox http://localhost:7860
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
- Kimodo: [docs/kimodo/installation.md](docs/kimodo/installation.md)
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

## Arrancar llama.cpp

### Crea scripts si no existen aun

```bash 
cat > ~/start-qwen36-llamacpp.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

# llama.cpp TurboQuant server launcher for Qwen3.6-35B-A3B on RTX 3090.

LLAMA_SERVER="${LLAMA_SERVER:-$HOME/llama-cpp-turboquant/build/bin/llama-server}"
MODEL_PATH="${MODEL_PATH:-$HOME/models/qwen3.6-35b-a3b/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8081}"
CTX_SIZE="${CTX_SIZE:-32768}"
N_CPU_MOE="${N_CPU_MOE:-35}"

exec "$LLAMA_SERVER" \
  --model "$MODEL_PATH" \
  --host "$HOST" \
  --port "$PORT" \
  --n-gpu-layers 999 \
  --n-cpu-moe "$N_CPU_MOE" \
  --ctx-size "$CTX_SIZE" \
  --flash-attn on \
  --no-mmap \
  --mlock \
  --cache-type-k turbo4 \
  --cache-type-v turbo3 \
  --jinja
EOF

chmod +x ~/start-qwen36-llamacpp.sh
```

```bash
cat > ~/start-llamacpp-model.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

# Generic llama.cpp TurboQuant endpoint launcher.
# Override values from the command line:
# MODEL_PATH=/path/model.gguf PORT=8082 CTX_SIZE=32768 N_CPU_MOE=35 ~/start-llamacpp-model.sh

LLAMA_SERVER="${LLAMA_SERVER:-$HOME/llama-cpp-turboquant/build/bin/llama-server}"

MODEL_PATH="${MODEL_PATH:?Set MODEL_PATH=/path/to/model.gguf}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8081}"
CTX_SIZE="${CTX_SIZE:-32768}"
N_CPU_MOE="${N_CPU_MOE:-35}"
GPU_LAYERS="${GPU_LAYERS:-999}"

exec "$LLAMA_SERVER" \
  --model "$MODEL_PATH" \
  --host "$HOST" \
  --port "$PORT" \
  --n-gpu-layers "$GPU_LAYERS" \
  --n-cpu-moe "$N_CPU_MOE" \
  --ctx-size "$CTX_SIZE" \
  --flash-attn on \
  --no-mmap \
  --mlock \
  --cache-type-k turbo4 \
  --cache-type-v turbo3 \
  --jinja
EOF

chmod +x ~/start-llamacpp-model.sh
```

### Lanzar start-qwen36

```bash
~/start-qwen36-llamacpp.sh
```
Arrancar en otros puertos o context size

```bash
PORT=8082 CTX_SIZE=65536 ~/start-qwen36-llamacpp.sh
```
### Lanzar llama definiendo modelo

```bash
MODEL_PATH="$HOME/models/qwen3.6-35b-a3b/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf" \
PORT=8081 \
CTX_SIZE=32768 \
N_CPU_MOE=35 \
~/start-llamacpp-model.sh
```

```bash
MODEL_PATH="$HOME/models/qwen3-coder-next/Qwen3-Coder-Next-UD-Q3_K_XL.gguf" \
PORT=8082 \
CTX_SIZE=32768 \
N_CPU_MOE=35 \
~/start-llamacpp-model.sh
```

```bash
MODEL_PATH="$HOME/models/qwen3.6-35b-a3b-q8/Qwen3.6-35B-A3B-Q8_0.gguf" \
PORT=8082 \
CTX_SIZE=262144 \
N_CPU_MOE=35 \
~/start-llamacpp-model.sh
```



`SAD.md` y `DevPlan.md` en la raiz existen solo como puntos de compatibilidad.
Las fuentes canonicas viven en `docs/SAD.md` y `docs/devplan/`.
