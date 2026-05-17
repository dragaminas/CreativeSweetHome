# Project Invariants

Estas reglas son estables y se aplican a futuras tareas de Codex en este repo.

## Reglas de arquitectura y operacion

- Preferir scripts reproducibles e idempotentes antes que procedimientos
  manuales.
- Toda dependencia real de host, runtime, binario, modelo o libreria externa
  que una feature, fase o tarea necesite para operar debe tener una ruta de
  instalacion o provision reproducible bajo `scripts/`, salvo bloqueo
  documentado y justificado.
- Si una dependencia puede instalarse o prepararse desde el repo, no debe
  quedar como paso manual oculto solo en prose o en un README externo.
- Preferir servicios `systemd --user` antes que servicios root, salvo requisito
  explicito del sistema.
- Tratar `.env` como la fuente declarativa principal del setup.
- El bootstrap central `scripts/bootstrap/apply-workstation.sh` debe poder
  orquestar las dependencias habilitadas por `.env` sin obligar a una segunda
  lista de pasos manuales fuera del repo.
- No exponer ejecucion arbitraria de shell a traves de acciones de chat.
- Mantener la wake word y la capa segura como primera frontera del canal
  WhatsApp.
- Mantener separados los runtimes principales cuando el aislamiento operativo
  sea parte de la decision arquitectonica, como `ComfyUI` principal y
  `ComfyUI-trellis2-lab`.

## Reglas de reutilizacion

- Reutilizar runners, wrappers, contratos, manifiestos, rutas de artefactos y
  formatos de estado ya existentes.
- No crear runners paralelos por canal, por validacion o por UI.
- No crear un segundo formato de evidencia o de `run_id` si ya existe uno
  canonico.
- No crear manifiestos, carpetas `published/`, convenciones de salida o
  codigos de estado alternativos sin necesidad demostrada.
- Si un script o un runner ya resuelve el flujo base, extenderlo en lugar de
  abrir una CLI o un bridge paralelo.

## Reglas de validacion

- Toda feature operativa necesita una ruta de smoke validation barata.
- Toda fase operativa debe reservar una tarea hoja dedicada a la prueba
  end-to-end real de la fase antes de poder marcarse como `done`.
- La prueba end-to-end de una fase es un gate explicito del plan, no una nota
  implicita dentro de otra tarea de planning o implementacion.
- Toda dependencia instalada por script debe tener al menos una ruta de
  verificacion barata como `audit`, `status`, `--version`, import basico o
  smoke test real, siempre que sea tecnicamente posible.
- Si una smoke validation no es posible o no es barata, la task file debe
  explicarlo de forma explicita en vez de omitirla.
- Cuando una linea de producto se implemente como pipeline secuencial por
  fases, cada fase debe declarar explicitamente cual es su validacion upstream
  habilitante y que artefactos canonicos reutiliza del paso anterior.
- En una linea secuencial no basta con que la fase anterior exista en planning:
  el gate minimo para avanzar es que su prueba end-to-end este en `pass` o
  `soft_pass_with_fallback`, salvo excepcion documentada en la task file.
- La evidencia debe quedar publicada en una ruta revisable cuando el flujo la
  requiera.
- La documentacion debe describir comportamiento probado, no comportamiento
  deseado.
- Una tarea no se considera hecha solo porque exista un documento de diseno.
- Una tarea se cierra cuando hay implementacion, validacion y evidencia donde
  aplique.

## Reglas para tareas activas

- Solo las tareas hoja ejecutables viven en `docs/devplan/tasks/`.
- Las epicas, fases y decisiones de alto nivel viven en
  `docs/devplan/01-phase-index.md`, `docs/devplan/feature-map.md` o
  `docs/devplan/archive/`.
- Cada tarea activa debe ser autocontenida para un chat nuevo de Codex.
- Cada tarea activa debe declarar que infraestructura debe reutilizarse y que
  infraestructura no debe duplicarse.
- Cada tarea activa debe declarar explicitamente su frontera de autoridad de
  datos en una seccion `Source of Truth Matrix`.
- En fases UI/data (`15-33`) la autoridad operativa de
  escena/asset/shot/proyecto vive en `STUDIO_DIR/Scenes/...`; cualquier
  `openclaw-projects/...` se considera proyeccion derivada reconcilable, no
  origen paralelo editable a mano.
- Cada tarea activa que introduzca o dependa de software externo debe declarar
  como se instala o provisiona desde el repo, o dejar el bloqueo documentado.
- Cada task file nueva o modificada en un cambio de planning debe incluir una
  seccion explicita de dependencia, por ejemplo `Dependency Provisioning` o
  `Planned Dependency Path`.
- Esa seccion no puede quedarse en prose ambigua: debe nombrar un script del
  repo ya existente, un script nuevo que la propia tarea debe entregar, una
  tarea hoja dedicada que lo implementara, o declarar explicitamente que no hay
  dependencias nuevas y que se reutiliza una ruta canonica ya existente.
- Toda task file nueva o modificada dentro de una linea secuencial de producto
  debe incluir una seccion explicita de `Upstream Validation Gate` o
  equivalente funcional.
- Cada tarea activa debe incluir una seccion `Canonical Task Index Reference`
  apuntando a `docs/devplan/task-status-index.md`.
- Cada tarea activa debe incluir una seccion `Canonical Docs to Update`.
- Si una tarea esta bloqueada, el bloqueo debe quedar explicito y basado en el
  estado real del repo o del entorno.
- Las tareas nuevas o modificadas con estado `pending` deben incluir un budget
  explicito de alcance (`Scope Budget`) para limitar desviaciones de ejecucion
  con agentes locales.
- Ese budget debe declarar al menos: superficie principal, maximo de archivos,
  maximo de areas de codigo, `soft cap`, `hard cap`, trigger de split y
  protocolo de overflow obligatorio.
- Las tareas nuevas o modificadas con estado `pending` deben incluir
  `Microtask Breakdown` con slices verticales pequenos y verificables.
- Las tareas nuevas o modificadas con estado `pending` deben incluir
  `Implementation Contract (No-Drift)` con fronteras explicitas,
  entradas/salidas, secuenciacion y politica de evidencia.
- Cada microtarea debe declarar, en la misma linea, rutas objetivo (`files:`) y
  comando de verificacion (`verify:`).
- Si una task `pending` requiere mezclar varias superficies principales
  (ejemplo: backend + UI + e2e + dependencias), debe dividirse en tareas hoja
  hermanas antes de implementarse.

## Invariantes del template de tareas

- La plantilla canonica para nuevas tareas vive en
  `docs/devplan/task-template.md`.
- Toda task file debe conservar, como minimo, las secciones obligatorias del
  validador mecanico:
  - `# Task ...`
  - `## Execution Header`
  - `## Phase`
  - `## Status`
  - `## Canonical Task Index Reference`
  - `## Goal`
  - `## Minimal Context`
  - `## Files to Inspect First`
  - `## Existing Infrastructure to Reuse`
  - `## Source of Truth Matrix`
  - `## Do Not Create`
  - `## Required Change`
  - `## Deliverables`
  - `## Canonical Docs to Update`
  - `## Verification`
  - `## Expected Evidence`
  - `## Acceptance Criteria`
- Para task files `pending` nuevas o modificadas tambien son obligatorias:
  - `## Scope Budget`
  - `## Implementation Contract (No-Drift)`
  - `## Microtask Breakdown`
- `Scope Budget` en tasks `pending` debe incluir literalmente:
  - `Target changed files (soft cap)`
  - `Hard cap (must stop and split)`
  - `Overflow protocol`
- Cada task file nueva o modificada debe incluir una seccion explicita de
  dependencia (`Dependency Provisioning`, `Dependency Path` o
  `Planned Dependency Path`) siguiendo las reglas de dependencia ya definidas
  en este documento.
- Toda task file nueva o modificada dentro de una linea secuencial de producto
  debe incluir `## Upstream Validation Gate`.
- Toda task file debe mantener referencia explicita a
  `docs/devplan/task-status-index.md`.
- `Files to Inspect First` y `Deliverables` deben usar rutas de archivo
  concretas siempre que sea posible; evitar rutas de directorio amplias cuando
  impidan la autocontencion de la tarea.
- Evitar lenguaje ambiguo en secciones ejecutables de la tarea:
  - "any ..."
  - "chosen by the implementation"
  - "updates under ..."
  - "minimal docs updates ..."
- `Verification` debe listar comandos concretos para static checks, unit tests
  y smoke/integration segun aplique.
- `Expected Evidence` debe declarar salida esperada, evidencia/log esperado y
  estado esperado de forma revisable.
- `Microtask Breakdown` debe contener entre `3` y `9` microtareas checklist,
  cada una con `files:` y `verify:` en formato legible por humano y validador.

## Reglas de descomposicion de fases

- Toda fase con estado `active` o `pending` debe tener al menos una tarea hoja
  enlazada en `### Open Tasks` dentro de `docs/devplan/01-phase-index.md`.
- Toda fase con estado `active` o `pending` debe incluir, entre sus tareas
  hoja, una tarea dedicada de prueba end-to-end real de la fase, aunque esa
  prueba quede pendiente para mas adelante.
- Si una fase introduce una superficie nueva de dependencias, activacion de
  add-ons, binarios, runtimes o software externo, y esa provision no queda ya
  resuelta por un script canonico existente, el mismo cambio debe crear una
  tarea hoja dedicada a `dependency installation/audit`.
- No es valido dejar la provision de dependencias solo como texto futuro dentro
  de una task de planning, del phase index o de un prompt temporal.
- Tampoco es valido considerar suficiente el par `planning + e2e proof` si la
  ruta de provision de dependencias de la fase sigue sin tarea hoja propia o
  sin script canonico ya existente.
- No se considera valido dejar una fase activa solo con texto narrativo o
  placeholders como "desglosar despues"; el desglose minimo debe existir en
  `docs/devplan/tasks/` dentro del mismo cambio.
- Si se crea o reabre una fase, el mismo cambio debe crear o actualizar sus
  task files ejecutables y sincronizar `docs/devplan/feature-map.md` con esos
  enlaces.
- Solo las fases `done`, `paused`, `archived` o `legacy` pueden quedar sin
  tareas abiertas, y deben declararlo explicitamente como `Ninguna`.

## Reglas de lectura para Codex

- Para planificar una fase nueva o una tarea nueva, Codex debe empezar por la
  documentacion canonica, no por un barrido amplio del repo.
- La secuencia de lectura preferida es:
  - `docs/devplan/00-project-invariants.md`
  - `docs/devplan/01-phase-index.md`
  - `docs/devplan/feature-map.md`
  - `docs/SAD.md`
  - la task file existente, si ya existe
- Para ejecutar una tarea activa, Codex debe leer primero la task file y luego
  solo los archivos listados en `Files to Inspect First`, salvo que descubra
  una contradiccion concreta.
- Si la documentacion canonica y el repo real divergen, la tarea debe corregir
  esa divergencia como parte del trabajo o dejarla documentada como bloqueo.

## Reglas de documentacion

- `README.md` es la entrada de usuario y debe seguir siendo breve.
- `docs/SAD.md` describe solo arquitectura actual.
- `docs/devplan/01-phase-index.md` resume fases y estado; no debe volver a ser
  una cronologia extensa.
- El material historico debe resumirse en `docs/devplan/archive/`.
- La documentacion canonica debe ser suficiente para que una nueva planificacion
  de fase o tarea no requiera reexplorar todo el repo.
- Toda tarea que cambie el estado real del sistema debe actualizar la
  documentacion canonica afectada dentro del mismo cambio.
- Como minimo, una tarea debe revisar si necesita actualizar:
  - `docs/SAD.md`
  - `docs/devplan/01-phase-index.md`
  - `docs/devplan/feature-map.md`
  - su propia task file
  - un resumen de `docs/devplan/archive/` si el trabajo deja de estar activo
- La presencia de la seccion `Canonical Docs to Update` en las task files debe
  poder verificarse de forma mecanica.
