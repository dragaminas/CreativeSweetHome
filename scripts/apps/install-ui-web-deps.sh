#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/common.sh"

mode="$(run_mode "${1:-${DEFAULT_MODE:-audit}}")"

resolve_ui_app_dir() {
  local raw_dir="${OPENCLAW_UI_APP_DIR:-$REPO_ROOT/apps/openclaw-ui}"
  if [[ "$raw_dir" == /* ]]; then
    printf '%s\n' "$raw_dir"
  else
    printf '%s\n' "$REPO_ROOT/$raw_dir"
  fi
}

resolve_playwright_browsers_dir() {
  local app_dir="$1"
  local configured_path="${PLAYWRIGHT_BROWSERS_PATH:-$OPENCLAW_UI_PLAYWRIGHT_BROWSERS_PATH}"

  if [[ "$configured_path" == "0" ]]; then
    printf '%s/node_modules/playwright-core/.local-browsers\n' "$app_dir"
    return 0
  fi

  if [[ "$configured_path" == /* ]]; then
    printf '%s\n' "$configured_path"
  else
    printf '%s\n' "$REPO_ROOT/$configured_path"
  fi
}

playwright_browsers_env_path() {
  local app_dir="$1"
  local configured_path="${PLAYWRIGHT_BROWSERS_PATH:-$OPENCLAW_UI_PLAYWRIGHT_BROWSERS_PATH}"

  if [[ "$configured_path" == "0" ]]; then
    printf '0\n'
    return 0
  fi

  resolve_playwright_browsers_dir "$app_dir"
}

playwright_browser_available() {
  local browsers_dir="$1"
  shopt -s nullglob
  local matches=("$browsers_dir"/chromium-*)
  shopt -u nullglob
  [[ "${#matches[@]}" -gt 0 ]]
}

lockfile_state() {
  local package_json_path="$1"
  local package_lock_path="$2"

  if [[ ! -f "$package_lock_path" ]]; then
    printf 'missing\n'
    return 0
  fi

  if [[ "$package_json_path" -nt "$package_lock_path" ]]; then
    printf 'stale\n'
    return 0
  fi

  printf 'current\n'
}

print_header "Dependencias UI web"

ui_app_dir="$(resolve_ui_app_dir)"
package_json_path="$ui_app_dir/package.json"
package_lock_path="$ui_app_dir/package-lock.json"
node_modules_dir="$ui_app_dir/node_modules"
playwright_browsers_dir="$(resolve_playwright_browsers_dir "$ui_app_dir")"
playwright_browsers_config="${PLAYWRIGHT_BROWSERS_PATH:-$OPENCLAW_UI_PLAYWRIGHT_BROWSERS_PATH}"
playwright_browsers_env_config="$(playwright_browsers_env_path "$ui_app_dir")"
detected_lockfile_state="missing"

kv "mode" "$mode"
kv "ui_app_dir" "$ui_app_dir"
kv "playwright_browsers_path" "$playwright_browsers_config"
kv "resolved_playwright_browsers_dir" "$playwright_browsers_dir"

if command -v node >/dev/null 2>&1; then
  kv "node_bin" "$(command -v node)"
  kv "node_version" "$(node --version)"
else
  warn "Node no esta disponible en PATH"
fi

if command -v npm >/dev/null 2>&1; then
  kv "npm_bin" "$(command -v npm)"
  kv "npm_version" "$(npm --version)"
else
  warn "npm no esta disponible en PATH"
fi

[[ -d "$ui_app_dir" ]] || die "No existe OPENCLAW_UI_APP_DIR: $ui_app_dir"
[[ -f "$package_json_path" ]] || die "No existe package.json en $ui_app_dir"

kv "package_json" "$package_json_path"

detected_lockfile_state="$(lockfile_state "$package_json_path" "$package_lock_path")"
kv "package_lock_state" "$detected_lockfile_state"
if [[ -f "$package_lock_path" ]]; then
  kv "package_lock" "$package_lock_path"
else
  warn "Falta package-lock.json en $ui_app_dir"
fi

if [[ "$detected_lockfile_state" == "stale" ]]; then
  warn "package-lock.json esta desactualizado respecto a package.json"
fi

if [[ -d "$node_modules_dir" ]]; then
  kv "node_modules" "$node_modules_dir"
else
  warn "No existe node_modules en $ui_app_dir"
fi

if [[ -x "$node_modules_dir/.bin/svelte-kit" ]]; then
  kv "sveltekit_cli" "$node_modules_dir/.bin/svelte-kit"
else
  warn "La CLI local de SvelteKit aun no esta instalada"
fi

if [[ -x "$node_modules_dir/.bin/playwright" ]]; then
  kv "playwright_cli" "$node_modules_dir/.bin/playwright"
else
  warn "La CLI local de Playwright aun no esta instalada"
fi

if playwright_browser_available "$playwright_browsers_dir"; then
  kv "playwright_chromium" "available"
else
  warn "No se detecta Chromium de Playwright en $playwright_browsers_dir"
fi

if [[ "$mode" == "apply" ]]; then
  require_cmd node
  require_cmd npm

  if [[ "$playwright_browsers_config" != "0" ]]; then
    mkdir -p "$playwright_browsers_dir"
  fi

  case "$detected_lockfile_state" in
    current)
      log "Instalando dependencias UI con npm ci"
      PLAYWRIGHT_BROWSERS_PATH="$playwright_browsers_env_config" \
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
        npm --prefix "$ui_app_dir" ci
      ;;
    missing|stale)
      warn "Se usa npm install para crear o refrescar package-lock.json"
      PLAYWRIGHT_BROWSERS_PATH="$playwright_browsers_env_config" \
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
        npm --prefix "$ui_app_dir" install
      ;;
    *)
      die "Estado de lockfile no soportado: $detected_lockfile_state"
      ;;
  esac

  log "Instalando Chromium de Playwright"
  PLAYWRIGHT_BROWSERS_PATH="$playwright_browsers_env_config" \
    npm --prefix "$ui_app_dir" exec -- playwright install chromium

  [[ -f "$package_lock_path" ]] || die "package-lock.json sigue ausente tras npm install"
  [[ -x "$node_modules_dir/.bin/svelte-kit" ]] || die "svelte-kit no quedo instalado en node_modules/.bin"
  [[ -x "$node_modules_dir/.bin/playwright" ]] || die "playwright no quedo instalado en node_modules/.bin"
  playwright_browser_available "$playwright_browsers_dir" \
    || die "Chromium de Playwright no quedo disponible tras la instalacion"

  log "Dependencias web de OpenClaw instaladas"
fi
