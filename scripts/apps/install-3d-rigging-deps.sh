#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/common.sh"

mode="$(run_mode "${1:-${DEFAULT_MODE:-audit}}")"

resolve_linux_package_manager() {
  if command -v apt-get >/dev/null 2>&1; then
    printf 'apt\n'
    return 0
  fi
  if command -v pacman >/dev/null 2>&1; then
    printf 'pacman\n'
    return 0
  fi
  printf 'missing\n'
}

sudo_install_packages() {
  local package_manager="$1"
  shift
  local packages=("$@")

  [[ ${#packages[@]} -gt 0 ]] || return 0

  case "$package_manager" in
    apt)
      sudo apt-get update
      sudo apt-get install -y "${packages[@]}"
      ;;
    pacman)
      sudo pacman -S --noconfirm --needed "${packages[@]}"
      ;;
    *)
      die "No se soporta auto-instalacion para package manager: $package_manager"
      ;;
  esac
}

package_installed() {
  local package_manager="$1"
  local package_name="$2"

  case "$package_manager" in
    apt)
      dpkg -s "$package_name" >/dev/null 2>&1
      ;;
    pacman)
      pacman -Q "$package_name" >/dev/null 2>&1
      ;;
    *)
      return 1
      ;;
  esac
}

require_or_install_packages() {
  local package_manager="$1"
  shift
  local requested_packages=("$@")
  local missing_packages=()
  local package_name

  for package_name in "${requested_packages[@]}"; do
    if package_installed "$package_manager" "$package_name"; then
      continue
    fi
    missing_packages+=("$package_name")
  done

  if [[ ${#missing_packages[@]} -eq 0 ]]; then
    log "Todos los paquetes requeridos ya estan instalados"
    return 0
  fi

  if [[ "$mode" != "apply" ]]; then
    warn "Faltaria instalar paquetes del host: ${missing_packages[*]}"
    return 0
  fi

  print_header "Instalando paquetes del host"
  log "package_manager=$package_manager"
  log "packages=${missing_packages[*]}"
  sudo_install_packages "$package_manager" "${missing_packages[@]}"
}

blender_binary_candidates() {
  local candidates=()
  if [[ -n "${BLENDER_BIN:-}" ]]; then
    candidates+=("$BLENDER_BIN")
  fi
  candidates+=(
    "/snap/bin/blender"
    "/usr/bin/blender"
  )
  printf '%s\n' "${candidates[@]}"
}

resolve_blender_bin() {
  local candidate
  while IFS= read -r candidate; do
    [[ -n "$candidate" ]] || continue
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done < <(blender_binary_candidates)

  if command -v blender >/dev/null 2>&1; then
    command -v blender
    return 0
  fi
  return 1
}

ensure_blender_installed() {
  print_header "Blender"
  kv "install_method" "$BLENDER_INSTALL_METHOD"

  if blender_bin="$(resolve_blender_bin)"; then
    kv "blender_bin" "$blender_bin"
    "$blender_bin" --version | sed -n '1,2p'
    return 0
  fi

  warn "Blender no esta instalado"
  case "$BLENDER_INSTALL_METHOD" in
    system-package)
      local package_manager
      package_manager="$(resolve_linux_package_manager)"
      if [[ "$package_manager" == "missing" ]]; then
        if [[ "$mode" == "apply" ]]; then
          die "No se detecto apt ni pacman para instalar Blender"
        fi
        warn "No se detecto apt ni pacman para instalar Blender"
        return 0
      fi
      require_or_install_packages "$package_manager" blender
      ;;
    manual)
      if [[ "$mode" == "apply" ]]; then
        die "BLENDER_INSTALL_METHOD=manual y Blender no esta instalado"
      fi
      warn "Configura BLENDER_BIN o instala Blender manualmente"
      ;;
    *)
      die "Valor invalido de BLENDER_INSTALL_METHOD: $BLENDER_INSTALL_METHOD"
      ;;
  esac

  if [[ "$mode" != "apply" ]]; then
    return 0
  fi

  blender_bin="$(resolve_blender_bin)" || die "Blender sigue sin estar disponible despues de la instalacion"
  kv "blender_bin" "$blender_bin"
  "$blender_bin" --version | sed -n '1,2p'
}

blender_version_tuple() {
  local blender_bin="$1"
  "$blender_bin" --version | sed -n '1p' | python3 -c 'import re, sys; line=sys.stdin.read().strip(); match=re.search(r"([0-9]+(?:\.[0-9]+){1,2})", line); print(match.group(1) if match else "")'
}

version_is_less_than() {
  local current_version="$1"
  local minimum_version="$2"
  python3 - "$current_version" "$minimum_version" <<'PY'
import sys

def normalize(raw: str) -> tuple[int, int, int]:
    parts = [int(part) for part in raw.split(".") if part]
    while len(parts) < 3:
        parts.append(0)
    return tuple(parts[:3])

current = normalize(sys.argv[1])
minimum = normalize(sys.argv[2])
raise SystemExit(0 if current < minimum else 1)
PY
}

ensure_supported_blender_version() {
  local blender_bin="$1"
  local current_version
  current_version="$(blender_version_tuple "$blender_bin")"
  [[ -n "$current_version" ]] || {
    if [[ "$mode" == "apply" ]]; then
      die "No se pudo resolver la version de Blender"
    fi
    warn "No se pudo resolver la version de Blender"
    return 0
  }

  print_header "Blender Rigging Version Gate"
  kv "current_version" "$current_version"
  kv "minimum_version" "$BLENDER_RIGGING_MIN_VERSION"

  if version_is_less_than "$current_version" "$BLENDER_RIGGING_MIN_VERSION"; then
    if [[ "$mode" == "apply" ]]; then
      die "Blender $current_version queda por debajo del minimo soportado para rigging: $BLENDER_RIGGING_MIN_VERSION"
    fi
    warn "Blender $current_version queda por debajo del minimo soportado para rigging: $BLENDER_RIGGING_MIN_VERSION"
  fi
}

parse_report_field() {
  local report_path="$1"
  local expression="$2"
  python3 - "$report_path" "$expression" <<'PY'
import json
import sys

report = json.loads(open(sys.argv[1], encoding="utf-8").read())
expression = sys.argv[2]
value = report
for key in expression.split("."):
    value = value[key]
print(value)
PY
}

run_rigging_smoke() {
  local temp_dir report_path
  temp_dir="$(mktemp -d)"
  report_path="$temp_dir/rigging-smoke-report.json"
  trap 'rm -rf "$temp_dir"' RETURN

  print_header "Blender Rigging Smoke"
  kv "persist_mode" "$mode"
  kv "temp_dir" "$temp_dir"

  if "$SCRIPT_DIR/blender.sh" rigging-smoke-test "$temp_dir" "$mode"; then
    local status message
    status="$(parse_report_field "$report_path" status)"
    message="$(parse_report_field "$report_path" message)"
    kv "report_path" "$report_path"
    kv "status" "$status"
    kv "message" "$message"
    return 0
  fi

  if [[ -f "$report_path" ]]; then
    warn "Rigging smoke report: $report_path"
    warn "$(parse_report_field "$report_path" message)"
  fi

  if [[ "$mode" == "apply" ]]; then
    die "Blender no pudo completar el smoke de rigging"
  fi

  warn "Blender no pudo completar el smoke de rigging en audit"
}

print_header "Instalacion de dependencias Phase 14"
kv "mode" "$mode"
kv "rigging_3d_deps_install" "$RIGGING_3D_DEPS_INSTALL"

ensure_blender_installed
blender_bin="$(resolve_blender_bin || true)"
if [[ -z "${blender_bin:-}" ]]; then
  warn "Se omite el gate de version y el smoke de rigging porque Blender no esta disponible"
  exit 0
fi

ensure_supported_blender_version "$blender_bin"
run_rigging_smoke
