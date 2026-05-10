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

for task_file in "${changed_task_files[@]}"; do
  if ! rg -q '^## (Dependency Provisioning|Dependency Path|Planned Dependency Path)$' "$task_file"; then
    printf 'missing:%s:%s\n' "${task_file#$REPO_ROOT/}" 'dependency-section'
    failures=1
  fi
  if [[ "$task_file" =~ /docs/devplan/tasks/(15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33)\.[0-9] ]]; then
    if ! rg -q '^## Upstream Validation Gate$' "$task_file"; then
      printf 'missing:%s:%s\n' "${task_file#$REPO_ROOT/}" 'upstream-validation-gate'
      failures=1
    fi
  fi
done

if [[ "$failures" -ne 0 ]]; then
  exit 1
fi

printf 'task_files_ok\n'
