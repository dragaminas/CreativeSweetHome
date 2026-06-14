#!/usr/bin/env bash
set -euo pipefail

# Gemma 4 multimodal llama.cpp TurboQuant endpoint launcher.
# Override example:
# MODEL_PATH=/path/model.gguf MMPROJ_PATH=/path/mmproj-BF16.gguf PORT=8082 CUDA_DEVICES=1 ./start-gemma4.sh

LLAMA_SERVER="${LLAMA_SERVER:-$HOME/Documents/Repos/llama-cpp-turboquant/build/bin/llama-server}"

MODEL_PATH="${MODEL_PATH:-$HOME/models/gemma-4-26b-a4b/gemma-4-26B-A4B-it-Q4_K_M.gguf}"
MMPROJ_PATH="${MMPROJ_PATH:-$HOME/models/gemma-4-26b-a4b/mmproj-BF16.gguf}"

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8081}"
CTX_SIZE="${CTX_SIZE:-131072}"
GPU_LAYERS="${GPU_LAYERS:-999}"
PARALLEL="${PARALLEL:-1}"

# Default: use only RTX 3090.
CUDA_DEVICES="${CUDA_DEVICES:-1}"

export CUDA_DEVICE_ORDER=PCI_BUS_ID
export CUDA_VISIBLE_DEVICES="$CUDA_DEVICES"

if [[ ! -f "$MODEL_PATH" ]]; then
  echo "Model file not found: $MODEL_PATH" >&2
  exit 1
fi

if [[ ! -f "$MMPROJ_PATH" ]]; then
  echo "Multimodal projector not found: $MMPROJ_PATH" >&2
  echo "Download it with: hf download unsloth/gemma-4-26B-A4B-it-GGUF --include '*mmproj-BF16*' --local-dir ~/models/gemma-4-26b-a4b" >&2
  exit 1
fi

exec "$LLAMA_SERVER" \
  --model "$MODEL_PATH" \
  --mmproj "$MMPROJ_PATH" \
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
  --temp 1.0 \
  --top-p 0.95 \
  --top-k 64 \
  --alias "gemma-4-26b-a4b-it"