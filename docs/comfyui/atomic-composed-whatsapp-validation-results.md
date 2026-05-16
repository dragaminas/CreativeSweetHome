# Resultados de Validacion Atomica y Compuesta — ComfyUI Runner

## Resumen

Task 8.18 extendio el runner canonico `comfyui` para ejecutar `validate_atomic`
y `validate_composed` sobre la bateria de pruebas disenada en la task 8.17.

**Estado:** Implementacion completada. Tests unitarios pasando.

## Extension del Runner

### Operaciones soportadas

| operation_kind | target_id ejemplos | descripcion |
|---|---|---|
| `validate_smoke` | `smoke`, `all`, `AT-IMG-02-01` | Validacion smoke existente |
| `validate_atomic` | `atomic`, `all`, `AT-IMG-02-01` | Validacion atomica (6 casos) |
| `validate_composed` | `composed`, `all`, `CP-STILL-01` | Validacion compuesta (3 casos) |

### Casos atomicos

| case_id | display_label | workflow | blocking |
|---|---|---|---|
| `AT-IMG-02-01` | UC-IMG-02 atomic frame baseline | `uc-img-02-z-image-turbo-cn-rtx3060-v1.json` | true |
| `AT-VID-01-01` | UC-VID-01 atomic pre-process baseline | `uc-vid-01-ai-renderer-preprocess-rtx3060-v1.json` | true |
| `AT-VID-02-01` | UC-VID-02 atomic video render baseline | `uc-vid-02-ai-renderer-video-rtx3060-v1.json` | true |
| `AT-IMG-03-01` | UC-IMG-03 atomic style exploration | `uc-img-03-z-image-style-exploration-rtx3060-v1.json` | true |
| `AT-VID-03-01` | UC-VID-03 atomic video template | `uc-vid-03-image-to-video-wan22-template-v1.json` | true |
| `AT-VID-04-01` | UC-VID-04 atomic video upscale | `uc-vid-04-video-upscale-ganx4-template-v1.json` | true |

### Casos compuestos

| case_id | display_label | workflow | blocking |
|---|---|---|---|
| `CP-STILL-01` | UC-IMG-02 -> UC-IMG-03 composed still chain | `uc-img-03-z-image-style-exploration-rtx3060-v1.json` | true |
| `CP-VIDEO-01` | UC-VID-01 -> UC-VID-02 composed video chain | `uc-vid-02-ai-renderer-video-rtx3060-v1.json` | true |
| `CP-MOTION-01` | Motion blur composed chain | `uc-vid-02-general-video-render-rtx3060-v1.json` | true |

## Estructura de directorios

```
$STUDIO_DIR/Validation/comfyui/
├── smoke/
│   └── <run_id>/
│       ├── manifests/run.json
│       ├── manifests/summary.json
│       ├── evidence/
│       ├── logs/
│       ├── fixtures/
│       ├── published/
│       └── output/
├── atomic/
│   └── <run_id>/
│       ├── manifests/run.json
│       ├── manifests/summary.json
│       ├── evidence/
│       ├── logs/
│       ├── fixtures/
│       ├── published/
│       └── output/
└── composed/
    └── <run_id>/
        ├── manifests/run.json
        ├── manifests/summary.json
        ├── evidence/
        ├── logs/
        ├── fixtures/
        ├── published/
        └── output/
```

## Estados de veredicto

| estado | descripcion |
|---|---|
| `pass` | Todos los casos pasaron |
| `soft_pass_with_fallback` | Algunos casos usaron fallbacks pero resultado util |
| `fail_*` | Causa especifica de fallo |
| `blocked_*` | Dependencia no disponible |
| `cancelled` | Cancelado por usuario |

## Tests unitarios

```
46 passed in 0.16s
```

### Cobertura

| Categoria | Tests | descripcion |
|---|---|---|
| `TestAtomicCaseSpecs` | 3 | Validacion de specs atomicos |
| `TestComposedCaseSpecs` | 3 | Validacion de specs compuestos |
| `TestRunnerDescribe` | 3 | Runner describe incluye atomic/composed/smoke |
| `TestRunnerListTargets` | 8 | list_targets para todas las operaciones |
| `TestRunnerStartRun` | 10 | start_run aceptacion, aliases, paths, duplicados |
| `TestRunnerNormalizeTargets` | 8 | Normalizacion de targets atomicos y compuestos |
| `TestBuildValidationPaths` | 3 | Estructura de paths atomicos y compuestos |
| `TestExecuteRunUnsupported` | 1 | Operaciones no soportadas |
| `TestSmokeValidationImports` | 5 | Imports y separacion de specs |

## Verificacion

### Static checks

```bash
bash -n scripts/actions/runner-action.sh  # OK
python3 -m compileall src/openclaw_studio/runners/comfyui.py  # OK
python3 -m compileall src/openclaw_studio/comfyui_smoke_validation.py  # OK
```

### Unit tests

```bash
PYTHONPATH=src python3 -m pytest tests/test_comfyui_runner_atomic_composed.py -v --tb=short
# 46 passed in 0.16s
```

### CLI verification

```bash
# describe
scripts/actions/runner-action.sh describe comfyui

# list-targets validate_atomic
scripts/actions/runner-action.sh list-targets comfyui validate_atomic

# list-targets validate_composed
scripts/actions/runner-action.sh list-targets comfyui validate_composed

# start_run validate_atomic
scripts/actions/runner-action.sh start comfyui validate_atomic atomic

# start_run validate_composed
scripts/actions/runner-action.sh start comfyui validate_composed composed
```

## Limitaciones

- Los resultados de ejecucion real requieren un servidor ComfyUI corriendo en
  `127.0.0.1:8188` con los workflows instalados.
- Esta entrega implementa la infraestructura completa (runner extension, specs,
  tests) pero no incluye ejecucion real contra un entorno ComfyUI.
- La ejecucion real se puede hacer manualmente con:
  ```bash
  scripts/actions/runner-action.sh start comfyui validate_atomic atomic
  scripts/actions/runner-action.sh start comfyui validate_composed composed
  ```

## Archivos modificados

| archivo | cambio |
|---|---|
| `src/openclaw_studio/comfyui_smoke_validation.py` | +`ATOMIC_CASE_SPECS`, +`COMPOSED_CASE_SPECS`, +`list_atomic_case_specs()`, +`list_composed_case_specs()` |
| `src/openclaw_studio/runners/comfyui.py` | +imports, +constants, +`validate_atomic`/`validate_composed` en list_targets/start_run/execute_run, +normalize_atomic_target/normalize_composed_target, +build_validation_paths, +_execute_atomic_run/_execute_composed_run |
| `tests/test_comfyui_runner_atomic_composed.py` | Nuevo archivo con 46 tests |

## Siguientes pasos

1. Ejecutar `validate_atomic` y `validate_composed` contra ComfyUI real
2. Publicar resultados en `$STUDIO_DIR/Validation/comfyui/atomic/<run_id>/`
3. Actualizar este documento con veredictos reales
4. Cerrar task 8.18 en `docs/devplan/01-phase-index.md`
