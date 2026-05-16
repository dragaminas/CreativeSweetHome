Aquí tienes el prompt para Codex:

```text id="f8j2zr"
You are working in the existing repository.

Read only the canonical planning docs first:
- `docs/devplan/00-project-invariants.md`
- `docs/devplan/01-phase-index.md`
- `docs/devplan/feature-map.md`
- `docs/SAD.md`

Create or update the correct artifact in `docs/devplan/` for this goal:

Goal:

Disenar y planificar UI: SvelteKit como producto principal, ComfyUI completamente encapsulado como motor, y Kimodo reutilizado casi tal cual como herramienta embebida.
Para ComfyUI, no mostrar el canvas ni la UI general. Hacer una capa propia que exponga solo:

selección de intención o preset
inputs simplificados
progreso
cancelación
previews intermedios
artefactos finales
evidencia y errores legibles
En otras palabras: ComfyUI queda como engine, no como experiencia de usuario.

Para Kimodo, si su UI ya resuelve bien authoring de motion, timeline y constraints, aprovecharla:

proxyarla dentro del dominio/app para que no se sienta externa
abrirla en un workspace/panel dedicado
pasarle contexto alrededor: personaje, shot, asset, estado del pipeline, rutas de salida

El flujo de UX seria el siguiente:

Flujo principal:

1 - Descripción de una escena.
2 - Creación automática de estructura de almacenamiento de componentes de escena.
3 - Catalogación de Assets en estructura de almacenamiento.
  - Personajes 
  - Objetos 
4 - Generación y o importación de imágenes de referencia para Assets 
5 - Importación y o Modelado de Assets en 3d
6 - Limpieza Automatizada de meshes
7 - Rigeado automatizado de Assets
9 - Descripción de Tomas
9 - Animación de personajes en Kimodo para tomas
10 - Aplicación automatizada de animación a personajes
11 - Composición y generación automática de toma en Blender.
12 - Refinamiento manual de toma en Blender
13 - Exportación de videos base de tomas
14 - Generación de imágen inicial a partir de vídeo base y referencias.
15 - Generación de tomas.
16 - Montaje automatizado en Da Vinci Resolve de tomas.
17 - Refinamiento manual de Escena en Da Vinci Resolve
18 - Exportación de Escena final.

Puntos e infraestructura futura a tener en cuenta, pero fuera del MVP inicial:

- Síntesis de diálogo 
- Sincronización de Audio y video 
- Efectos de sonido
- Creación de story board 
- Creación de vídeo con imagen inicial y final con Wan2.2 
- Flujos automatizados con GIMP en Inkscape

Scope:
- new phases. Crear nuevas fases, no solo una gigantezca

Desired status:
- pending

Known pointers, if any:
- `scripts/`
- `docs/devplan/`
- `docs/SAD.md`
- `docs/devplan/`

Constraints:
- Asumir que los prompts etregados por el usuario no son ideales para usar en comfyUI y crear una capa de traducion/mejora de prompts y descripciones segun los requerimientos de consumidores finales: comfyUI, Kimodo, y cualquier otra herramineta necesaria.
- Dar feedback al usuario en cada punto de control, como generacion de imagenes de assets, frames iniciales, animaciones basicas de kimodo y aplicacion de animacion a modelo, Modelos 3D, animacion final de tomas.
- La interfaz de usuario sera una interfaz web, que podra consumir elementos de las distintas interfaces web del sistema.
- derive reusable infrastructure from canonical docs if I did not list it
- do not create duplicate runners, manifests, evidence roots, contracts or CLIs
- keep the result integrated in `docs/devplan/`
- if Scope is `new phase` or phase-level refinement, always decompose into at
  least one leaf task file under `docs/devplan/tasks/` in the same change
- if a new or updated task depends on external software, add an explicit
  `Dependency Provisioning` or `Planned Dependency Path` section
- that dependency section must name one of:
  - an existing repo script that already provisions or audits the dependency
  - a new repo script that the task must deliver
  - a dedicated leaf task created in the same change to implement that script
  - an explicit statement that there are no new dependencies and which existing
    canonical path is reused
- if Scope is `new phase` or phase-level refinement and dependency
  provisioning is not already fully covered by an existing repo script, create
  a dedicated leaf task for dependency installation/audit in the same change
- every new or updated `pending` task file must include:
  - `## Scope Budget` with explicit limits (primary surface, max files, max areas, split trigger)
  - `## Microtask Breakdown` with `3-9` checklist items
  - each microtask line must include `files:` and `verify:`
- if proposed work exceeds the declared `Scope Budget`, split into sibling task
  files in the same planning change instead of enlarging one task
- do not leave a phase with only planning plus e2e-proof tasks when its
  dependency-provisioning path is still unresolved
- do not leave `active` or `pending` phases with placeholder open tasks
- keep `docs/devplan/feature-map.md` pointing to concrete task files for active
  work
- update canonical docs that must stay in sync
- after planning edits, run `scripts/devplan/check-task-files.sh`

Output:
- create or update the right file(s) under `docs/devplan/`
- keep the result concise and executable

Output:
- create or update the right file(s) under `docs/devplan/`
- keep the result concise and executable
```
