## 1. Instalar dependencias

```bash
sudo apt update
sudo apt install -y git cmake build-essential ninja-build
```

Si ya compilas `llama.cpp` normal con CUDA, probablemente esto ya lo tienes.

---

## 2. Clonar el fork correcto

```bash
cd "$HOME"
git clone https://github.com/TheTom/llama-cpp-turboquant.git
cd llama-cpp-turboquant
git checkout feature/turboquant-kv-cache
```

La propia guía de TurboQuant+ indica clonar ese repo y cambiar a esa rama antes de compilar. ([GitHub][1])

---

## 3. Compilar con CUDA para tu RTX 3090

Para RTX 3090, arquitectura CUDA `86`:

```bash
cmake -S . -B build \
  -DGGML_CUDA=ON \
  -DCMAKE_CUDA_ARCHITECTURES=86 \
  -DCMAKE_BUILD_TYPE=Release

cmake --build build --config Release -j"$(nproc)"
```

La guía oficial del proyecto muestra la compilación NVIDIA con `-DGGML_CUDA=ON`; el ajuste `CMAKE_CUDA_ARCHITECTURES=86` lo añado para tu 3090. ([GitHub][1])

---

## 4. Comprobar que existe `llama-server`

```bash
./build/bin/llama-server --version
```

Y para verificar que TurboQuant aparece en la ayuda:

```bash
./build/bin/llama-server --help | grep -i turbo
```

Si no aparece nada relacionado con `turbo`, probablemente compilaste la rama equivocada o estás ejecutando otro binario de `llama-server`.

---

## 5. Probar un modelo normal con KV TurboQuant

Ejemplo con un GGUF que ya tengas:

```bash
MODEL_PATH="$HOME/models/qwen3-coder-next/Qwen3-Coder-Next-UD-Q3_K_XL.gguf"

./build/bin/llama-server \
  -m "$MODEL_PATH" \
  --host 0.0.0.0 \
  --port 8082 \
  -ngl 99 \
  -c 32768 \
  -fa on \
  -ctk q8_0 \
  -ctv turbo3
```

La guía de TurboQuant+ usa precisamente `-ctk q8_0 -ctv turbo3 -fa on -ngl 99` como ejemplo para activar compresión de KV cache. ([GitHub][1])

Para tu caso, yo empezaría con:

```bash
-ctk q8_0 -ctv turbo3
```

No empezaría con `-ctk turbo3 -ctv turbo3` todavía, porque comprimir también `K` puede afectar más la calidad/estabilidad. Primero mide rendimiento y comportamiento.

---

## 6. Probar desde API estilo OpenAI

```bash
curl http://localhost:8082/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "local",
    "messages": [
      {
        "role": "user",
        "content": "Write a Python function that converts camelCase to snake_case."
      }
    ],
    "temperature": 0.2,
    "max_tokens": 200
  }'
```

---

## 7. Script cómodo para arrancarlo

Crea un script separado para no mezclarlo con tu `llama.cpp` normal:

```bash
nano ~/start-llamacpp-turboquant.sh
```

Contenido:

```bash
#!/usr/bin/env bash
set -euo pipefail

MODEL_PATH="${MODEL_PATH:?MODEL_PATH is required}"
PORT="${PORT:-8082}"
CTX_SIZE="${CTX_SIZE:-32768}"
LLAMA_DIR="$HOME/llama-cpp-turboquant"

"$LLAMA_DIR/build/bin/llama-server" \
  -m "$MODEL_PATH" \
  --host 0.0.0.0 \
  --port "$PORT" \
  -ngl 99 \
  -c "$CTX_SIZE" \
  -fa on \
  -ctk q8_0 \
  -ctv turbo3
```

Luego:

```bash
chmod +x ~/start-llamacpp-turboquant.sh
```

Uso:

```bash
MODEL_PATH="$HOME/models/qwen3-coder-next/Qwen3-Coder-Next-UD-Q3_K_XL.gguf" \
PORT=8082 \
CTX_SIZE=32768 \
~/start-llamacpp-turboquant.sh
```

---

## Nota importante

TurboQuant no significa automáticamente más tokens/segundo. Su ventaja principal es **reducir memoria de KV cache**, lo que ayuda con contextos largos. En discusiones recientes algunos usuarios reportan que puede ser más lento en ciertos casos, especialmente durante prefill largo, así que conviene comparar contra tu `llama.cpp` normal con el mismo modelo, mismo contexto y mismo prompt. ([GitHub][2])

Para tu objetivo de **256K context**, TurboQuant tiene sentido probarlo; para prompts cortos, puede no ganar nada.

[1]: https://github.com/TheTom/turboquant_plus/blob/main/docs/getting-started.md "turboquant_plus/docs/getting-started.md at main · TheTom/turboquant_plus · GitHub"
[2]: https://github.com/ggml-org/llama.cpp/discussions/21526?utm_source=chatgpt.com "TurboQuant KV Cache Compression — Full HIP/ROCm ..."


## Descargar modelos

```bash 
python3 -m pip install -U "huggingface_hub[cli]"

mkdir -p "$HOME/models/qwen3.6-35b-a3b-q8"

hf download unsloth/Qwen3.6-35B-A3B-GGUF \
  Qwen3.6-35B-A3B-Q8_0.gguf \
  --local-dir "$HOME/models/qwen3.6-35b-a3b-q8"
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