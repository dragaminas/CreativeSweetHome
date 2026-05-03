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

if [[ "$failures" -ne 0 ]]; then
  exit 1
fi

printf 'task_files_ok\n'
