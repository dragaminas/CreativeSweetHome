#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TASK_DIR="$REPO_ROOT/docs/devplan/tasks"

required_patterns=(
  '^# Task '
  '^## Execution Header'
  '^## Phase'
  '^## Status'
  '^## Canonical Task Index Reference'
  '^## Goal'
  '^## Minimal Context'
  '^## Files to Inspect First'
  '^## Existing Infrastructure to Reuse'
  '^## Do Not Create'
  '^## Required Change'
  '^## Deliverables'
  '^## Canonical Docs to Update'
  '^## Verification'
  '^## Expected Evidence'
  '^## Acceptance Criteria'
)

failures=0

for task_file in "$TASK_DIR"/*.md; do
  [[ -f "$task_file" ]] || continue
  for pattern in "${required_patterns[@]}"; do
    if ! rg -q "$pattern" "$task_file"; then
      printf 'missing:%s:%s\n' "${task_file#$REPO_ROOT/}" "$pattern"
      failures=1
    fi
  done
  if ! rg -q 'docs/devplan/task-status-index.md' "$task_file"; then
    printf 'missing:%s:%s\n' "${task_file#$REPO_ROOT/}" 'task-status-index-reference'
    failures=1
  fi
done

changed_task_files=()
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  mapfile -t tracked_task_files < <(
    git diff --name-only --relative HEAD -- docs/devplan/tasks 2>/dev/null || true
  )
  mapfile -t untracked_task_files < <(
    git ls-files --others --exclude-standard -- docs/devplan/tasks 2>/dev/null || true
  )

  declare -A seen_task_files=()
  for relative_path in "${tracked_task_files[@]}" "${untracked_task_files[@]}"; do
    [[ "$relative_path" == docs/devplan/tasks/*.md ]] || continue
    [[ -f "$REPO_ROOT/$relative_path" ]] || continue
    if [[ -n "${seen_task_files[$relative_path]:-}" ]]; then
      continue
    fi
    seen_task_files["$relative_path"]=1
    changed_task_files+=("$REPO_ROOT/$relative_path")
  done
fi

is_index_reference_only_change() {
  local relative_path="$1"
  local non_header_lines
  non_header_lines="$(
    git diff --unified=0 --relative HEAD -- "$relative_path" \
      | awk '/^[+-]/ && $0 !~ /^(\+\+\+|---)/ { print }'
  )"

  [[ -n "$non_header_lines" ]] || return 1

  local non_index_lines
  non_index_lines="$(
    printf '%s\n' "$non_header_lines" \
      | rg -v '^(\+## Canonical Task Index Reference|-## Canonical Task Index Reference|\+- `docs/devplan/task-status-index.md`|-- `docs/devplan/task-status-index.md`|\+|-)$' \
      || true
  )"

  [[ -z "$non_index_lines" ]]
}

for task_file in "${changed_task_files[@]}"; do
  relative_task_path="${task_file#$REPO_ROOT/}"

  if is_index_reference_only_change "$relative_task_path"; then
    continue
  fi

  if ! rg -q '^## (Dependency Provisioning|Dependency Path|Planned Dependency Path)$' "$task_file"; then
    printf 'missing:%s:%s\n' "$relative_task_path" 'dependency-section'
    failures=1
  fi
  if [[ "$task_file" =~ /docs/devplan/tasks/(15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33)\.[0-9] ]]; then
    if ! rg -q '^## Upstream Validation Gate$' "$task_file"; then
      printf 'missing:%s:%s\n' "$relative_task_path" 'upstream-validation-gate'
      failures=1
    fi
  fi
done

if ! python3 "$REPO_ROOT/scripts/devplan/build-task-status-index.py" --check; then
  failures=1
fi

if [[ "$failures" -ne 0 ]]; then
  exit 1
fi

printf 'task_files_ok\n'
