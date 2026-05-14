#!/usr/bin/env python3
"""Build or validate docs/devplan/task-status-index.md from task files."""

from __future__ import annotations

import argparse
import collections
import dataclasses
import pathlib
import re
import sys


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
TASKS_DIR = REPO_ROOT / "docs" / "devplan" / "tasks"
INDEX_FILE = REPO_ROOT / "docs" / "devplan" / "task-status-index.md"

TASK_TITLE_RE = re.compile(r"^# Task\s+([0-9][0-9.]*):\s*(.+)$", re.MULTILINE)
PHASE_RE = re.compile(r"^## Phase\s*$\nPhase\s+([0-9]+):\s*(.+)$", re.MULTILINE)
STATUS_RE = re.compile(r"^## Status\s*$\n`([^`]+)`", re.MULTILINE)


@dataclasses.dataclass(frozen=True)
class TaskRecord:
    task_id: str
    title: str
    phase_id: str
    phase_name: str
    status: str
    rel_path: str


def parse_task(task_file: pathlib.Path) -> TaskRecord:
    raw = task_file.read_text(encoding="utf-8")

    task_match = TASK_TITLE_RE.search(raw)
    if not task_match:
        raise ValueError(f"missing task title header in {task_file}")

    phase_match = PHASE_RE.search(raw)
    if not phase_match:
        raise ValueError(f"missing phase section in {task_file}")

    status_match = STATUS_RE.search(raw)
    if not status_match:
        raise ValueError(f"missing status section in {task_file}")

    rel_path = task_file.relative_to(REPO_ROOT).as_posix()
    return TaskRecord(
        task_id=task_match.group(1).strip(),
        title=task_match.group(2).strip(),
        phase_id=phase_match.group(1).strip(),
        phase_name=phase_match.group(2).strip(),
        status=status_match.group(1).strip(),
        rel_path=rel_path,
    )


def sort_key(task: TaskRecord) -> tuple:
    chunks: list[tuple[int, int | str]] = []
    for part in task.task_id.split("."):
        if part.isdigit():
            chunks.append((0, int(part)))
        else:
            chunks.append((1, part))
    return tuple(chunks)


def build_index(records: list[TaskRecord]) -> str:
    status_counts = collections.Counter(task.status for task in records)

    lines: list[str] = []
    lines.append("# Task Status Index")
    lines.append("")
    lines.append(
        "Indice canonico de estado por tarea hoja en `docs/devplan/tasks/`."
    )
    lines.append(
        "Se mantiene desde los `task files` y no reemplaza su `## Status` local."
    )
    lines.append("")
    lines.append(
        "Actualizacion canonica: `python3 scripts/devplan/build-task-status-index.py --write`."
    )
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Total task files: `{len(records)}`")
    for status, count in sorted(status_counts.items()):
        lines.append(f"- `{status}`: `{count}`")
    lines.append("")
    lines.append("## Tasks")
    lines.append("")
    lines.append("| Task | Phase | Status | File |")
    lines.append("| --- | --- | --- | --- |")

    for task in records:
        task_label = f"`{task.task_id}` {task.title}"
        phase_label = f"`{task.phase_id}` {task.phase_name}"
        status_label = f"`{task.status}`"
        file_label = f"[{task.rel_path}]({task.rel_path})"
        lines.append(
            f"| {task_label} | {phase_label} | {status_label} | {file_label} |"
        )

    lines.append("")
    return "\n".join(lines)


def load_records() -> list[TaskRecord]:
    task_files = sorted(TASKS_DIR.glob("*.md"))
    records = [parse_task(task_file) for task_file in task_files]
    records.sort(key=sort_key)
    return records


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="write canonical file")
    parser.add_argument(
        "--check",
        action="store_true",
        help="fail if canonical file does not match generated content",
    )
    args = parser.parse_args()

    records = load_records()
    generated = build_index(records)

    if args.write:
        INDEX_FILE.write_text(generated, encoding="utf-8")
        return 0

    if args.check:
        if not INDEX_FILE.exists():
            print(
                "missing:docs/devplan/task-status-index.md:file-not-found",
                file=sys.stderr,
            )
            return 1

        existing = INDEX_FILE.read_text(encoding="utf-8")
        if existing != generated:
            print(
                "stale:docs/devplan/task-status-index.md:run "
                "'python3 scripts/devplan/build-task-status-index.py --write'",
                file=sys.stderr,
            )
            return 1
        return 0

    print(generated)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
