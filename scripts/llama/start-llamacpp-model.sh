#!/usr/bin/env bash
set -euo pipefail

# Generic llama.cpp TurboQuant endpoint launcher.
# Override values from the command line:
# MODEL_PATH=/path/model.gguf PORT=8082 CTX_SIZE=32768 N_CPU_MOE=25 CUDA_DEVICES=1 ~/start-llamacpp-model.sh

LLAMA_SERVER="${LLAMA_SERVER:-$HOME/Documents/Repos/llama-cpp-turboquant/build/bin/llama-server}"

MODEL_PATH="${MODEL_PATH:-$HOME/models/qwen3.6-35b-a3b-q8/Qwen3.6-35B-A3B-Q8_0.gguf}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8081}"
CTX_SIZE="${CTX_SIZE:-131072}"
N_CPU_MOE="${N_CPU_MOE:-20}"
GPU_LAYERS="${GPU_LAYERS:-auto}"
# GPU_LAYERS="${GPU_LAYERS:-999}"

PARALLEL="${PARALLEL:-1}"
# use --kv-unified for parallel > 1

# Default: use only the physical RTX 3090 from nvidia-smi, currently GPU 1.
CUDA_DEVICES="${CUDA_DEVICES:-1}"

# Default: use cards from nvidia-smi, currently GPU 2.
# CUDA_DEVICES="${CUDA_DEVICES:-1,0}"
# TENSOR_SPLIT="${TENSOR_SPLIT:-2,1}"
# MAIN_GPU="${MAIN_GPU:-0}"
# SPLIT_MODE="${SPLIT_MODE:-row}"
# --split-mode "$SPLIT_MODE" \
# --tensor-split "$TENSOR_SPLIT" \
# --main-gpu "$MAIN_GPU" \

export CUDA_DEVICE_ORDER=PCI_BUS_ID
export CUDA_VISIBLE_DEVICES="$CUDA_DEVICES"

#Drafter settings, for n-gram modulation.
# --spec-type ngram-mod \
# --spec-ngram-mod-n-min 1 \
# --spec-ngram-mod-n-max 4 \
# --spec-ngram-mod-n-match 16

#Drafter settings, for n-gram mapping.
# --spec-type ngram-map-k \
# --spec-ngram-map-k-size-n 16 \
# --spec-ngram-map-k-size-m 4 \
# --spec-ngram-map-k-min-hits 1

#Drafter settings, for n-gram cache.
SPEC_TYPE="${SPEC_TYPE:-ngram-cache}"
LOOKUP_CACHE_DYNAMIC="${LOOKUP_CACHE_DYNAMIC:-$HOME/.cache/llama-ngram-cache.bin}"
# --spec-type "$SPEC_TYPE" \
# --lookup-cache-dynamic "$LOOKUP_CACHE_DYNAMIC"

exec "$LLAMA_SERVER" \
  --model "$MODEL_PATH" \
  --host "$HOST" \
  --port "$PORT" \
  --n-gpu-layers "$GPU_LAYERS" \
  --n-cpu-moe "$N_CPU_MOE" \
  --ctx-size "$CTX_SIZE" \
  --flash-attn on \
  --no-mmap \
  --parallel "$PARALLEL" \
  --no-cache-idle-slots \
  --mlock \
  --cache-type-k turbo4 \
  --cache-type-v turbo3 \
  
  


  