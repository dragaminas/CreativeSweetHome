#!/usr/bin/env bash
set -euo pipefail

# Generic llama.cpp TurboQuant endpoint launcher.
# Override values from the command line:
# MODEL_PATH=/path/model.gguf PORT=8082 CTX_SIZE=32768 N_CPU_MOE=25 ~/start-llamacpp-model.sh

LLAMA_SERVER="${LLAMA_SERVER:-$HOME/Documents/Repos/llama-cpp-turboquant/build/bin/llama-server}"

MODEL_PATH="${MODEL_PATH:-$HOME/models/qwen3.6-35b-a3b-q8/Qwen3.6-35B-A3B-Q8_0.gguf}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8081}"
CTX_SIZE="${CTX_SIZE:-32768}"
N_CPU_MOE="${N_CPU_MOE:-25}"
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
