#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/common.sh"

cmd="${1:-status}"

resolve_instant_meshes_bin() {
  if [[ -n "${INSTANT_MESHES_BIN:-}" && -x "${INSTANT_MESHES_BIN:-}" ]]; then
    printf '%s\n' "$INSTANT_MESHES_BIN"
    return 0
  fi

  if [[ -n "${INSTANT_MESHES_DIR:-}" && -x "${INSTANT_MESHES_DIR:-}/InstantMeshes" ]]; then
    printf '%s\n' "${INSTANT_MESHES_DIR}/InstantMeshes"
    return 0
  fi

  if [[ -n "${INSTANT_MESHES_BUILD_DIR:-}" && -x "${INSTANT_MESHES_BUILD_DIR:-}/InstantMeshes" ]]; then
    printf '%s\n' "${INSTANT_MESHES_BUILD_DIR}/InstantMeshes"
    return 0
  fi

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

case "$cmd" in
  status)
    print_header "Instant Meshes"
    if instant_meshes_bin="$(resolve_instant_meshes_bin)"; then
      kv "instant_meshes_bin" "$instant_meshes_bin"
      "$instant_meshes_bin" -h 2>&1 | sed -n '1,12p' || true
    else
      die "Instant Meshes no esta instalado o INSTANT_MESHES_BIN no es ejecutable"
    fi
    ;;
  remesh)
    input_mesh="${2:-}"
    output_mesh="${3:-}"
    shift 3 || true

    [[ -n "$input_mesh" ]] || die "Debes indicar el mesh de entrada"
    [[ -n "$output_mesh" ]] || die "Debes indicar el mesh de salida"
    [[ -f "$input_mesh" ]] || die "No existe el mesh de entrada: $input_mesh"

    instant_meshes_bin="$(resolve_instant_meshes_bin)" || \
      die "Instant Meshes no esta instalado o INSTANT_MESHES_BIN no es ejecutable"

    faces=""
    vertices=""
    scale=""
    rosy=""
    posy=""
    crease=""
    smooth=""
    threads=""
    deterministic="false"
    dominant="false"
    intrinsic="false"
    boundaries="false"

    while [[ $# -gt 0 ]]; do
      case "$1" in
        --faces)
          faces="${2:-}"
          shift 2
          ;;
        --vertices)
          vertices="${2:-}"
          shift 2
          ;;
        --scale)
          scale="${2:-}"
          shift 2
          ;;
        --rosy)
          rosy="${2:-}"
          shift 2
          ;;
        --posy)
          posy="${2:-}"
          shift 2
          ;;
        --crease)
          crease="${2:-}"
          shift 2
          ;;
        --smooth)
          smooth="${2:-}"
          shift 2
          ;;
        --threads)
          threads="${2:-}"
          shift 2
          ;;
        --deterministic)
          deterministic="true"
          shift
          ;;
        --dominant)
          dominant="true"
          shift
          ;;
        --intrinsic)
          intrinsic="true"
          shift
          ;;
        --boundaries)
          boundaries="true"
          shift
          ;;
        *)
          die "Flag no soportado para remesh: $1"
          ;;
      esac
    done

    size_constraints=0
    [[ -n "$faces" ]] && size_constraints=$((size_constraints + 1))
    [[ -n "$vertices" ]] && size_constraints=$((size_constraints + 1))
    [[ -n "$scale" ]] && size_constraints=$((size_constraints + 1))
    [[ "$size_constraints" -le 1 ]] || \
      die "Solo puedes usar uno de --faces, --vertices o --scale"

    mkdir -p "$(dirname "$output_mesh")"

    command=("$instant_meshes_bin" -o "$output_mesh")
    [[ -n "$faces" ]] && command+=(-f "$faces")
    [[ -n "$vertices" ]] && command+=(-v "$vertices")
    [[ -n "$scale" ]] && command+=(-s "$scale")
    [[ -n "$rosy" ]] && command+=(-r "$rosy")
    [[ -n "$posy" ]] && command+=(-p "$posy")
    [[ -n "$crease" ]] && command+=(-c "$crease")
    [[ -n "$smooth" ]] && command+=(-S "$smooth")
    [[ -n "$threads" ]] && command+=(-t "$threads")
    [[ "$deterministic" == "true" ]] && command+=(-d)
    [[ "$dominant" == "true" ]] && command+=(-D)
    [[ "$intrinsic" == "true" ]] && command+=(-i)
    [[ "$boundaries" == "true" ]] && command+=(-b)
    command+=("$input_mesh")

    "${command[@]}"
    [[ -f "$output_mesh" ]] || die "Instant Meshes no genero el output esperado"
    kv "input_mesh" "$input_mesh"
    kv "output_mesh" "$output_mesh"
    ;;
  *)
    die "Uso: $0 [status|remesh <input_mesh> <output_mesh> [flags]]"
    ;;
esac
