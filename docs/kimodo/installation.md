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

## Variables principales

| Variable | Default | Uso |
| --- | --- | --- |
| `KIMODO_INSTALL` | `false` | activa la orquestacion desde el bootstrap |
| `KIMODO_INSTALL_METHOD` | `source` | `source` para checkout editable, `package` para black-box desde git |
| `KIMODO_REPO_REF` | `main` | branch o tag del repo oficial |
| `KIMODO_INSTALL_EXTRAS` | `all` | `base`, `demo`, `soma` o `all` |
| `KIMODO_TORCH_INSTALL_ARGS` | `torch>=2.0` | args pasados a `pip install` antes de instalar `Kimodo` |
| `KIMODO_SKIP_MOTION_CORRECTION` | `false` | fallback experimental para omitir la extension nativa |
| `KIMODO_HF_TOKEN_FILE` | `~/.cache/huggingface/token` | ruta esperada del token HF |

`KIMODO_TORCH_INSTALL_ARGS` existe porque `Kimodo` no instala `torch` por su
cuenta. Para una GPU concreta conviene reemplazar el default por los argumentos
del selector oficial de PyTorch antes de correr `apply`.

## Flujo recomendado

```bash
cp .env.example .env
editor .env
KIMODO_INSTALL=true scripts/bootstrap/show-config.sh
KIMODO_INSTALL=true scripts/bootstrap/apply-workstation.sh audit
KIMODO_INSTALL=true scripts/bootstrap/apply-workstation.sh apply
```

Si prefieres ejecutar solo el instalador:

```bash
scripts/apps/install-kimodo.sh audit
scripts/apps/install-kimodo.sh apply
```

## Que hace el instalador

En modo `source`:

1. valida `Python 3.10+` y el `repo_ref` configurado
2. clona o actualiza `nv-tlabs/kimodo`
3. crea el `venv` aislado
4. instala `torch` segun `KIMODO_TORCH_INSTALL_ARGS`
5. instala `Kimodo` con `pip install -e ".[...]"` y los extras elegidos
6. reporta si el runtime importa `kimodo`, si existe `kimodo_gen` y si hay
   token HF disponible

En modo `package`:

1. prepara el mismo `venv`
2. instala `torch`
3. instala `Kimodo` desde `git+https://github.com/nv-tlabs/kimodo.git`
4. mantiene la misma verificacion final del runtime

## Prerequisitos reales del host

La ruta canonica construye `MotionCorrection` desde el repo oficial. Eso
requiere al menos:

- `git`
- `python3`
- `python3-venv`
- `cmake`
- compilador `g++`

Si estos prerequisitos faltan, el script falla de forma explicita en `apply`.
No intenta abrir otra ruta de instalacion fuera del bootstrap.

## Token de Hugging Face

La instalacion puede completarse sin descargar modelos, pero la generacion
queda bloqueada hasta conceder acceso al repo gated de Llama 3 y autenticar:

```bash
source ~/Kimodo/.venv/bin/activate
hf auth login
```

Alternativamente puedes poblar `KIMODO_HF_TOKEN_FILE` con el token.

## Smoke barato

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
