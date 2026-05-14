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

## Do Not Create
- <duplicaciones prohibidas y limites de alcance>

## Required Change
- <cambio 1>
- <cambio 2>
- <cambio 3>

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
