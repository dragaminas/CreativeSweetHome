# Prompt Template

```text
You are working in the existing repository.

Read only the canonical planning docs first:
- `docs/devplan/00-project-invariants.md`
- `docs/devplan/01-phase-index.md`
- `docs/devplan/feature-map.md`
- `docs/SAD.md`

Create or update the correct artifact in `docs/devplan/` for this goal:

Goal:
- <...>

Scope:
- <new phase | new task | refine existing task | decide it>

Desired status:
- <pending | in progress | blocked | done | active | paused | archived>

Known pointers, if any:
- <optional path>
- <optional path>
- <optional path>

Constraints:
- derive reusable infrastructure from canonical docs if I did not list it
- do not create duplicate runners, manifests, evidence roots, contracts or CLIs
- keep the result integrated in `docs/devplan/`
- if Scope is `new phase` or phase-level refinement, always decompose into at
  least one leaf task file under `docs/devplan/tasks/` in the same change
- do not leave `active` or `pending` phases with placeholder open tasks
- keep `docs/devplan/feature-map.md` pointing to concrete task files for active
  work
- update canonical docs that must stay in sync
- after planning edits, run `scripts/devplan/check-task-files.sh`

Output:
- create or update the right file(s) under `docs/devplan/`
- keep the result concise and executable
```
