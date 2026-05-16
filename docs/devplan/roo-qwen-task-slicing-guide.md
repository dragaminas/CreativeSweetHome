# Roo/Qwen Task Slicing Guide

Guia operativa para reducir desvio de ejecucion en nuevas tasks del DevPlan usando slices pequenos y verificables.

## Objetivo
- Convertir cada task `pending` en trabajo acotado para Roo Code + `Qwen3.6-35B-A3B-Q8_0.gguf`.
- Evitar tasks grandes con mezcla de backend, UI, e2e y dependencias en un solo bloque.
- Forzar checkpoints frecuentes con evidencia antes de avanzar.

## Reglas Operativas
- Cada task `pending` debe declarar `Scope Budget` y `Microtask Breakdown`.
- Cada microtarea usa formato: `- [ ] MTn: ... files: <rutas>. verify: <comando>.`
- Rango recomendado por task: `3-9` microtareas.
- Si el budget se rompe (archivos, areas o riesgo), se divide en task hermana antes de implementar.
- Una task debe tener una sola `primary surface` (backend, UI, e2e, dependencia o docs).

## Paquetes de Microtareas

- `HARDEN_RUNTIME`: MT1 inventario permisos -> MT2 policy usuario/grupos -> MT3 script idempotente -> MT4 validacion rollback-safe -> MT5 docs/evidence
- `DEP_INSTALL`: MT1 audit script -> MT2 install path -> MT3 idempotencia/re-run -> MT4 evidencia y fallback
- `BACKEND_OPERATION`: MT1 contrato/target -> MT2 happy-path runnable -> MT3 cancel/error/status/result -> MT4 tests y docs
- `UI_INTEGRATION`: MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs
- `E2E_PROOF`: MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task
- `CUSTOM_REVIEW`: Revisar manualmente y crear pack ad-hoc

## Inventario Pending y Paquete Recomendado
Snapshot: `2026-05-16` desde `docs/devplan/task-status-index.md` (`49` pending).

| Task | Phase | Paquete | Microtasks sugeridas |
| --- | --- | --- | --- |
| `1.2` Hardening del usuario runtime | `1` | `HARDEN_RUNTIME` | MT1 inventario permisos -> MT2 policy usuario/grupos -> MT3 script idempotente -> MT4 validacion rollback-safe -> MT5 docs/evidence |
| `13.3` Prueba end-to-end de Phase 13 | `13` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `14.2` Prueba end-to-end de Phase 14 | `14` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `18.1` Catalogo UI de assets | `18` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `18.2` Prueba end-to-end de Phase 18 | `18` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `19.0` Backend canonico de referencias de assets en ComfyUI | `19` | `BACKEND_OPERATION` | MT1 contrato/target -> MT2 happy-path runnable -> MT3 cancel/error/status/result -> MT4 tests y docs |
| `19.1` Referencias de assets en UI con ComfyUI encapsulado | `19` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `19.2` Prueba end-to-end de Phase 19 | `19` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `20.0` Backend canonico de asset a 3D | `20` | `BACKEND_OPERATION` | MT1 contrato/target -> MT2 happy-path runnable -> MT3 cancel/error/status/result -> MT4 tests y docs |
| `20.1` Importacion o modelado 3D de assets en UI | `20` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `20.2` Prueba end-to-end de Phase 20 | `20` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `21.1` Integracion UI del cleanup de meshes | `21` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `21.2` Prueba end-to-end de Phase 21 | `21` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `22.1` Integracion UI del rigging automatizado | `22` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `22.2` Prueba end-to-end de Phase 22 | `22` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `23.1` Workspace UI de descripcion de tomas | `23` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `23.2` Prueba end-to-end de Phase 23 | `23` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `24.0` Backend de embed y contexto para Kimodo | `24` | `BACKEND_OPERATION` | MT1 contrato/target -> MT2 happy-path runnable -> MT3 cancel/error/status/result -> MT4 tests y docs |
| `24.1` Workspace embebido de Kimodo para animacion de tomas | `24` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `24.2` Prueba end-to-end de Phase 24 | `24` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `25.0` Backend canonico de aplicacion de animacion | `25` | `BACKEND_OPERATION` | MT1 contrato/target -> MT2 happy-path runnable -> MT3 cancel/error/status/result -> MT4 tests y docs |
| `25.1` Aplicacion automatizada de animacion a personajes en UI | `25` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `25.2` Prueba end-to-end de Phase 25 | `25` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `26.0` Backend canonico de composicion automatizada en Blender | `26` | `BACKEND_OPERATION` | MT1 contrato/target -> MT2 happy-path runnable -> MT3 cancel/error/status/result -> MT4 tests y docs |
| `26.1` Composicion automatizada de toma en Blender desde la UI | `26` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `26.2` Prueba end-to-end de Phase 26 | `26` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `27.0` Backend de sesion y retorno de estado para refine manual en Blender | `27` | `BACKEND_OPERATION` | MT1 contrato/target -> MT2 happy-path runnable -> MT3 cancel/error/status/result -> MT4 tests y docs |
| `27.1` Refinamiento manual de toma en Blender asistido por UI | `27` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `27.2` Prueba end-to-end de Phase 27 | `27` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `28.0` Backend canonico de export base de video en Blender | `28` | `BACKEND_OPERATION` | MT1 contrato/target -> MT2 happy-path runnable -> MT3 cancel/error/status/result -> MT4 tests y docs |
| `28.1` Exportacion UI de videos base de tomas | `28` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `28.1.1` Instalacion de dependencias de Phase 28 | `28` | `DEP_INSTALL` | MT1 audit script -> MT2 install path -> MT3 idempotencia/re-run -> MT4 evidencia y fallback |
| `28.2` Prueba end-to-end de Phase 28 | `28` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `29.0` Backend canonico de imagen inicial en ComfyUI | `29` | `BACKEND_OPERATION` | MT1 contrato/target -> MT2 happy-path runnable -> MT3 cancel/error/status/result -> MT4 tests y docs |
| `29.1` Imagen inicial desde video base y referencias en UI | `29` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `29.2` Prueba end-to-end de Phase 29 | `29` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `30.0` Backend canonico de generacion de tomas en ComfyUI | `30` | `BACKEND_OPERATION` | MT1 contrato/target -> MT2 happy-path runnable -> MT3 cancel/error/status/result -> MT4 tests y docs |
| `30.1` Generacion de tomas en UI con ComfyUI como engine | `30` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `30.2` Prueba end-to-end de Phase 30 | `30` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `31.0` Backend canonico de assembly en DaVinci Resolve | `31` | `BACKEND_OPERATION` | MT1 contrato/target -> MT2 happy-path runnable -> MT3 cancel/error/status/result -> MT4 tests y docs |
| `31.1` Montaje automatizado en DaVinci Resolve desde la UI | `31` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `31.1.1` Instalacion de dependencias de Phase 31 | `31` | `DEP_INSTALL` | MT1 audit script -> MT2 install path -> MT3 idempotencia/re-run -> MT4 evidencia y fallback |
| `31.2` Prueba end-to-end de Phase 31 | `31` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `32.0` Backend de sesion y retorno de estado para refine manual en DaVinci Resolve | `32` | `BACKEND_OPERATION` | MT1 contrato/target -> MT2 happy-path runnable -> MT3 cancel/error/status/result -> MT4 tests y docs |
| `32.1` Refinamiento manual de escena en DaVinci Resolve asistido por UI | `32` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `32.2` Prueba end-to-end de Phase 32 | `32` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |
| `33.0` Backend canonico de export final en DaVinci Resolve | `33` | `BACKEND_OPERATION` | MT1 contrato/target -> MT2 happy-path runnable -> MT3 cancel/error/status/result -> MT4 tests y docs |
| `33.1` Exportacion final de escena desde la UI | `33` | `UI_INTEGRATION` | MT1 types/state -> MT2 action bridge -> MT3 progreso/evidencia UX -> MT4 tests (unit+e2e hook) y docs |
| `33.2` Prueba end-to-end de Phase 33 | `33` | `E2E_PROOF` | MT1 preflight fixtures/deps -> MT2 corrida e2e scriptable -> MT3 evidencia reproducible y cierre de task |

## Protocolo de Ejecucion
1. Ejecutar `MT1` y correr su `verify` antes de tocar `MT2`.
2. No abrir nuevos frentes mientras una microtarea no tenga evidencia.
3. Si falla `verify`, resolver dentro de la misma microtarea (sin expandir alcance).
4. Solo marcar task como `done` cuando todas las microtareas y verificacion final esten completas.

## Verificacion Recomendada
```bash
scripts/devplan/check-task-files.sh
python3 scripts/devplan/build-task-status-index.py --check
```
