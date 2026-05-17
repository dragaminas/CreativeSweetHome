# Task Template (Simple)

Usar esta plantilla para nuevas tasks en `docs/devplan/tasks/`.
Las reglas que la gobiernan estan en
`docs/devplan/00-project-invariants.md` (seccion
`Invariantes del template de tareas`).

```md
# Task <phase.task>: <titulo corto y accionable>

## Execution Header
You are working in the existing repository. Implement only Task <phase.task>.

Before editing:
- Inspect the files listed in "Files to inspect first".
- Reuse existing patterns and infrastructure.
- Do not create duplicate runners, contracts, manifests, status formats, or evidence roots.
- Keep the change focused.
- Add or update the required tests or validation.
- Do not perform unrelated refactors.

## Phase
Phase <N>: <nombre de fase>

## Status
`pending`

## Canonical Task Index Reference
- `docs/devplan/task-status-index.md`

## Goal
<1-3 lineas con el resultado concreto>

## Minimal Context
<contexto minimo para ejecutar sin releer todo el repo>

## Scope Budget (Roo/Qwen)
- Primary surface: `<backend_contract | ui_integration | dependency_install | e2e_proof | docs_only>`
- Target changed files (soft cap): `<3-7>`
- Hard cap (must stop and split): `<5-9>`
- Max code areas: `<1-2 modulos>` (ejemplo: `runner + tests`, `ui route + adapter`)
- Out-of-scope guardrail: `<que NO debe entrar en esta task>`
- Split trigger: si cerrar la task excede el `soft cap`, detener implementacion, abrir task hermana y replanificar antes de seguir.
- Overflow protocol: si se alcanza el `hard cap`, no continuar codificando; registrar `blocked_scope_split_required`, dejar evidencia del gap y enlazar la task hermana en `docs/devplan/01-phase-index.md`.

## Files to Inspect First
- `<ruta/de/archivo_1>`
- `<ruta/de/archivo_2>`
- `<ruta/de/archivo_3>`

## Existing Infrastructure to Reuse
- <infraestructura canonica 1>
- <infraestructura canonica 2>

## Dependency Provisioning
- <script canonico existente o tarea de dependencias>
- <si no hay dependencias nuevas: declararlo explicitamente>

## Upstream Validation Gate
- <gate upstream requerido o "N/A" si no aplica por secuencia>
- <artefacto validado que se reutiliza>

## Source of Truth Matrix
- Domain: `<task_status | runtime_state | navigation_projection | evidence_state>`
- Authoritative Source: `<archivo/manifest que manda>`
- Derived/Projection Artifacts: `<archivos derivados que no se editan a mano>`
- Reconciliation Command: `<comando o test que valida sincronizacion>`
- Write Rule: `primero se actualiza la fuente autoritativa; luego se regenera o reconcilia la proyeccion`

## Implementation Contract (No-Drift)
- Primary authority boundary: `<que SI controla esta task>`
- Explicit non-authority boundary: `<que NO debe mutar esta task>`
- Required inputs (existing artifacts): `<paths concretos obligatorios>`
- Required outputs (exact paths): `<paths concretos esperados>`
- Sequencing constraints: `<orden estricto de pasos>`
- Failure policy: `<como reportar blocked/fail sin inventar rutas paralelas>`
- Evidence policy: `<que evidencia exacta debe quedar y donde>`

## Do Not Create
- <duplicaciones prohibidas y limites de alcance>

## Required Change
- <cambio 1>
- <cambio 2>
- <cambio 3>

## Microtask Breakdown
- [ ] MT1: <vertical slice 1>. files: `<rutas concretas>`. verify: `<comando concreto>`.
- [ ] MT2: <vertical slice 2>. files: `<rutas concretas>`. verify: `<comando concreto>`.
- [ ] MT3: <vertical slice 3>. files: `<rutas concretas>`. verify: `<comando concreto>`.
- [ ] MT4: <opcional si aplica>. files: `<rutas concretas>`. verify: `<comando concreto>`.

## Deliverables
- `<ruta/de/archivo_objetivo_1>`
- `<ruta/de/archivo_objetivo_2>`

## Canonical Docs to Update
- `docs/devplan/01-phase-index.md`
- `docs/devplan/feature-map.md`
- `docs/devplan/task-status-index.md`
- `docs/devplan/tasks/<phase.task>-<slug>.md`
- `<otro doc canonico si aplica>`

## Verification

### Static checks
```bash
scripts/devplan/check-task-files.sh
<comando_estatico_1>
```

### Unit tests
```bash
<comando_tests_unitarios>
```

### Integration / smoke validation
```bash
<comando_smoke_o_e2e>
```

## Expected Evidence

* Expected output file: <ruta de salida esperada>
* Expected log/result file: <ruta o tipo de evidencia esperada>
* Expected status: <pass | soft_pass_with_fallback | blocked_*>
* Expected exit code: `0`

## Acceptance Criteria

* The required change is implemented.
* Existing infrastructure is reused.
* No duplicate infrastructure is introduced.
* Verification commands pass or documented reason is provided if they cannot be run.
* Documentation reflects actual behavior.
* The task can be reviewed independently.
```
