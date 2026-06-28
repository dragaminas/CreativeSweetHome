#!/usr/bin/env bash
set -euo pipefail

# VibeThinker-3B llama.cpp TurboQuant endpoint launcher.
#
# Override examples:
# MODEL_PATH=/path/VibeThinker-3B-F16.gguf PORT=8082 CUDA_DEVICES=1 ./start-vibethinker3b.sh
# CTX_SIZE=32768 ./start-vibethinker3b.sh

LLAMA_SERVER="${LLAMA_SERVER:-$HOME/Documents/Repos/llama-cpp-turboquant/build/bin/llama-server}"

MODEL_DIR="${MODEL_DIR:-$HOME/models/VibeThinker-3B}"

# If MODEL_PATH is not provided, try to find one GGUF inside MODEL_DIR.
MODEL_PATH="${MODEL_PATH:-}"

if [[ -z "$MODEL_PATH" ]]; then
  MODEL_PATH="$(find "$MODEL_DIR" -maxdepth 2 -type f -iname "*.gguf" | sort | head -n 1 || true)"
fi

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8082}"

# For a 3B model, 32k is a sensible first test.
# You can try 65536 or 131072 later if the model/config supports it and VRAM stays fine.
CTX_SIZE="${CTX_SIZE:-32768}"

GPU_LAYERS="${GPU_LAYERS:-999}"
PARALLEL="${PARALLEL:-1}"

# Default: use only RTX 3090.
# In your setup this has usually been CUDA device 1.
CUDA_DEVICES="${CUDA_DEVICES:-1}"

export CUDA_DEVICE_ORDER=PCI_BUS_ID
export CUDA_VISIBLE_DEVICES="$CUDA_DEVICES"

if [[ -z "$MODEL_PATH" || ! -f "$MODEL_PATH" ]]; then
  echo "GGUF model file not found in: $MODEL_DIR" >&2
  echo "" >&2
  echo "llama-server needs a .gguf file." >&2
  echo "Your downloaded VibeThinker-3B folder may contain Hugging Face files like:" >&2
  echo "  config.json, tokenizer.json, *.safetensors" >&2
  echo "" >&2
  echo "Check with:" >&2
  echo "  find \"$MODEL_DIR\" -maxdepth 2 -type f | sort" >&2
  echo "" >&2
  echo "If there is no .gguf, you need to convert it to GGUF or download a GGUF version." >&2
  exit 1
fi

echo "Starting VibeThinker-3B"
echo "Model: $MODEL_PATH"
echo "Host:  $HOST"
echo "Port:  $PORT"
echo "CUDA_VISIBLE_DEVICES=$CUDA_VISIBLE_DEVICES"
echo "CTX_SIZE=$CTX_SIZE"

exec "$LLAMA_SERVER" \
  --model "$MODEL_PATH" \
  --host "$HOST" \
  --port "$PORT" \
  --n-gpu-layers "$GPU_LAYERS" \
  --ctx-size "$CTX_SIZE" \
  --flash-attn on \
  --no-mmap \
  --parallel "$PARALLEL" \
  --no-cache-idle-slots \
  --mlock \
  --cache-type-k turbo4 \
  --cache-type-v turbo3 \
  --temp 0.6 \
  --top-p 0.95 \
  --top-k 20 \
  --alias "vibethinker-3b"