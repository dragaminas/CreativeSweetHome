#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/common.sh"

cmd="${1:-status}"

print_blender_version() {
  local blender_bin="$1"
  local stderr_file version_output

  stderr_file="$(mktemp)"
  if ! version_output="$("$blender_bin" --version 2>"$stderr_file")"; then
    cat "$stderr_file" >&2
    rm -f "$stderr_file"
    return 1
  fi

  rm -f "$stderr_file"
  printf '%s\n' "$version_output" | sed -n '1,2p'
}

case "$cmd" in
  status)
    print_header "Blender"
    if [[ -n "$BLENDER_BIN" && -x "$BLENDER_BIN" ]]; then
      kv "blender_bin" "$BLENDER_BIN"
      print_blender_version "$BLENDER_BIN"
    else
      die "Blender no esta instalado o BLENDER_BIN no es ejecutable"
    fi
    ;;
  new-project)
    target_name="${2:-untitled}"
    target_dir="$STUDIO_DIR/BlenderProjects/$target_name"
    mkdir -p "$target_dir"
    target_file="$target_dir/$target_name.blend"
    if [[ -n "$BLENDER_BIN" && -x "$BLENDER_BIN" ]]; then
      "$BLENDER_BIN" --background --factory-startup \
        --python-expr "import bpy; bpy.ops.wm.save_as_mainfile(filepath=r'$target_file')" >/tmp/openclaw-blender-create.log 2>&1
    else
      touch "$target_file"
    fi
    kv "project_dir" "$target_dir"
    kv "project_file" "$target_file"
    ;;
  open-project)
    project_file="${2:-}"
    [[ -n "$project_file" ]] || die "Debes indicar un archivo .blend"
    [[ -f "$project_file" ]] || die "No existe el archivo: $project_file"
    if [[ -z "${DISPLAY:-}" && -z "${WAYLAND_DISPLAY:-}" ]]; then
      warn "No hay sesion grafica detectada; no se lanza Blender"
      kv "project_file" "$project_file"
      exit 0
    fi
    nohup "$BLENDER_BIN" "$project_file" >/tmp/openclaw-blender-launch.log 2>&1 &
    kv "project_file" "$project_file"
    kv "launcher" "started"
    ;;
  smoke-test)
    test_name="${2:-smoke-test}"
    target_dir="$STUDIO_DIR/BlenderProjects/$test_name"
    blend_file="$target_dir/$test_name.blend"
    render_file="$target_dir/$test_name.png"
    helper_py="$SCRIPT_DIR/blender_smoke_test.py"
    mkdir -p "$target_dir"
    [[ -x "$BLENDER_BIN" ]] || die "Blender no esta disponible"
    [[ -f "$helper_py" ]] || die "No existe el helper: $helper_py"
    "$BLENDER_BIN" --background --factory-startup \
      --python "$helper_py" -- "$blend_file" "$render_file" >/tmp/openclaw-blender-smoke.log 2>&1
    [[ -f "$blend_file" ]] || die "No se genero el .blend esperado"
    [[ -f "$render_file" ]] || die "No se genero el render esperado"
    kv "project_dir" "$target_dir"
    kv "project_file" "$blend_file"
    kv "render_file" "$render_file"
    ;;
  rigging-smoke-test)
    target_ref="${2:-rigging-smoke}"
    persist_mode="${3:-audit}"
    helper_py="$SCRIPT_DIR/blender_rigging_smoke_test.py"
    if [[ "$target_ref" == */* || "$target_ref" == .* ]]; then
      target_dir="$target_ref"
    else
      target_dir="$STUDIO_DIR/BlenderProjects/$target_ref"
    fi
    report_file="$target_dir/rigging-smoke-report.json"
    mkdir -p "$target_dir"
    [[ "$persist_mode" == "audit" || "$persist_mode" == "apply" ]] || \
      die "Persist mode invalido: $persist_mode. Usa audit o apply"
    [[ -x "$BLENDER_BIN" ]] || die "Blender no esta disponible"
    [[ -f "$helper_py" ]] || die "No existe el helper: $helper_py"
    "$BLENDER_BIN" --background --factory-startup \
      --python "$helper_py" -- "$target_dir" "$report_file" "$persist_mode"
    [[ -f "$report_file" ]] || die "No se genero el reporte de rigging smoke"
    report_status="$(python3 - "$report_file" <<'PY'
import json
import sys

payload = json.loads(open(sys.argv[1], encoding="utf-8").read())
print(payload.get("status", ""))
PY
)"
    [[ "$report_status" == "pass" ]] || die "Rigging smoke devolvio status=$report_status"
    kv "target_dir" "$target_dir"
    kv "report_file" "$report_file"
    ;;
  pre-rig-cleanup)
    config_json="${2:-}"
    helper_py="$SCRIPT_DIR/blender_pre_rig_cleanup.py"
    [[ -n "$config_json" ]] || die "Debes indicar el archivo JSON de configuracion"
    [[ -f "$config_json" ]] || die "No existe el archivo de configuracion: $config_json"
    [[ -x "$BLENDER_BIN" ]] || die "Blender no esta disponible"
    [[ -f "$helper_py" ]] || die "No existe el helper: $helper_py"
    "$BLENDER_BIN" --background --factory-startup \
      --python "$helper_py" -- "$config_json"
    ;;
  *)
    die "Uso: $0 [status|new-project <nombre>|open-project <archivo.blend>|smoke-test <nombre>|rigging-smoke-test <nombre|dir> [audit|apply]|pre-rig-cleanup <config.json>]"
    ;;
esac
