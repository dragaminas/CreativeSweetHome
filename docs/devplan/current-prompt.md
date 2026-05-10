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
- Create a task for an automated, free, Linux-first character rigging workflow.
- The workflow must be efficient for end users, not necessarily the cheapest or fastest to implement.
- The intended target is beginner-friendly rigging for AI-generated humanoid 3D models.
- OpenClaw must orchestrate the workflow, but Blender must perform the rigging work.
- The preferred technical base should be:
  `cleaned/remeshed model → Blender background automation → Rigify-based rig generation → automatic deformation test → export result`
- The task should investigate and define the most efficient free rigging path compatible with Linux and OpenClaw.
- Paid tools such as Auto-Rig Pro and Windows-only tools such as AccuRIG must remain out of scope.
- Web-only tools such as Mixamo must not be the core path, because the project should remain local/Linux-friendly.

Scope:
- new phase

Desired status:
- pending

Known pointers, if any:
- `scripts/`
- `docs/devplan/`
- `docs/SAD.md`
- `docs/devplan/`

Constraints:
- derive reusable infrastructure from canonical docs if I did not list it
- do not create duplicate runners, manifests, evidence roots, contracts or CLIs
- keep the result integrated in `docs/devplan/`
- update canonical docs that must stay in sync
- after planning edits, run `scripts/devplan/check-task-files.sh`
- keep the task focused on planning the rigging infrastructure, not implementing the complete rigging system yet
- prefer a reusable orchestration entrypoint over ad-hoc scripts
- preserve a clear separation of responsibilities:
  - OpenClaw: orchestration, file handling, user-facing workflow, status reporting, diagnostics
  - Blender background Python: model import, armature/metarig creation or placement, Rigify activation, rig generation, weight assignment, test animation, export
  - cleanup/remeshing pipeline: prerequisite input, not the main subject of this task
  - manual Blender use by the end user: should be avoided
- define how this task depends on the previous cleanup/remeshing infrastructure task
- design the workflow so a beginner should only need to provide a prepared humanoid model and press a simple action such as "Create rig"
- include a planned automatic validation stage using simple poses or animation checks:
  - raise arms
  - bend elbows
  - bend knees
  - rotate head
  - tilt torso
- include a reporting stage that produces beginner-readable feedback such as:
  - rig created successfully
  - possible shoulder deformation issue
  - possible knee deformation issue
  - model not suitable for humanoid rigging
- include evidence requirements:
  - input model path
  - cleaned/remeshed model path
  - generated rigged model path
  - Blender command log
  - validation animation or screenshots
  - JSON or Markdown rigging report
- do not assume perfect automatic skinning; include fallback and diagnostic criteria
- do not require the user to understand bones, weights, constraints, modifiers, or Blender UI
- target Linux-first local execution
- prefer free/open-source tools included with Blender when possible
- if Rigify alone is insufficient, the task may propose additional free Blender-compatible tools or scripts, but must justify them and keep the core workflow OpenClaw-friendly

Output:
- create or update the right file(s) under `docs/devplan/`
- keep the result concise and executable
```
