# Instalacion de `Kimodo`

Este documento describe la ruta canonica para instalar `Kimodo` dentro de
`OpenClaw` sin abrir un bootstrap paralelo ni una receta manual separada.

La baseline soportada parte del upstream oficial `nv-tlabs/kimodo` y de su
documentacion Linux verificada el 3 de mayo de 2026:

- instalacion por paquete o por source checkout
- `Python 3.10+`
- `PyTorch 2.0+`
- token de Hugging Face para el modelo gated
  `meta-llama/Meta-Llama-3-8B-Instruct`
- opcion de usar `TEXT_ENCODER_DEVICE=cpu` en GPUs con poca VRAM

Referencias oficiales:

- <https://research.nvidia.com/labs/sil/projects/kimodo/docs/getting_started/installation.html>
- <https://research.nvidia.com/labs/sil/projects/kimodo/docs/getting_started/quick_start.html>
- <https://github.com/nv-tlabs/kimodo>

## Artefactos canonicos

| Artefacto | Ruta |
| --- | --- |
| Instalador | `scripts/apps/install-kimodo.sh` |
| Bootstrap general | `scripts/bootstrap/apply-workstation.sh` |
| Config visible | `scripts/bootstrap/show-config.sh` |
| Checkout local por defecto | `~/Kimodo/` |
| Venv por defecto | `~/Kimodo/.venv/` |

## Capacidades del instalador automático

El script `scripts/apps/install-kimodo.sh` ahora incluye inteligencia para:

- **Detección de GPU**: Identifica NVIDIA, AMD ROCM o CPU automáticamente
- **Recomendación de PyTorch**: Propone argumentos de instalación optimizados para
  tu hardware (vs. un default genérico)
- **Instalación de prerequisitos**: Intenta instalar `cmake` y compiladores con
  `sudo` si faltan (Debian/Ubuntu y Arch Linux soportados)
- **Autenticación HF interactiva**: Prompt en modo `apply` para autenticarse en
  Hugging Face
- **Guía mejorada**: Mensajes claros sobre qué hacer en cada paso

## Variables principales

| Variable | Default | Uso |
| --- | --- | --- |
| `KIMODO_INSTALL` | `false` | activa la orquestacion desde el bootstrap |
| `KIMODO_INSTALL_METHOD` | `source` | `source` para checkout editable, `package` para black-box desde git |
| `KIMODO_REPO_REF` | `main` | branch o tag del repo oficial |
| `KIMODO_INSTALL_EXTRAS` | `all` | `base`, `demo`, `soma` o `all` |
| `KIMODO_TORCH_INSTALL_ARGS` | `torch>=2.0` | args pasados a `pip install` antes de instalar `Kimodo`. El script propone valores optimizados en audit mode si usas el default |
| `KIMODO_SKIP_MOTION_CORRECTION` | `false` | fallback experimental para omitir la extension nativa |
| `KIMODO_HF_TOKEN_FILE` | `~/.cache/huggingface/token` | ruta esperada del token HF |

**Nota sobre `KIMODO_TORCH_INSTALL_ARGS`**:
Si usas el valor default (`torch>=2.0`), el script en modo `audit` detectara tu
GPU y recomendara argumentos optimizados. En `apply` mode usara esos argumentos
automaticamente.

## Flujo recomendado (rápido)

```bash
cp .env.example .env
KIMODO_INSTALL=true scripts/apps/install-kimodo.sh audit
# Revisa la salida, especialmente la sección "Deteccion de GPU y PyTorch"
KIMODO_INSTALL=true scripts/apps/install-kimodo.sh apply
```

El script en `apply` mode:
1. Instala prerequisitos del host (cmake, g++, etc.) con `sudo` si es necesario
2. Clona/actualiza el repo de Kimodo
3. Crea el venv
4. Instala PyTorch con las args optimizadas automáticamente detectadas
5. Instala Kimodo y sus dependencias
6. Ofrece autenticacion interactiva en Hugging Face si lo necesitas

Si prefieres ejecutar solo el instalador:

```bash
scripts/apps/install-kimodo.sh audit
scripts/apps/install-kimodo.sh apply
```

## Personalización de PyTorch

Para GPUs específicas, puedes definir manualmente los args en `.env`:

```bash
# Para NVIDIA RTX 4090 (Ada):
KIMODO_TORCH_INSTALL_ARGS="torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124"

# Para NVIDIA H100 (Hopper):
KIMODO_TORCH_INSTALL_ARGS="torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124"

# Para AMD ROCM 5.7:
KIMODO_TORCH_INSTALL_ARGS="torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm5.7"

# Para CPU only:
KIMODO_TORCH_INSTALL_ARGS="torch torchvision torchaudio"
```

## Que hace el instalador

### En modo `audit`:
1. Valida Python 3.10+
2. Detecta GPU disponible y propone args de PyTorch optimizados
3. Verifica si faltan prerequisitos del host
4. Reporta estado: qué hace falta, qué está listo
5. **No hace cambios**

### En modo `apply`:
1. Lo mismo del audit
2. **Además**:
   - Instala prerequisitos del host (con `sudo` si es necesario)
   - Clona o actualiza el repo de Kimodo
   - Crea venv aislado
   - Instala PyTorch con args detectados automáticamente
   - Instala Kimodo con extras elegidos (base, demo, soma, o all)
   - Ofrece autenticacion interactiva en Hugging Face
   - Verifica runtime: torch, kimodo, motion_correction, token HF

## Prerequisitos reales del host

La ruta canonica construye `MotionCorrection` desde el repo oficial. Eso
requiere al menos:

- `git`
- `python3` con `python3-venv`
- `cmake`
- compilador `g++`

El script intenta instalarlos automaticamente en `apply` mode si faltan. Si la
instalacion automatica no funciona en tu distro, instala manualmente:

```bash
# Debian/Ubuntu:
sudo apt-get update
sudo apt-get install -y cmake build-essential python3-venv git

# Arch Linux:
sudo pacman -S --noconfirm cmake gcc python python-venv git

# Fedora/RHEL:
sudo dnf install -y cmake gcc gcc-c++ redhat-rpm-config python3-devel git
```

## Token de Hugging Face

La instalacion puede completarse sin descargar modelos. El script en `apply`
mode te ofrece autenticacion interactiva.

Para autenticar manualmente:

```bash
source ~/Kimodo/.venv/bin/activate
hf auth login
```

Alternativamente, descarga tu token desde
<https://huggingface.co/settings/tokens> y poblalo en `KIMODO_HF_TOKEN_FILE`:

```bash
mkdir -p ~/.cache/huggingface
echo "hf_..." > ~/.cache/huggingface/token
chmod 600 ~/.cache/huggingface/token
```

## Smoke test

Sin descargar modelos ni lanzar la demo completa:

```bash
source ~/Kimodo/.venv/bin/activate
kimodo_gen --help
kimodo_demo --help
python -c "import kimodo, torch; print(torch.__version__, torch.cuda.is_available())"
```

Para equipos con menos VRAM que la recomendada por upstream:

```bash
source ~/Kimodo/.venv/bin/activate
TEXT_ENCODER_DEVICE=cpu kimodo_textencoder
```

La documentacion oficial indica que el encoder en CPU reduce la necesidad de
VRAM a menos de `3 GB`, a costa de mas latencia.

## Nota experimental sobre `Aero-Ex`

El gist activo de `Aero-Ex` del 2 de mayo de 2026 queda solo como referencia
de compatibilidad experimental para casos donde el baseline oficial no encaje
con el host. No es la ruta canonica del repo y no se automatiza desde el
bootstrap general:

- <https://gist.github.com/Aero-Ex/3affd23c4c9632dbff3045f4ae3655ec>

Si una maquina necesita desviar al fork o a un parche manual de
`llm2vec_wrapper.py`, ese desvio debe justificarse y documentarse aparte.
