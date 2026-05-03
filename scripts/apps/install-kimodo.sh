#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/common.sh"

mode="$(run_mode "${1:-${DEFAULT_MODE:-audit}}")"

require_cmd git
require_cmd python3

# Detecta GPU disponible y recomienda args de torch
detect_gpu_and_recommend_torch() {
  local vendor gpu_memory cuda_version
  
  # Intenta detectar NVIDIA
  if command -v nvidia-smi >/dev/null 2>&1; then
    vendor="nvidia"
    gpu_memory="$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -n1 | awk '{print int($1/1024)}')"
    cuda_version="$(nvidia-smi --query-gpu=compute_cap --format=csv,noheader,nounits 2>/dev/null | head -n1 || echo '8.6')"
    
    log "GPU detectada: NVIDIA (VRAM: ~${gpu_memory}GB, Compute Cap: $cuda_version)"
    printf 'nvidia:%s' "$gpu_memory"
    return 0
  fi
  
  # Intenta detectar AMD (rocm)
  if command -v rocm-smi >/dev/null 2>&1; then
    vendor="amd"
    log "GPU detectada: AMD ROCM"
    printf 'amd:0'
    return 0
  fi
  
  # Fallback: CPU (para máquinas sin GPU)
  log "No se detectó GPU disponible. Usar\u00e1 CPU (más lento)"
  printf 'cpu:0'
  return 0
}

recommend_torch_install_args() {
  local gpu_info vendor gpu_memory
  local cuda_version torch_url
  
  gpu_info="$(detect_gpu_and_recommend_torch)" || return 1
  IFS=':' read -r vendor gpu_memory <<< "$gpu_info"
  
  case "$vendor" in
    nvidia)
      # NVIDIA CUDA - escolle wheel según compute capability
      cuda_version="$(nvidia-smi --query-gpu=compute_cap --format=csv,noheader,nounits 2>/dev/null | head -n1 || echo '8.6')"
      if [[ "$cuda_version" > "11.8" ]]; then
        # Ada (H100, RTX 5000, etc) o Hopper
        printf 'torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124'
      else
        # Ampere/Turing y anteriores
        printf 'torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121'
      fi
      ;;
    amd)
      # AMD ROCM
      printf 'torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm5.7'
      ;;
    cpu)
      # CPU only
      printf 'torch torchvision torchaudio'
      ;;
    *)
      printf 'torch>=2.0'
      ;;
  esac
}

# Instala prerequisitos del host si es necesario
install_host_prerequisites() {
  local missing_prereqs=()
  local cmd
  
  if ! need_motion_correction_build; then
    return 0
  fi
  
  for cmd in cmake g++ git python3-venv; do
    if ! command -v "$cmd" >/dev/null 2>&1 && [[ "$cmd" != "python3-venv" ]]; then
      missing_prereqs+=("$cmd")
    elif [[ "$cmd" == "python3-venv" ]] && ! python3 -m venv --help >/dev/null 2>&1; then
      missing_prereqs+=("python3-venv")
    fi
  done
  
  if [[ ${#missing_prereqs[@]} -eq 0 ]]; then
    log "Todos los prerequisitos del host están disponibles"
    return 0
  fi
  
  if [[ "$mode" != "apply" ]]; then
    warn "Faltan prerequisitos: ${missing_prereqs[*]}"
    return 1
  fi
  
  print_header "Instalando prerequisitos del host"
  warn "Se requiere sudo para instalar: ${missing_prereqs[*]}"
  
  if command -v apt-get >/dev/null 2>&1; then
    # Debian/Ubuntu
    local apt_packages=()
    for cmd in "${missing_prereqs[@]}"; do
      case "$cmd" in
        cmake) apt_packages+=("cmake") ;;
        "g++") apt_packages+=("build-essential") ;;
        git) apt_packages+=("git") ;;
        python3-venv) apt_packages+=("python3-venv") ;;
      esac
    done
    
    log "Ejecutando: sudo apt-get update && sudo apt-get install -y ${apt_packages[*]}"
    if sudo apt-get update && sudo apt-get install -y "${apt_packages[@]}"; then
      log "Prerequisitos instalados correctamente"
      return 0
    else
      die "Fallo al instalar prerequisitos con apt-get"
    fi
  elif command -v pacman >/dev/null 2>&1; then
    # Arch Linux
    local pacman_packages=()
    for cmd in "${missing_prereqs[@]}"; do
      case "$cmd" in
        cmake) pacman_packages+=("cmake") ;;
        "g++") pacman_packages+=("gcc") ;;
        git) pacman_packages+=("git") ;;
        python3-venv) pacman_packages+=("python") ;;
      esac
    done
    
    log "Ejecutando: sudo pacman -S --noconfirm ${pacman_packages[*]}"
    if sudo pacman -S --noconfirm "${pacman_packages[@]}"; then
      log "Prerequisitos instalados correctamente"
      return 0
    else
      die "Fallo al instalar prerequisitos con pacman"
    fi
  else
    die "No se puede auto-instalar prerequisitos. Instala manualmente: ${missing_prereqs[*]}"
  fi
}

# Autentica en Hugging Face si es necesario
authenticate_hugging_face() {
  local hf_cmd
  
  if hf_token_present; then
    kv "hf_auth_status" "ya_autenticado"
    return 0
  fi
  
  if [[ "$mode" != "apply" ]]; then
    return 0
  fi
  
  print_header "Autenticacion de Hugging Face (opcional pero recomendado)"
  log "Kimodo necesita acceso al modelo gated 'meta-llama/Meta-Llama-3-8B-Instruct'"
  log "Opciones:"
  log "  1) Autenticarse ahora interactivamente"
  log "  2) Usar token manualmente: export HF_TOKEN=hf_..."
  log "  3) Ir a https://huggingface.co/settings/tokens para obtener token"
  
  read -p "¿Deseas autenticarte en Hugging Face ahora? (s/n): " -n1 -r
  echo
  if [[ "$REPLY" =~ ^[Ss]$ ]]; then
    if [[ -x "$KIMODO_VENV_DIR/bin/hf" ]]; then
      hf_cmd="$KIMODO_VENV_DIR/bin/hf"
      "$hf_cmd" auth login || warn "Autenticacion cancelada o fallida. Puedes autenticarte luego manualmente."
    elif [[ -x "$KIMODO_VENV_DIR/bin/huggingface-cli" ]]; then
      warn "huggingface-cli esta deprecado; usa hf cuando este disponible"
      "$KIMODO_VENV_DIR/bin/huggingface-cli" login || warn "Autenticacion cancelada o fallida. Puedes autenticarte luego manualmente."
    else
      warn "CLI de Hugging Face no disponible en el venv. Asegurate de autenticarte luego:"
      log "  source $KIMODO_VENV_DIR/bin/activate"
      log "  hf auth login"
    fi
  fi
}

hf_llama_gated_access_ok() {
  [[ -x "$KIMODO_VENV_DIR/bin/python" ]] || return 1
  "$KIMODO_VENV_DIR/bin/python" - <<'PY' >/dev/null 2>&1
from huggingface_hub import hf_hub_download

hf_hub_download(
    repo_id="meta-llama/Meta-Llama-3-8B-Instruct",
    filename="config.json",
)
PY
}

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
  local recommended_torch_args

  [[ -x "$KIMODO_VENV_DIR/bin/python" ]] || die "No existe el python del venv para Kimodo"
  venv_has_pip || die "El venv de Kimodo no dispone de pip"

  log "Instalando pip, setuptools y wheel..."
  "$KIMODO_VENV_DIR/bin/python" -m pip install --upgrade pip setuptools wheel

  # Si KIMODO_TORCH_INSTALL_ARGS no está definido, proponer automáticamente
  if [[ -z "${KIMODO_TORCH_INSTALL_ARGS:-}" ]]; then
    print_header "Detección automática de PyTorch"
    recommended_torch_args="$(recommend_torch_install_args)"
    log "Args de torch recomendados: $recommended_torch_args"
    
    if [[ "$mode" == "apply" ]]; then
      log "Instalando PyTorch automáticamente: $recommended_torch_args"
      read -r -a torch_install_args <<< "$recommended_torch_args"
    else
      warn "Usa: KIMODO_TORCH_INSTALL_ARGS='$recommended_torch_args' para la instalación real"
      KIMODO_TORCH_INSTALL_ARGS="$recommended_torch_args"
    fi
  else
    read -r -a torch_install_args <<< "$KIMODO_TORCH_INSTALL_ARGS"
  fi

  if [[ ${#torch_install_args[@]} -gt 0 ]]; then
    log "Instalando PyTorch..."
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

  print_header "Instalando Kimodo y dependencias"
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

  log "Dependencias de Kimodo instaladas correctamente"
}

report_runtime() {
  if [[ ! -x "$KIMODO_VENV_DIR/bin/python" ]]; then
    warn "Kimodo aun no tiene un venv listo"
    return 0
  fi

  print_header "Estado de la instalacion Kimodo"
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
      warn "[!] Torch no detecta CUDA disponible. Verificar drivers NVIDIA si tienes GPU."
    else
      log "[✓] PyTorch con CUDA disponible y funcionando"
    fi
  else
    warn "PyTorch aun no esta disponible en el venv"
  fi

  if kimodo_available; then
    local kimodo_version
    kimodo_version="$("$KIMODO_VENV_DIR/bin/python" - <<'PY'
from importlib.metadata import version
print(version("kimodo"))
PY
)"
    kv "kimodo_version" "$kimodo_version"
    log "[✓] Kimodo importable y funcional"
  else
    warn "[!] Kimodo aun no esta importable en el venv"
  fi

  if [[ -x "$KIMODO_VENV_DIR/bin/kimodo_gen" ]]; then
    log "[✓] Comando disponible: \$KIMODO_VENV_DIR/bin/kimodo_gen"
    kv "kimodo_gen" "$KIMODO_VENV_DIR/bin/kimodo_gen"
  else
    warn "[!] No existe el entrypoint kimodo_gen en el venv"
  fi

  if [[ -x "$KIMODO_VENV_DIR/bin/kimodo_demo" ]]; then
    log "[✓] Comando disponible: \$KIMODO_VENV_DIR/bin/kimodo_demo"
    kv "kimodo_demo" "$KIMODO_VENV_DIR/bin/kimodo_demo"
  fi

  if need_motion_correction_build; then
    if "$KIMODO_VENV_DIR/bin/python" - <<'PY' >/dev/null 2>&1
import motion_correction
PY
    then
      kv "motion_correction" "available"
      log "[✓] motion_correction compilada y disponible"
    else
      warn "[!] motion_correction no esta importable. La generacion puede ser lenta sin esto."
    fi
  else
    kv "motion_correction" "skipped_experimental"
    warn "[!] motion_correction deshabilitada (KIMODO_SKIP_MOTION_CORRECTION=true)"
  fi

  if hf_token_present; then
    kv "hf_token" "present"
    if hf_llama_gated_access_ok; then
      kv "hf_llama_gated_access" "granted"
      log "[✓] Token de Hugging Face detectado y con acceso al modelo gated."
    else
      kv "hf_llama_gated_access" "denied"
      warn "[!] Token detectado, pero SIN acceso al repo gated meta-llama/Meta-Llama-3-8B-Instruct."
      warn "[!] Solicita acceso en https://huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct"
      warn "[!] Luego ejecuta: source $KIMODO_VENV_DIR/bin/activate && hf auth login"
    fi
  else
    warn "[!] Token de Hugging Face no detectado. Para generar:"
    print_header "Para completar la configuracion:"
    log "Tienes dos opciones:"
    log "  A) source $KIMODO_VENV_DIR/bin/activate && hf auth login"
    log "  B) export HF_TOKEN=hf_... (obtener de https://huggingface.co/settings/tokens)"
  fi

  print_header "Proximos pasos (en modo apply)"
  if [[ "$mode" == "apply" ]]; then
    log "La instalacion se completo. Para usar Kimodo:"
    log "  source $KIMODO_VENV_DIR/bin/activate"
    log "  kimodo_demo  # para demo interactiva"
    log "  kimodo_gen --help  # ver opciones"
  fi
}

main() {
  local resolved_repo_ref resolved_repo_ref_type normalized_extras
  local recommended_torch_args

  print_header "Verificacion de prerequisitos Kimodo"
  
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

  print_header "Configuracion de Kimodo ($mode mode)"
  kv "modo" "$mode"
  kv "metodo_instalacion" "$KIMODO_INSTALL_METHOD"
  kv "repo_url" "$KIMODO_REPO_URL"
  kv "repo_ref" "$KIMODO_REPO_REF"
  kv "repo_ref_tipo" "$resolved_repo_ref_type"
  kv "directorio" "$KIMODO_DIR"
  kv "venv" "$KIMODO_VENV_DIR"
  kv "extras" "${normalized_extras:-base}"
  kv "omitir_motion_correction" "${KIMODO_SKIP_MOTION_CORRECTION:-false}"
  kv "archivo_token_hf" "$KIMODO_HF_TOKEN_FILE"

  # Detección de GPU y recomendación de torch args
  print_header "Deteccion de GPU y PyTorch"
  recommended_torch_args="$(recommend_torch_install_args 2>&1)"
  
  if [[ -z "${KIMODO_TORCH_INSTALL_ARGS:-}" || "$KIMODO_TORCH_INSTALL_ARGS" == "torch>=2.0" ]]; then
    # Default genérico o no definido - usar detección automática
    log "Args de torch recomendados para esta máquina:"
    log "  KIMODO_TORCH_INSTALL_ARGS='$recommended_torch_args'"
    
    if [[ "$mode" == "audit" ]]; then
      log "Usa estos args más optimizados en tu .env o como variable de entorno para apply"
      KIMODO_TORCH_INSTALL_ARGS="$recommended_torch_args"
    fi
  else
    # El usuario ya definió args específicos
    log "Usando args de PyTorch definidos por el usuario:"
    log "  KIMODO_TORCH_INSTALL_ARGS='$KIMODO_TORCH_INSTALL_ARGS'"
  fi
  kv "torch_args" "$KIMODO_TORCH_INSTALL_ARGS"

  # Verificar prerequisitos del host
  print_header "Verificacion de prerequisitos del host"
  if ! check_host_build_prereqs; then
    if ! install_host_prerequisites; then
      warn "Faltan prerequisitos del host que no se pueden instalar automaticamente"
      warn "Instala manualmente: sudo apt-get install cmake build-essential python3-venv"
      if [[ "$mode" == "apply" ]]; then
        die "No se puede continuar sin prerequisitos"
      fi
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
      authenticate_hugging_face
    elif ! kimodo_available; then
      warn "Faltaria instalar o actualizar el paquete Kimodo y sus dependencias"
    fi
  fi

  report_runtime
  
  if [[ "$mode" == "audit" ]]; then
    print_header "Para proceder con la instalacion:"
    log "1. Revisa la configuracion anterior"
    log "2. Si es necesario, ajusta variables en .env o como env vars"
    log "3. Ejecuta: $0 apply"
  fi
}

main "$@"
