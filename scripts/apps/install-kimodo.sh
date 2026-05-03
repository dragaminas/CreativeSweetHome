#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/common.sh"

mode="$(run_mode "${1:-${DEFAULT_MODE:-audit}}")"

require_cmd git
require_cmd python3

ensure_python_310() {
  python3 - <<'PY'
import sys
raise SystemExit(0 if sys.version_info >= (3, 10) else 1)
PY
}

normalize_extras() {
  local raw="${1:-all}"
  case "$raw" in
    ""|base|none)
      printf ''
      ;;
    demo|soma|all)
      printf '%s' "$raw"
      ;;
    *)
      die "Valor invalido de KIMODO_INSTALL_EXTRAS: $raw. Usa base, demo, soma o all"
      ;;
  esac
}

hf_token_present() {
  if [[ -n "${HF_TOKEN:-}" || -n "${HUGGING_FACE_HUB_TOKEN:-}" ]]; then
    return 0
  fi
  [[ -s "$KIMODO_HF_TOKEN_FILE" ]]
}

need_motion_correction_build() {
  [[ "${KIMODO_SKIP_MOTION_CORRECTION:-false}" != "true" ]]
}

check_host_build_prereqs() {
  local missing=0
  local cmd

  if ! need_motion_correction_build; then
    return 0
  fi

  for cmd in cmake g++; do
    if command -v "$cmd" >/dev/null 2>&1; then
      kv "$cmd" "$(command -v "$cmd")"
    else
      warn "Falta prerequisito de build para Kimodo: $cmd"
      missing=1
    fi
  done

  return "$missing"
}

resolve_repo_ref() {
  local requested_ref="$KIMODO_REPO_REF"
  local ref_type

  ref_type="$(remote_git_ref_type "$KIMODO_REPO_URL" "$requested_ref")"
  [[ "$ref_type" != "missing" ]] || die "No existe el ref de Kimodo: $requested_ref"

  printf '%s:%s' "$requested_ref" "$ref_type"
}

sync_source_checkout() {
  local resolved_ref="$1"
  local resolved_ref_type="$2"

  if [[ ! -e "$KIMODO_DIR" ]]; then
    if [[ "$mode" == "apply" ]]; then
      mkdir -p "$(dirname "$KIMODO_DIR")"
      git clone --depth 1 --branch "$resolved_ref" "$KIMODO_REPO_URL" "$KIMODO_DIR"
      log "Repositorio Kimodo clonado"
    else
      warn "Kimodo aun no esta clonado en $KIMODO_DIR"
      return 0
    fi
  elif [[ ! -d "$KIMODO_DIR/.git" ]]; then
    die "KIMODO_DIR existe pero no es un checkout git: $KIMODO_DIR"
  else
    kv "git_head" "$(git -C "$KIMODO_DIR" rev-parse --short HEAD)"
    if [[ "$mode" == "apply" ]]; then
      if [[ "$resolved_ref_type" == "tag" ]]; then
        git -C "$KIMODO_DIR" fetch --depth 1 origin "refs/tags/$resolved_ref:refs/tags/$resolved_ref"
        git -C "$KIMODO_DIR" checkout --detach "$resolved_ref"
      else
        git -C "$KIMODO_DIR" fetch --depth 1 origin "$resolved_ref"
        git -C "$KIMODO_DIR" checkout -B "$resolved_ref" "origin/$resolved_ref"
      fi
      log "Repositorio Kimodo actualizado"
    fi
  fi

  [[ -f "$KIMODO_DIR/pyproject.toml" ]] || die "No existe pyproject.toml en $KIMODO_DIR"
}

ensure_package_root() {
  if [[ "$mode" == "apply" ]]; then
    mkdir -p "$KIMODO_DIR"
  elif [[ ! -d "$KIMODO_DIR" ]]; then
    warn "KIMODO_DIR aun no existe: $KIMODO_DIR"
  fi
}

ensure_venv() {
  if [[ "${KIMODO_CREATE_VENV:-true}" != "true" ]]; then
    [[ -x "$KIMODO_VENV_DIR/bin/python" ]] || die "No existe el venv configurado en $KIMODO_VENV_DIR"
    return 0
  fi

  if [[ ! -x "$KIMODO_VENV_DIR/bin/python" ]]; then
    if [[ "$mode" == "apply" ]]; then
      mkdir -p "$(dirname "$KIMODO_VENV_DIR")"
      python3 -m venv "$KIMODO_VENV_DIR"
      log "Venv de Kimodo creado"
    else
      warn "No existe el venv de Kimodo en $KIMODO_VENV_DIR"
      return 0
    fi
  fi

  [[ -x "$KIMODO_VENV_DIR/bin/python" ]] || die "No se pudo preparar el venv de Kimodo"
  "$KIMODO_VENV_DIR/bin/python" --version
}

venv_has_pip() {
  [[ -x "$KIMODO_VENV_DIR/bin/python" ]] && "$KIMODO_VENV_DIR/bin/python" -m pip --version >/dev/null 2>&1
}

torch_available() {
  "$KIMODO_VENV_DIR/bin/python" - <<'PY' >/dev/null 2>&1
import torch
print(torch.__version__)
PY
}

kimodo_available() {
  "$KIMODO_VENV_DIR/bin/python" - <<'PY' >/dev/null 2>&1
import kimodo
PY
}

install_requirements() {
  local resolved_ref="$1"
  local extra_name="$2"
  local source_target='.'
  local package_target
  local -a torch_install_args=()

  [[ -x "$KIMODO_VENV_DIR/bin/python" ]] || die "No existe el python del venv para Kimodo"
  venv_has_pip || die "El venv de Kimodo no dispone de pip"

  "$KIMODO_VENV_DIR/bin/python" -m pip install --upgrade pip setuptools wheel

  if [[ -n "${KIMODO_TORCH_INSTALL_ARGS:-}" ]]; then
    read -r -a torch_install_args <<< "$KIMODO_TORCH_INSTALL_ARGS"
    "$KIMODO_VENV_DIR/bin/python" -m pip install "${torch_install_args[@]}"
    log "PyTorch preparado para Kimodo"
  elif ! torch_available; then
    die "Kimodo requiere PyTorch 2.0+. Define KIMODO_TORCH_INSTALL_ARGS o instala torch manualmente en el venv"
  fi

  if [[ -n "$extra_name" ]]; then
    source_target=".[${extra_name}]"
    package_target="kimodo[${extra_name}] @ git+${KIMODO_REPO_URL}@${resolved_ref}"
  else
    package_target="git+${KIMODO_REPO_URL}@${resolved_ref}"
  fi

  if [[ "$KIMODO_INSTALL_METHOD" == "source" ]]; then
    (
      cd "$KIMODO_DIR"
      if need_motion_correction_build; then
        "$KIMODO_VENV_DIR/bin/python" -m pip install -e "$source_target"
      else
        SKIP_MOTION_CORRECTION_IN_SETUP=1 \
          "$KIMODO_VENV_DIR/bin/python" -m pip install -e "$source_target"
      fi
    )
  else
    if need_motion_correction_build; then
      "$KIMODO_VENV_DIR/bin/python" -m pip install "$package_target"
    else
      SKIP_MOTION_CORRECTION_IN_SETUP=1 \
        "$KIMODO_VENV_DIR/bin/python" -m pip install "$package_target"
    fi
  fi

  log "Dependencias de Kimodo instaladas"
}

report_runtime() {
  if [[ ! -x "$KIMODO_VENV_DIR/bin/python" ]]; then
    warn "Kimodo aun no tiene un venv listo"
    return 0
  fi

  kv "venv_python" "$KIMODO_VENV_DIR/bin/python"

  if torch_available; then
    local torch_version cuda_available
    torch_version="$("$KIMODO_VENV_DIR/bin/python" - <<'PY'
import torch
print(torch.__version__)
PY
)"
    cuda_available="$("$KIMODO_VENV_DIR/bin/python" - <<'PY'
import torch
print(str(torch.cuda.is_available()).lower())
PY
)"
    kv "torch_version" "$torch_version"
    kv "torch_cuda_available" "$cuda_available"
    if [[ "$cuda_available" != "true" ]]; then
      warn "Torch no detecta CUDA. Kimodo puede arrancar, pero conviene ajustar KIMODO_TORCH_INSTALL_ARGS al wheel correcto"
    fi
  else
    warn "Torch aun no esta disponible en el venv de Kimodo"
  fi

  if kimodo_available; then
    local kimodo_version
    kimodo_version="$("$KIMODO_VENV_DIR/bin/python" - <<'PY'
from importlib.metadata import version
print(version("kimodo"))
PY
)"
    kv "kimodo_version" "$kimodo_version"
  else
    warn "Kimodo aun no esta importable en el venv"
  fi

  if [[ -x "$KIMODO_VENV_DIR/bin/kimodo_gen" ]]; then
    kv "kimodo_gen" "$KIMODO_VENV_DIR/bin/kimodo_gen"
  else
    warn "No existe el entrypoint kimodo_gen en el venv"
  fi

  if [[ -x "$KIMODO_VENV_DIR/bin/kimodo_demo" ]]; then
    kv "kimodo_demo" "$KIMODO_VENV_DIR/bin/kimodo_demo"
  fi

  if need_motion_correction_build; then
    if "$KIMODO_VENV_DIR/bin/python" - <<'PY' >/dev/null 2>&1
import motion_correction
PY
    then
      kv "motion_correction" "available"
    else
      warn "motion_correction no esta importable"
    fi
  else
    kv "motion_correction" "skipped_experimental"
  fi

  if hf_token_present; then
    kv "hf_token" "present"
  else
    warn "Falta token de Hugging Face. El runtime seguira bloqueado hasta hacer 'hf auth login' o poblar $KIMODO_HF_TOKEN_FILE"
  fi
}

main() {
  local resolved_repo_ref resolved_repo_ref_type normalized_extras

  ensure_python_310 || die "Kimodo requiere Python 3.10+ segun la documentacion oficial"

  case "$KIMODO_INSTALL_METHOD" in
    source|package)
      ;;
    *)
      die "KIMODO_INSTALL_METHOD invalido: $KIMODO_INSTALL_METHOD. Usa source o package"
      ;;
  esac

  normalized_extras="$(normalize_extras "${KIMODO_INSTALL_EXTRAS:-all}")"
  IFS=':' read -r resolved_repo_ref resolved_repo_ref_type <<< "$(resolve_repo_ref)"

  print_header "Instalacion de Kimodo"
  kv "mode" "$mode"
  kv "install_method" "$KIMODO_INSTALL_METHOD"
  kv "repo_url" "$KIMODO_REPO_URL"
  kv "repo_ref" "$KIMODO_REPO_REF"
  kv "resolved_repo_ref" "$resolved_repo_ref"
  kv "resolved_repo_ref_type" "$resolved_repo_ref_type"
  kv "kimodo_dir" "$KIMODO_DIR"
  kv "venv_dir" "$KIMODO_VENV_DIR"
  kv "install_extras" "${normalized_extras:-base}"
  kv "skip_motion_correction" "${KIMODO_SKIP_MOTION_CORRECTION:-false}"
  kv "hf_token_file" "$KIMODO_HF_TOKEN_FILE"

  if ! check_host_build_prereqs; then
    if [[ "$mode" == "apply" && "${KIMODO_INSTALL_REQUIREMENTS:-true}" == "true" ]]; then
      die "Faltan prerequisitos de build para Kimodo en el host"
    fi
  fi

  if [[ "$KIMODO_INSTALL_METHOD" == "source" ]]; then
    sync_source_checkout "$resolved_repo_ref" "$resolved_repo_ref_type"
  else
    ensure_package_root
  fi

  ensure_venv

  if [[ "${KIMODO_INSTALL_REQUIREMENTS:-true}" == "true" ]]; then
    if [[ "$mode" == "apply" ]]; then
      install_requirements "$resolved_repo_ref" "$normalized_extras"
    elif ! kimodo_available; then
      warn "Faltaria instalar o actualizar el paquete Kimodo y sus dependencias"
    fi
  fi

  report_runtime
}

main "$@"
