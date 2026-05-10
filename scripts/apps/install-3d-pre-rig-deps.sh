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
      case "$package_manager" in
        apt)
          require_or_install_packages "$package_manager" blender
          ;;
        pacman)
          require_or_install_packages "$package_manager" blender
          ;;
      esac
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

resolve_instant_meshes_bin() {
  local candidates=()
  if [[ -n "${INSTANT_MESHES_BIN:-}" ]]; then
    candidates+=("$INSTANT_MESHES_BIN")
  fi
  candidates+=(
    "$INSTANT_MESHES_DIR/InstantMeshes"
    "$INSTANT_MESHES_BUILD_DIR/InstantMeshes"
  )

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  if command -v InstantMeshes >/dev/null 2>&1; then
    command -v InstantMeshes
    return 0
  fi
  if command -v instant-meshes >/dev/null 2>&1; then
    command -v instant-meshes
    return 0
  fi
  return 1
}

ensure_instant_meshes_host_prereqs() {
  print_header "Instant Meshes Host Prereqs"
  kv "install_method" "$INSTANT_MESHES_INSTALL_METHOD"

  local package_manager
  package_manager="$(resolve_linux_package_manager)"
  if [[ "$package_manager" == "missing" ]]; then
    if [[ "$mode" == "apply" ]]; then
      die "No se detecto apt ni pacman para instalar prerequisitos de Instant Meshes"
    fi
    warn "No se detecto apt ni pacman para instalar prerequisitos de Instant Meshes"
    return 0
  fi

  case "$package_manager" in
    apt)
      require_or_install_packages "$package_manager" \
        git cmake build-essential zenity \
        libxrandr-dev libxinerama-dev libxcursor-dev libxi-dev
      ;;
    pacman)
      require_or_install_packages "$package_manager" \
        git cmake gcc zenity \
        libxrandr libxinerama libxcursor libxi
      ;;
  esac
}

resolve_instant_meshes_ref_type() {
  local requested_ref="$INSTANT_MESHES_REPO_REF"
  local ref_type

  if ! command -v git >/dev/null 2>&1; then
    if [[ "$mode" == "apply" ]]; then
      die "git es obligatorio para gestionar el checkout de Instant Meshes"
    fi
    warn "git no esta disponible; se omite la validacion del ref de Instant Meshes en audit"
    printf 'branch\n'
    return 0
  fi

  ref_type="$(remote_git_ref_type "$INSTANT_MESHES_REPO_URL" "$requested_ref")"
  [[ "$ref_type" != "missing" ]] || die "No existe el ref de Instant Meshes: $requested_ref"
  printf '%s\n' "$ref_type"
}

sync_instant_meshes_checkout() {
  local ref_type="$1"

  print_header "Instant Meshes Checkout"
  kv "repo_url" "$INSTANT_MESHES_REPO_URL"
  kv "repo_ref" "$INSTANT_MESHES_REPO_REF"
  kv "repo_ref_type" "$ref_type"
  kv "install_dir" "$INSTANT_MESHES_DIR"
  kv "build_dir" "$INSTANT_MESHES_BUILD_DIR"

  if [[ ! -e "$INSTANT_MESHES_DIR" ]]; then
    if [[ "$mode" != "apply" ]]; then
      warn "Instant Meshes aun no esta clonado en $INSTANT_MESHES_DIR"
      return 0
    fi
    git clone --recursive "$INSTANT_MESHES_REPO_URL" "$INSTANT_MESHES_DIR"
  elif [[ ! -d "$INSTANT_MESHES_DIR/.git" ]]; then
    die "El directorio $INSTANT_MESHES_DIR existe pero no es un checkout git"
  fi

  if [[ -d "$INSTANT_MESHES_DIR/.git" && "$mode" == "apply" ]]; then
    if [[ "$ref_type" == "tag" ]]; then
      git -C "$INSTANT_MESHES_DIR" fetch --depth 1 origin "refs/tags/$INSTANT_MESHES_REPO_REF:refs/tags/$INSTANT_MESHES_REPO_REF"
      git -C "$INSTANT_MESHES_DIR" checkout --detach "$INSTANT_MESHES_REPO_REF"
    else
      git -C "$INSTANT_MESHES_DIR" fetch --depth 1 origin "$INSTANT_MESHES_REPO_REF"
      git -C "$INSTANT_MESHES_DIR" checkout -B "$INSTANT_MESHES_REPO_REF" "origin/$INSTANT_MESHES_REPO_REF"
    fi
    git -C "$INSTANT_MESHES_DIR" submodule update --init --recursive
  fi

  if [[ -d "$INSTANT_MESHES_DIR/.git" ]]; then
    kv "git_head" "$(git -C "$INSTANT_MESHES_DIR" rev-parse --short HEAD)"
  fi
}

find_instant_meshes_binary() {
  local candidate
  local candidates=(
    "$INSTANT_MESHES_BUILD_DIR/InstantMeshes"
    "$INSTANT_MESHES_DIR/InstantMeshes"
    "$INSTANT_MESHES_BUILD_DIR/Instant Meshes"
    "$INSTANT_MESHES_DIR/Instant Meshes"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  find "$INSTANT_MESHES_BUILD_DIR" -maxdepth 2 -type f -perm -111 \
    \( -name 'InstantMeshes*' -o -name 'Instant Meshes*' \) | head -n 1
}

build_instant_meshes() {
  print_header "Instant Meshes Build"
  kv "install_method" "$INSTANT_MESHES_INSTALL_METHOD"
  kv "build_jobs" "$INSTANT_MESHES_BUILD_JOBS"

  if instant_meshes_bin="$(resolve_instant_meshes_bin)"; then
    kv "instant_meshes_bin" "$instant_meshes_bin"
    "$instant_meshes_bin" -h 2>&1 | sed -n '1,12p' || true
    return 0
  fi

  [[ "$INSTANT_MESHES_INSTALL_METHOD" == "source" ]] || \
    die "Metodo no soportado para Instant Meshes: $INSTANT_MESHES_INSTALL_METHOD"

  if [[ "$mode" != "apply" ]]; then
    warn "Instant Meshes no esta construido todavia"
    return 0
  fi

  mkdir -p "$INSTANT_MESHES_BUILD_DIR"
  cmake -S "$INSTANT_MESHES_DIR" -B "$INSTANT_MESHES_BUILD_DIR" -DCMAKE_BUILD_TYPE=Release
  cmake --build "$INSTANT_MESHES_BUILD_DIR" -j "$INSTANT_MESHES_BUILD_JOBS"

  instant_meshes_bin="$(find_instant_meshes_binary)" || true
  [[ -n "${instant_meshes_bin:-}" && -x "${instant_meshes_bin:-}" ]] || \
    die "No se encontro el binario de Instant Meshes despues del build"

  ln -sfn "$instant_meshes_bin" "$INSTANT_MESHES_DIR/InstantMeshes"
  kv "instant_meshes_bin" "$instant_meshes_bin"
  "$instant_meshes_bin" -h 2>&1 | sed -n '1,12p' || true
}

print_header "Instalacion de dependencias Phase 13"
kv "mode" "$mode"
kv "pre_rig_3d_deps_install" "$PRE_RIG_3D_DEPS_INSTALL"

ensure_blender_installed
ensure_instant_meshes_host_prereqs
instant_meshes_ref_type="$(resolve_instant_meshes_ref_type)"
sync_instant_meshes_checkout "$instant_meshes_ref_type"
build_instant_meshes
