# Script de Instalacion Automatizada de Trellis2 GGUF

Nota: este archivo queda como nota de apoyo y borrador operativo. La
documentacion canonica del estado y de las tareas activas vive ahora en:

- `docs/devplan/01-phase-index.md`
- `docs/devplan/tasks/11.10.4-trellis2-installation-docs.md`
- `docs/comfyui/trellis2-gguf-interface.md`

## Objetivo
Implementar una instalacion reproducible de Trellis2 GGUF en un runtime ComfyUI aislado, con verificaciones automaticas y evidencia de cierre para habilitar su promocion progresiva como motor 3D por defecto.

## Estado de partida (corte 2026-04-26)
- Trellis2 GGUF Q4 texturizado: `go_tecnico_trellis_q4_textured`
- Runtime de laboratorio existente: `~/ComfyUI-trellis2-lab`
- Preflight existente: `scripts/apps/comfyui-trellis2-gguf-validation.sh`
- Preparacion de layout existente: `scripts/apps/comfyui-trellis2-gguf-prepare-layout.sh`
- Bloqueos pendientes para default productivo: comparativa visual formal, import Blender sistematico y rollout controlado

## Alcance
- Instalar y dejar operativo Trellis2 GGUF en entorno aislado
- Verificar set minimo de modelos, layout ejecutable y compatibilidad CUDA
- Producir artefactos de validacion reproducibles
- Definir gate de promocion a default y rollback a Hunyuan3D

Fuera de alcance:
- Reemplazar de inmediato el runtime principal sin rollout
- Eliminar Hunyuan3D antes de completar gates de calidad y operacion

## Estrategia de implementacion progresiva

### Etapa 1: Instalacion reproducible (lab)
Resultado esperado: runtime aislado listo con layout y dependencias validadas.

Pasos:
1. Verificar runtime aislado y estructura base
2. Ejecutar preparacion de layout y enlaces de modelos
3. Ajustar DINOv3 (`model.safetensors` + `config.json`)
4. Verificar wheels/compatibilidad (`o_voxel`, `flex_gemm`, `nvdiffrast`)

Comando canonico:
```bash
bash scripts/apps/comfyui-trellis2-gguf-prepare-layout.sh
```

Criterios de aceptacion (todos obligatorios):
- Exit code `0`
- Existe `models/microsoft/TRELLIS.2-4B/pipeline.json`
- Existe `models/facebook/dinov3-vitl16-pretrain-lvd1689m/config.json`
- `o_voxel` carga sin error CUDA en el `.venv` del laboratorio

### Etapa 2: Preflight verificable
Resultado esperado: gate automatico en estado `pass_preflight`.

Comando canonico:
```bash
bash scripts/apps/comfyui-trellis2-gguf-validation.sh
```

Artefactos obligatorios:
- `trellis2_gguf_validation_summary.txt`
- `trellis2_gguf_validation_summary.json`
- `minimum_models_check.txt`
- `workflow_model_layout_check.txt`
- `o_voxel_cuda_check.txt`

Criterios de aceptacion:
- `status=pass_preflight`
- Set minimo de modelos `7/7`
- Sin `blocked_*` en resumen final

### Etapa 3: Validacion funcional de producto
Resultado esperado: evidencia de salida 3D usable y comparable.

Pasos:
1. Ejecutar workflow fixture historico (`openclaw_object_ref.png`)
2. Ejecutar una imagen creativa real adicional
3. Importar ambos GLB en Blender
4. Registrar metrica minima: vertices, caras, texturas, tamano, runtime

Criterios de aceptacion:
- Minimo 2 GLB validos (fixture + creativa)
- Import Blender exitoso para ambos
- Reporte actualizado en `docs/comfyui/trellis2-gguf-validation-results.md`

### Etapa 4: Promocion controlada a default
Resultado esperado: Trellis2 como motor por defecto con fallback estable.

Pasos:
1. Activar selector por defecto `trellis2_gguf_q4_textured`
2. Mantener `hunyuan3d_native` como fallback automatico ante `blocked_*`
3. Publicar criterio de rollback y monitoreo

Criterios de aceptacion:
- Ruta por defecto usa Trellis2 cuando preflight pasa
- Ruta fallback se activa sin intervencion manual cuando preflight falla
- Decision documentada en `docs/devplan/01-phase-index.md` y en el reporte de validacion

## Contrato de ejecucion del script objetivo
Archivo objetivo: `scripts/apps/install-trellis2-gguf.sh`

Entradas:
- `COMFYUI_TRELLIS2_LAB_DIR` (default: `$HOME/ComfyUI-trellis2-lab`)
- `TRELLIS2_GGUF_SOURCE_ROOT` (default: `$COMFYUI_TRELLIS2_LAB_DIR/models/Aero-Ex/Trellis2-GGUF`)
- `TRELLIS2_GGUF_RUN_VALIDATION` (`1|0`, default `1`)

Comportamiento:
1. Valida prerequisitos y rutas
2. Ejecuta layout
3. Ejecuta preflight (si `TRELLIS2_GGUF_RUN_VALIDATION=1`)
4. Emite resumen final y codigo de salida

Codigos de salida:
- `0`: instalacion y validacion correctas
- `10`: falta runtime base
- `11`: faltan modelos minimos
- `12`: layout incompleto
- `13`: error de compatibilidad CUDA/wheels
- `14`: preflight en `blocked_*`

## Definicion de Done
La tarea se considera cerrada cuando:
- existe script ejecutable `scripts/apps/install-trellis2-gguf.sh`
- existe evidencia de al menos una ejecucion `pass_preflight`
- existe reporte funcional con import Blender y comparativa visual minima
- existe criterio de default + fallback + rollback documentado

## Riesgos y mitigacion
- Riesgo: drift de versiones de nodos/wheels
  - Mitigacion: registrar commit hash y versionado en reporte de cada corrida
- Riesgo: regresion de CUDA por update de Torch
  - Mitigacion: gate `o_voxel_cuda_check.txt` obligatorio antes de marcar ready
- Riesgo: promocion apresurada a default
  - Mitigacion: rollout por etapas con fallback automatico a Hunyuan3D

## Uso previsto
```bash
chmod +x scripts/apps/install-trellis2-gguf.sh
scripts/apps/install-trellis2-gguf.sh
```

Con validacion desactivada:
```bash
TRELLIS2_GGUF_RUN_VALIDATION=0 scripts/apps/install-trellis2-gguf.sh
```
