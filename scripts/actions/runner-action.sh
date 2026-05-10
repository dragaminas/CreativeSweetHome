#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/common.sh"

command_name="${1:-help}"
runner_id="${2:-}"

print_help() {
  cat <<EOF
Comandos disponibles:
- help
- describe <runner_id>
- list-targets <runner_id> <operation_kind>
- start <runner_id> <operation_kind> [target_id] [--inputs-json '{...}'] [--options-json '{...}']
- status <runner_id> <run_id>
- cancel <runner_id> <run_id>
- result <runner_id> <run_id>
Variables opcionales:
- OPENCLAW_RUNNER_INPUTS_JSON
- OPENCLAW_RUNNER_OPTIONS_JSON
EOF
}

cli_has_flag() {
  local needle="$1"
  shift
  local arg
  for arg in "$@"; do
    if [[ "$arg" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

resolve_python_bin() {
  if [[ -n "${OPENCLAW_STUDIO_PYTHON_BIN:-}" && -x "${OPENCLAW_STUDIO_PYTHON_BIN:-}" ]]; then
    printf '%s\n' "$OPENCLAW_STUDIO_PYTHON_BIN"
    return 0
  fi

  if [[ "$runner_id" == "comfyui" ]]; then
    local comfy_python="${COMFYUI_VENV_DIR:-$COMFYUI_DIR/.venv}/bin/python"
    if [[ -x "$comfy_python" ]]; then
      printf '%s\n' "$comfy_python"
      return 0
    fi
  fi

  command -v python3
}

case "$command_name" in
  help)
    print_help
    ;;
  describe|list-targets|start|status|cancel|result)
    python_bin="$(resolve_python_bin)"
    export PYTHONPATH="$REPO_ROOT/src${PYTHONPATH:+:$PYTHONPATH}"
    extra_args=()
    if [[ "$command_name" == "start" ]]; then
      if [[ -n "${OPENCLAW_RUNNER_INPUTS_JSON:-}" ]] && ! cli_has_flag "--inputs-json" "$@"; then
        extra_args+=(--inputs-json "$OPENCLAW_RUNNER_INPUTS_JSON")
      fi
      if [[ -n "${OPENCLAW_RUNNER_OPTIONS_JSON:-}" ]] && ! cli_has_flag "--options-json" "$@"; then
        extra_args+=(--options-json "$OPENCLAW_RUNNER_OPTIONS_JSON")
      fi
    fi
    exec "$python_bin" -m openclaw_studio.runner_cli --json "$@" "${extra_args[@]}"
    ;;
  *)
    die "Uso: $0 [help|describe|list-targets|start|status|cancel|result] ..."
    ;;
esac
