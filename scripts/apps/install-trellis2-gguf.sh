#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/common.sh"

COMFYUI_TRELLIS2_LAB_DIR="${COMFYUI_TRELLIS2_LAB_DIR:-$HOME/ComfyUI-trellis2-lab}"
TRELLIS2_GGUF_SOURCE_ROOT="${TRELLIS2_GGUF_SOURCE_ROOT:-$COMFYUI_TRELLIS2_LAB_DIR/models/Aero-Ex/Trellis2-GGUF}"
TRELLIS2_GGUF_RUN_VALIDATION="${TRELLIS2_GGUF_RUN_VALIDATION:-1}"

PREPARE_SCRIPT="$SCRIPT_DIR/comfyui-trellis2-gguf-prepare-layout.sh"
VALIDATION_SCRIPT="$SCRIPT_DIR/comfyui-trellis2-gguf-validation.sh"

EXIT_OK=0
EXIT_MISSING_RUNTIME=10
EXIT_MISSING_MODELS=11
EXIT_LAYOUT_INCOMPLETE=12
EXIT_CUDA_OR_WHEELS=13
EXIT_PREFLIGHT_BLOCKED=14

required_model_paths=(
  "Vision/dinov3-vitl16-pretrain-lvd1689m.safetensors"
  "decoders/Stage1/ss_dec_conv3d_16l8_fp16.safetensors"
  "decoders/Stage2/shape_dec_next_dc_f16c32_fp16.safetensors"
  "decoders/Stage2/tex_dec_next_dc_f16c32_fp16.safetensors"
  "shape/slat_flow_img2shape_dit_1_3B_512_bf16_Q4_K_M.gguf"
  "texture/slat_flow_imgshape2tex_dit_1_3B_512_bf16_Q4_K_M.gguf"
  "refiner/ss_flow_img_dit_1_3B_64_bf16_Q4_K_M.gguf"
)

check_runtime() {
  [[ -d "$COMFYUI_TRELLIS2_LAB_DIR" ]]
}

check_minimum_models() {
  local missing=0
  local rel
  for rel in "${required_model_paths[@]}"; do
    if [[ ! -f "$TRELLIS2_GGUF_SOURCE_ROOT/$rel" ]]; then
      warn "Falta modelo requerido: $TRELLIS2_GGUF_SOURCE_ROOT/$rel"
      missing=1
    fi
  done
  return "$missing"
}

check_layout_outputs() {
  local trellis_root="$COMFYUI_TRELLIS2_LAB_DIR/models/microsoft/TRELLIS.2-4B"
  local dinov3_root="$COMFYUI_TRELLIS2_LAB_DIR/models/facebook/dinov3-vitl16-pretrain-lvd1689m"
  [[ -f "$trellis_root/pipeline.json" ]] \
    && [[ -f "$dinov3_root/model.safetensors" ]] \
    && [[ -f "$dinov3_root/config.json" ]]
}

print_context() {
  print_header "Install Trellis2 GGUF"
  kv "lab_dir" "$COMFYUI_TRELLIS2_LAB_DIR"
  kv "source_root" "$TRELLIS2_GGUF_SOURCE_ROOT"
  kv "run_validation" "$TRELLIS2_GGUF_RUN_VALIDATION"
}

main() {
  print_context

  if ! check_runtime; then
    error "No existe runtime base: $COMFYUI_TRELLIS2_LAB_DIR"
    exit "$EXIT_MISSING_RUNTIME"
  fi

  if ! check_minimum_models; then
    error "Set minimo incompleto en source root: $TRELLIS2_GGUF_SOURCE_ROOT"
    exit "$EXIT_MISSING_MODELS"
  fi

  [[ -x "$PREPARE_SCRIPT" ]] || die "No existe o no es ejecutable: $PREPARE_SCRIPT"
  [[ -x "$VALIDATION_SCRIPT" ]] || die "No existe o no es ejecutable: $VALIDATION_SCRIPT"

  if ! "$PREPARE_SCRIPT"; then
    error "Fallo en prepare-layout (posible incompatibilidad CUDA/wheels o layout)."
    exit "$EXIT_CUDA_OR_WHEELS"
  fi

  if ! check_layout_outputs; then
    error "Layout incompleto tras prepare-layout."
    exit "$EXIT_LAYOUT_INCOMPLETE"
  fi

  if [[ "$TRELLIS2_GGUF_RUN_VALIDATION" != "1" ]]; then
    kv "status" "install_ok_validation_skipped"
    exit "$EXIT_OK"
  fi

  local validation_log
  validation_log="$(mktemp)"
  if ! "$VALIDATION_SCRIPT" 2>&1 | tee "$validation_log"; then
    local summary_path status_value
    summary_path="$(sed -n 's/^Resumen: //p' "$validation_log" | tail -n 1 || true)"
    status_value=""
    if [[ -n "$summary_path" && -f "$summary_path" ]]; then
      status_value="$(sed -n 's/^status=//p' "$summary_path" | tail -n 1 || true)"
    fi
    rm -f "$validation_log"
    error "Preflight bloqueado: ${status_value:-unknown}"
    exit "$EXIT_PREFLIGHT_BLOCKED"
  fi
  rm -f "$validation_log"

  kv "status" "install_ok_preflight_pass"
  exit "$EXIT_OK"
}

main "$@"
