from __future__ import annotations

import argparse
import fcntl
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from ..comfyui_smoke_validation import (
    SMOKE_SUITE_TARGET_ID,
    CaseResult,
    ComfyApiClient,
    SmokeCase,
    SmokeRunObserver,
    SmokeRunner,
    derive_smoke_run_status,
    list_smoke_case_specs,
    list_atomic_case_specs,
    list_composed_case_specs,
)
from ..implementations.builtin_flow_catalog import (
    list_comfyui_operate_target_specs,
)
from .contracts import (
    ACTIVE_RUN_STATUSES,
    RunResult,
    Runner,
    RunnerDescription,
    RunnerTarget,
    RunStatus,
    StartRunRequest,
    StartRunResponse,
    TERMINAL_RUN_STATUSES,
)


RUNNER_ID = "comfyui"
SMOKE_TARGET_ALIASES = {"", "all", "smoke", "smoke-suite", "suite"}
ATOMIC_TARGET_ALIASES = {"", "all", "atomic", "atomic-suite", "suite"}
COMPOSED_TARGET_ALIASES = {"", "all", "composed", "composed-suite", "suite"}
OPERATE_KIND = "operate"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def process_is_alive(pid: int | None) -> bool:
    if pid is None:
        return False
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def flatten_case_artifacts(case_results: list[dict[str, Any]]) -> list[str]:
    artifact_refs: list[str] = []
    for case_result in case_results:
        artifact_refs.extend(case_result.get("output_paths", []))
    return artifact_refs


def sanitize_token(value: str | None, default: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return default
    sanitized = re.sub(r"[^a-zA-Z0-9._-]+", "-", raw)
    sanitized = sanitized.strip("._-")
    return sanitized or default


def parse_string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        items = [item.strip() for item in value.split(",")]
        return [item for item in items if item]
    if isinstance(value, (list, tuple)):
        result: list[str] = []
        for item in value:
            text = str(item).strip()
            if text:
                result.append(text)
        return result
    return [str(value).strip()] if str(value).strip() else []


def normalize_asset_kind(value: Any) -> str:
    kind = str(value or "").strip().lower()
    if kind in {"character", "characters", "personaje", "personajes"}:
        return "character"
    if kind in {"object", "objects", "objeto", "objetos"}:
        return "object"
    return ""


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def append_progress_event(
    payload: dict[str, Any],
    *,
    step_id: str,
    state: str,
    message: str,
) -> None:
    progress_events = payload.setdefault("progress_events", [])
    progress_events.append(
        {
            "at": utc_now(),
            "step_id": step_id,
            "state": state,
            "message": message,
        }
    )


class JsonStateStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.lock_path = path.with_suffix(f"{path.suffix}.lock")

    def read(self) -> dict[str, Any]:
        with self._locked():
            return self._read_unlocked()

    def write(self, payload: dict[str, Any]) -> dict[str, Any]:
        with self._locked():
            self._write_unlocked(payload)
            return dict(payload)

    def update(self, mutator: Callable[[dict[str, Any]], None]) -> dict[str, Any]:
        with self._locked():
            payload = self._read_unlocked()
            mutator(payload)
            payload["updated_at"] = utc_now()
            self._write_unlocked(payload)
            return dict(payload)

    def _read_unlocked(self) -> dict[str, Any]:
        if not self.path.exists():
            raise FileNotFoundError(self.path)
        return json.loads(self.path.read_text(encoding="utf-8"))

    def _write_unlocked(self, payload: dict[str, Any]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = self.path.with_suffix(f"{self.path.suffix}.tmp")
        tmp_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        tmp_path.replace(self.path)

    def _locked(self):
        self.lock_path.parent.mkdir(parents=True, exist_ok=True)
        lock_file = self.lock_path.open("a+", encoding="utf-8")
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)

        class _LockContext:
            def __enter__(self_nonlocal):
                return lock_file

            def __exit__(self_nonlocal, exc_type, exc, tb):
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
                lock_file.close()

        return _LockContext()


class SmokeRunStateObserver(SmokeRunObserver):
    def __init__(self, state_store: JsonStateStore) -> None:
        self.state_store = state_store

    def on_run_started(
        self,
        *,
        run_id: str,
        target_id: str,
        validation_root: Path,
        cases: list[SmokeCase],
    ) -> None:
        case_order = [case.case_id for case in cases]

        def mutate(payload: dict[str, Any]) -> None:
            payload["status"] = "running"
            payload["message"] = (
                f"Runner {RUNNER_ID} ejecutando validate_smoke sobre {target_id}."
            )
            payload["started_at"] = payload.get("started_at") or utc_now()
            payload["current_target_id"] = None
            payload["case_order"] = case_order
            payload["validation_root"] = str(validation_root)

        self.state_store.update(mutate)

    def on_case_started(self, case: SmokeCase) -> None:
        def mutate(payload: dict[str, Any]) -> None:
            payload["status"] = "running"
            payload["message"] = f"Ejecutando {case.case_id}."
            payload["current_target_id"] = case.case_id
            upsert_case_result(
                payload,
                {
                    "case_id": case.case_id,
                    "status": "running",
                    "blocking": case.blocking,
                    "message": f"Ejecutando {case.case_id}.",
                    "output_paths": [],
                    "prompt_id": None,
                    "elapsed_seconds": None,
                    "workflow_path": str(case.workflow_path),
                    "use_case_id": case.use_case_id,
                    "preset_id": case.preset_id,
                },
            )

        self.state_store.update(mutate)

    def on_prompt_queued(self, case: SmokeCase, prompt_id: str) -> None:
        def mutate(payload: dict[str, Any]) -> None:
            payload["status"] = "running"
            payload["message"] = f"Prompt en curso para {case.case_id}."
            payload["current_target_id"] = case.case_id
            payload["current_prompt_id"] = prompt_id
            payload.setdefault("prompt_ids", {})[case.case_id] = prompt_id

        self.state_store.update(mutate)

    def on_case_finished(self, result: CaseResult) -> None:
        def mutate(payload: dict[str, Any]) -> None:
            upsert_case_result(payload, asdict(result))
            payload["artifact_refs"] = flatten_case_artifacts(
                payload.get("case_results", [])
            )
            payload["message"] = result.message
            payload["current_target_id"] = None
            if payload.get("current_prompt_id") == result.prompt_id or result.prompt_id:
                payload["current_prompt_id"] = None

        self.state_store.update(mutate)

    def on_run_finished(self, summary: dict[str, Any]) -> None:
        def mutate(payload: dict[str, Any]) -> None:
            payload["status"] = summary["status"]
            payload["message"] = summary["message"]
            payload["gate_pass"] = summary["gate_pass"]
            payload["summary_path"] = summary["summary_path"]
            payload["evidence_path"] = summary["evidence_path"]
            payload["artifact_refs"] = list(summary.get("artifact_refs", []))
            payload["case_results"] = list(summary.get("results", []))
            payload["current_target_id"] = None
            payload["current_prompt_id"] = None
            payload["completed_at"] = utc_now()

        self.state_store.update(mutate)

    def is_cancel_requested(self) -> bool:
        try:
            payload = self.state_store.read()
        except FileNotFoundError:
            return False
        return bool(payload.get("cancel_requested"))


def upsert_case_result(payload: dict[str, Any], case_result: dict[str, Any]) -> None:
    case_results = payload.setdefault("case_results", [])
    for index, current_result in enumerate(case_results):
        if current_result.get("case_id") == case_result.get("case_id"):
            case_results[index] = case_result
            return
    case_results.append(case_result)


class ComfyUIRunner(Runner):
    def __init__(
        self,
        *,
        repo_root: Path | None = None,
        studio_dir: Path | None = None,
        comfyui_dir: Path | None = None,
        comfyui_host: str | None = None,
        comfyui_port: int | None = None,
    ) -> None:
        self.repo_root = (
            repo_root or Path(__file__).resolve().parents[3]
        ).resolve()
        self.studio_dir = Path(
            studio_dir or os.environ.get("STUDIO_DIR", Path.home() / "Studio")
        ).resolve()
        self.comfyui_dir = Path(
            comfyui_dir or os.environ.get("COMFYUI_DIR", Path.home() / "ComfyUI")
        ).resolve()
        self.comfyui_host = comfyui_host or os.environ.get("COMFYUI_HOST", "127.0.0.1")
        self.comfyui_port = int(
            comfyui_port or int(os.environ.get("COMFYUI_PORT", "8188"))
        )

    def describe(self) -> RunnerDescription:
        return RunnerDescription(
            runner_id=RUNNER_ID,
            display_label="ComfyUI",
            supported_operation_kinds=[
                "operate",
                "validate_smoke",
                "validate_atomic",
                "validate_composed",
            ],
            supported_target_kinds=["suite", "case", "test", "use_case", "preset"],
            supports_cancel=True,
            supports_progress=True,
            default_evidence_root=str(self.studio_dir / "Validation" / RUNNER_ID),
        )

    def list_targets(self, operation_kind: str) -> list[RunnerTarget]:
        if operation_kind == "validate_smoke":
            targets = [
                RunnerTarget(
                    target_id=SMOKE_SUITE_TARGET_ID,
                    display_label="Smoke suite 8.19",
                    target_kind="suite",
                    operation_kind="validate_smoke",
                    metadata={"default": True},
                )
            ]
            for spec in list_smoke_case_specs():
                targets.append(
                    RunnerTarget(
                        target_id=spec.case_id,
                        display_label=spec.display_label,
                        target_kind="case",
                        operation_kind="validate_smoke",
                        metadata={
                            "use_case_id": spec.use_case_id,
                            "preset_id": spec.preset_id,
                            "blocking": spec.blocking,
                        },
                    )
                )
            return targets

        if operation_kind == "validate_atomic":
            targets = [
                RunnerTarget(
                    target_id="atomic",
                    display_label="Atomic suite 8.18",
                    target_kind="suite",
                    operation_kind="validate_atomic",
                    metadata={"default": True},
                )
            ]
            for spec in list_atomic_case_specs():
                targets.append(
                    RunnerTarget(
                        target_id=spec.case_id,
                        display_label=spec.display_label,
                        target_kind="case",
                        operation_kind="validate_atomic",
                        metadata={
                            "use_case_id": spec.use_case_id,
                            "preset_id": spec.preset_id,
                            "blocking": spec.blocking,
                        },
                    )
                )
            return targets

        if operation_kind == "validate_composed":
            targets = [
                RunnerTarget(
                    target_id="composed",
                    display_label="Composed suite 8.18",
                    target_kind="suite",
                    operation_kind="validate_composed",
                    metadata={"default": True},
                )
            ]
            for spec in list_composed_case_specs():
                targets.append(
                    RunnerTarget(
                        target_id=spec.case_id,
                        display_label=spec.display_label,
                        target_kind="case",
                        operation_kind="validate_composed",
                        metadata={
                            "use_case_id": spec.use_case_id,
                            "preset_id": spec.preset_id,
                            "blocking": spec.blocking,
                        },
                    )
                )
            return targets

        if operation_kind == OPERATE_KIND:
            targets: list[RunnerTarget] = []
            for target_spec in list_comfyui_operate_target_specs():
                targets.append(
                    RunnerTarget(
                        target_id=target_spec.target_id,
                        display_label=target_spec.display_label,
                        target_kind="use_case",
                        operation_kind=OPERATE_KIND,
                        metadata={
                            "required_inputs": list(target_spec.required_input_keys),
                            "optional_inputs": list(target_spec.optional_input_keys),
                            "notes": target_spec.notes,
                        },
                    )
                )
            return targets

        return []

    def start_run(self, request: StartRunRequest) -> StartRunResponse:
        if request.runner_id != RUNNER_ID:
            return StartRunResponse(
                runner_id=RUNNER_ID,
                operation_kind=request.operation_kind,
                target_id=request.target_id,
                run_id=request.run_id,
                accepted=False,
                status="unsupported",
                message=(
                    f"runner_id={request.runner_id!r} no corresponde al runner {RUNNER_ID!r}."
                ),
            )

        if request.operation_kind == "validate_smoke":
            try:
                target_id = self.normalize_smoke_target(request.target_id)
            except ValueError as error:
                return StartRunResponse(
                    runner_id=RUNNER_ID,
                    operation_kind=request.operation_kind,
                    target_id=request.target_id,
                    run_id=request.run_id,
                    accepted=False,
                    status="fail_compile",
                    message=str(error),
                )
            run_id = request.run_id or datetime.now(timezone.utc).strftime(
                "smoke-%Y%m%d-%H%M%S"
            )
            paths = self.build_smoke_paths(run_id)
            accepted = True
        elif request.operation_kind == "validate_atomic":
            try:
                target_id = self.normalize_atomic_target(request.target_id)
            except ValueError as error:
                return StartRunResponse(
                    runner_id=RUNNER_ID,
                    operation_kind=request.operation_kind,
                    target_id=request.target_id,
                    run_id=request.run_id,
                    accepted=False,
                    status="fail_compile",
                    message=str(error),
                )
            run_id = request.run_id or datetime.now(timezone.utc).strftime(
                "atomic-%Y%m%d-%H%M%S"
            )
            paths = self.build_validation_paths(run_id, "atomic")
            accepted = True
        elif request.operation_kind == "validate_composed":
            try:
                target_id = self.normalize_composed_target(request.target_id)
            except ValueError as error:
                return StartRunResponse(
                    runner_id=RUNNER_ID,
                    operation_kind=request.operation_kind,
                    target_id=request.target_id,
                    run_id=request.run_id,
                    accepted=False,
                    status="fail_compile",
                    message=str(error),
                )
            run_id = request.run_id or datetime.now(timezone.utc).strftime(
                "composed-%Y%m%d-%H%M%S"
            )
            paths = self.build_validation_paths(run_id, "composed")
            accepted = True
        elif request.operation_kind == OPERATE_KIND:
            try:
                target_id = self.normalize_operate_target(request.target_id)
            except ValueError as error:
                return StartRunResponse(
                    runner_id=RUNNER_ID,
                    operation_kind=request.operation_kind,
                    target_id=request.target_id,
                    run_id=request.run_id,
                    accepted=False,
                    status="fail_compile",
                    message=str(error),
                )
            run_id = request.run_id or datetime.now(timezone.utc).strftime(
                "operate-%Y%m%d-%H%M%S"
            )
            paths = self.build_validation_paths(run_id, "operate")
            accepted = True
        else:
            return StartRunResponse(
                runner_id=RUNNER_ID,
                operation_kind=request.operation_kind,
                target_id=request.target_id,
                run_id=request.run_id,
                accepted=False,
                status="unsupported",
                message=(
                    f"El runner {RUNNER_ID} todavia no soporta "
                    f"{request.operation_kind!r}."
                ),
            )

        if not accepted:
            return StartRunResponse(
                runner_id=RUNNER_ID,
                operation_kind=request.operation_kind,
                target_id=request.target_id,
                run_id=request.run_id,
                accepted=False,
                status="unsupported",
                message=f"Operacion {request.operation_kind!r} no aceptada.",
            )

        if paths["manifest_path"].exists() or paths["summary_path"].exists():
            return StartRunResponse(
                runner_id=RUNNER_ID,
                operation_kind=request.operation_kind,
                target_id=target_id,
                run_id=run_id,
                accepted=False,
                status="fail_runtime",
                message=(
                    f"Ya existe evidencia previa para run_id={run_id!r}. "
                    "Usa otro run_id o consulta ese resultado."
                ),
                manifest_path=str(paths["manifest_path"]),
                summary_path=str(paths["summary_path"]),
                evidence_path=str(paths["evidence_path"]),
            )

        if request.operation_kind == OPERATE_KIND:
            validation_error = self.validate_operate_inputs(target_id, request.inputs)
            if validation_error is not None:
                return StartRunResponse(
                    runner_id=RUNNER_ID,
                    operation_kind=request.operation_kind,
                    target_id=target_id,
                    run_id=run_id,
                    accepted=False,
                    status="fail_compile",
                    message=validation_error,
                )

        for dir_key in (
            "validation_root",
            "logs_dir",
            "manifests_dir",
            "evidence_dir",
            "fixtures_dir",
            "published_dir",
            "output_dir",
        ):
            directory = paths.get(dir_key)
            if isinstance(directory, Path):
                directory.mkdir(parents=True, exist_ok=True)

        if request.operation_kind == OPERATE_KIND:
            payload = self.execute_operate_request(
                request=request,
                run_id=run_id,
                target_id=target_id,
                paths=paths,
            )
            write_json(paths["manifest_path"], payload)
            write_json(paths["summary_path"], payload)
            paths["evidence_path"].write_text(
                self.render_operate_evidence_markdown(payload),
                encoding="utf-8",
            )
            return StartRunResponse(
                runner_id=RUNNER_ID,
                operation_kind=request.operation_kind,
                target_id=target_id,
                run_id=run_id,
                accepted=True,
                status=payload["status"],
                message=payload["message"],
                manifest_path=str(paths["manifest_path"]),
                summary_path=str(paths["summary_path"]),
                evidence_path=str(paths["evidence_path"]),
                artifact_refs=list(payload.get("artifact_refs", [])),
                metadata={
                    "validation_root": str(paths["validation_root"]),
                    "entity_refs": dict(payload.get("entity_refs", {})),
                    "progress_events": list(payload.get("progress_events", [])),
                },
            )

        state_payload = {
            "runner_id": RUNNER_ID,
            "operation_kind": request.operation_kind,
            "target_id": target_id,
            "run_id": run_id,
            "status": "queued",
            "message": (
                f"Runner {RUNNER_ID} acepto {request.operation_kind} para {target_id}."
            ),
            "requested_by": request.requested_by,
            "channel": request.channel,
            "validation_root": str(paths["validation_root"]),
            "manifest_path": str(paths["manifest_path"]),
            "summary_path": str(paths["summary_path"]),
            "evidence_path": str(paths["evidence_path"]),
            "artifact_refs": [],
            "case_results": [],
            "current_target_id": None,
            "current_prompt_id": None,
            "prompt_ids": {},
            "cancel_requested": False,
            "requested_at": utc_now(),
            "started_at": None,
            "completed_at": None,
            "updated_at": utc_now(),
            "worker_pid": None,
            "stdout_log_path": str(paths["stdout_log_path"]),
            "stderr_log_path": str(paths["stderr_log_path"]),
            "gate_pass": None,
        }
        state_store = JsonStateStore(paths["manifest_path"])
        state_store.write(state_payload)

        try:
            worker_pid = self.spawn_worker(
                operation_kind=request.operation_kind,
                run_id=run_id,
                target_id=target_id,
                stdout_log_path=paths["stdout_log_path"],
                stderr_log_path=paths["stderr_log_path"],
            )
        except Exception as error:
            state_store.update(
                lambda payload: payload.update(
                    {
                        "status": "fail_runtime",
                        "message": (
                            "No se pudo arrancar el worker del runner ComfyUI: "
                            f"{error}"
                        ),
                        "completed_at": utc_now(),
                    }
                )
            )
            return StartRunResponse(
                runner_id=RUNNER_ID,
                operation_kind=request.operation_kind,
                target_id=target_id,
                run_id=run_id,
                accepted=False,
                status="fail_runtime",
                message=(
                    "No se pudo arrancar el worker del runner ComfyUI: "
                    f"{error}"
                ),
                manifest_path=str(paths["manifest_path"]),
                summary_path=str(paths["summary_path"]),
                evidence_path=str(paths["evidence_path"]),
            )

        state_store.update(
            lambda payload: payload.update(
                {
                    "worker_pid": worker_pid,
                    "message": (
                        f"Runner {RUNNER_ID} encolado con worker_pid={worker_pid}."
                    ),
                }
            )
        )

        return StartRunResponse(
            runner_id=RUNNER_ID,
            operation_kind=request.operation_kind,
            target_id=target_id,
            run_id=run_id,
            accepted=True,
            status="queued",
            message=(
                f"Runner {RUNNER_ID} acepto {request.operation_kind} para {target_id}."
            ),
            manifest_path=str(paths["manifest_path"]),
            summary_path=str(paths["summary_path"]),
            evidence_path=str(paths["evidence_path"]),
            metadata={"validation_root": str(paths["validation_root"])},
        )

    def get_run_status(self, run_id: str) -> RunStatus:
        payload = self.load_run_payload(run_id)
        return self.payload_to_status(payload)

    def cancel_run(
        self,
        run_id: str,
        *,
        requested_by: str,
        channel: str,
    ) -> RunStatus:
        payload = self.load_run_payload(run_id)
        manifest_path = payload.get("manifest_path")
        if not manifest_path:
            return self.payload_to_status(payload)

        state_store = JsonStateStore(Path(manifest_path))
        if payload["status"] in TERMINAL_RUN_STATUSES:
            return self.payload_to_status(payload)

        payload = state_store.update(
            lambda current: current.update(
                {
                    "cancel_requested": True,
                    "cancel_requested_at": utc_now(),
                    "cancel_requested_by": requested_by,
                    "cancel_requested_channel": channel,
                    "message": (
                        f"Cancelacion solicitada para run_id={run_id}."
                    ),
                }
            )
        )

        prompt_id = payload.get("current_prompt_id")
        if prompt_id:
            client = ComfyApiClient(f"http://{self.comfyui_host}:{self.comfyui_port}")
            try:
                client.interrupt_prompt(prompt_id)
            except urllib.error.URLError:
                pass

        deadline = time.monotonic() + 8
        while time.monotonic() < deadline:
            payload = state_store.read()
            if payload["status"] == "cancelled":
                break
            if not process_is_alive(payload.get("worker_pid")) and payload["status"] in ACTIVE_RUN_STATUSES:
                payload = state_store.update(
                    lambda current: current.update(
                        {
                            "status": "cancelled",
                            "message": (
                                "La cancelacion se marco como completada "
                                "al detenerse el worker."
                            ),
                            "current_target_id": None,
                            "current_prompt_id": None,
                            "completed_at": utc_now(),
                        }
                    )
                )
                break
            time.sleep(1)

        return self.payload_to_status(payload)

    def get_run_result(self, run_id: str) -> RunResult:
        payload = self.load_run_payload(run_id)
        return self.payload_to_result(payload)

    def execute_run(
        self,
        *,
        operation_kind: str,
        run_id: str,
        target_id: str | None,
    ) -> RunResult:
        if operation_kind == "validate_smoke":
            return self._execute_smoke_run(run_id, target_id)
        if operation_kind == "validate_atomic":
            return self._execute_atomic_run(run_id, target_id)
        if operation_kind == "validate_composed":
            return self._execute_composed_run(run_id, target_id)

        return RunResult(
            runner_id=RUNNER_ID,
            operation_kind=operation_kind,
            target_id=target_id,
            run_id=run_id,
            status="unsupported",
            message=f"El worker interno no soporta {operation_kind!r}.",
        )

    def _execute_smoke_run(self, run_id: str, target_id: str | None) -> RunResult:
        normalized_target_id = self.normalize_smoke_target(target_id)
        paths = self.build_smoke_paths(run_id)
        state_store = JsonStateStore(paths["manifest_path"])
        observer = SmokeRunStateObserver(state_store)
        args = argparse.Namespace(
            repo_root=self.repo_root,
            studio_dir=self.studio_dir,
            comfyui_dir=self.comfyui_dir,
            comfyui_host=self.comfyui_host,
            comfyui_port=self.comfyui_port,
            run_id=run_id,
            case_id=(
                None
                if normalized_target_id == SMOKE_SUITE_TARGET_ID
                else normalized_target_id
            ),
        )

        runner = SmokeRunner(args, observer=observer)
        try:
            runner.run()
        except Exception as error:
            payload = state_store.update(
                lambda current: current.update(
                    {
                        "status": "fail_runtime",
                        "message": (
                            "El runner ComfyUI fallo antes de terminar "
                            f"validate_smoke: {error}"
                        ),
                        "current_target_id": None,
                        "current_prompt_id": None,
                        "completed_at": utc_now(),
                    }
                )
            )
            return self.payload_to_result(payload)

        return self.get_run_result(run_id)

    def _execute_atomic_run(self, run_id: str, target_id: str | None) -> RunResult:
        normalized_target_id = self.normalize_atomic_target(target_id)
        paths = self.build_validation_paths(run_id, "atomic")
        paths["validation_root"].mkdir(parents=True, exist_ok=True)
        paths["logs_dir"].mkdir(parents=True, exist_ok=True)
        paths["manifests_dir"].mkdir(parents=True, exist_ok=True)
        paths["evidence_dir"].mkdir(parents=True, exist_ok=True)
        paths["fixtures_dir"].mkdir(parents=True, exist_ok=True)
        paths["published_dir"].mkdir(parents=True, exist_ok=True)
        paths["output_dir"].mkdir(parents=True, exist_ok=True)

        state_store = JsonStateStore(paths["manifest_path"])
        observer = SmokeRunStateObserver(state_store)
        args = argparse.Namespace(
            repo_root=self.repo_root,
            studio_dir=self.studio_dir,
            comfyui_dir=self.comfyui_dir,
            comfyui_host=self.comfyui_host,
            comfyui_port=self.comfyui_port,
            run_id=run_id,
            case_id=(
                None
                if normalized_target_id == "atomic"
                else normalized_target_id
            ),
        )

        runner = SmokeRunner(args, observer=observer)
        try:
            runner.run()
        except Exception as error:
            payload = state_store.update(
                lambda current: current.update(
                    {
                        "status": "fail_runtime",
                        "message": (
                            "El runner ComfyUI fallo antes de terminar "
                            f"validate_atomic: {error}"
                        ),
                        "current_target_id": None,
                        "current_prompt_id": None,
                        "completed_at": utc_now(),
                    }
                )
            )
            return self.payload_to_result(payload)

        return self.get_run_result(run_id)

    def _execute_composed_run(self, run_id: str, target_id: str | None) -> RunResult:
        normalized_target_id = self.normalize_composed_target(target_id)
        paths = self.build_validation_paths(run_id, "composed")
        paths["validation_root"].mkdir(parents=True, exist_ok=True)
        paths["logs_dir"].mkdir(parents=True, exist_ok=True)
        paths["manifests_dir"].mkdir(parents=True, exist_ok=True)
        paths["evidence_dir"].mkdir(parents=True, exist_ok=True)
        paths["fixtures_dir"].mkdir(parents=True, exist_ok=True)
        paths["published_dir"].mkdir(parents=True, exist_ok=True)
        paths["output_dir"].mkdir(parents=True, exist_ok=True)

        state_store = JsonStateStore(paths["manifest_path"])
        observer = SmokeRunStateObserver(state_store)
        args = argparse.Namespace(
            repo_root=self.repo_root,
            studio_dir=self.studio_dir,
            comfyui_dir=self.comfyui_dir,
            comfyui_host=self.comfyui_host,
            comfyui_port=self.comfyui_port,
            run_id=run_id,
            case_id=(
                None
                if normalized_target_id == "composed"
                else normalized_target_id
            ),
        )

        runner = SmokeRunner(args, observer=observer)
        try:
            runner.run()
        except Exception as error:
            payload = state_store.update(
                lambda current: current.update(
                    {
                        "status": "fail_runtime",
                        "message": (
                            "El runner ComfyUI fallo antes de terminar "
                            f"validate_composed: {error}"
                        ),
                        "current_target_id": None,
                        "current_prompt_id": None,
                        "completed_at": utc_now(),
                    }
                )
            )
            return self.payload_to_result(payload)

        return self.get_run_result(run_id)

    def normalize_operate_target(self, target_id: str | None) -> str:
        normalized_target_id = str(target_id or "").strip()
        known_target_ids = {
            spec.target_id for spec in list_comfyui_operate_target_specs()
        }
        if not normalized_target_id:
            raise ValueError(
                "target_id es obligatorio para operation_kind='operate' en comfyui."
            )
        if normalized_target_id not in known_target_ids:
            raise ValueError(
                "target_id desconocido para operate en comfyui: "
                f"{normalized_target_id!r}."
            )
        return normalized_target_id

    def validate_operate_inputs(
        self,
        target_id: str,
        inputs: dict[str, Any],
    ) -> str | None:
        target_specs = {
            spec.target_id: spec for spec in list_comfyui_operate_target_specs()
        }
        target_spec = target_specs.get(target_id)
        if target_spec is None:
            return f"target_id desconocido para operate: {target_id!r}."

        for required_key in target_spec.required_input_keys:
            if required_key == "reference_source_paths":
                references = parse_string_list(inputs.get("reference_source_paths"))
                if not references:
                    return (
                        "asset-reference-import requiere reference_source_paths "
                        "con al menos una ruta."
                    )
                continue

            if required_key == "brief_text":
                brief_text = str(
                    inputs.get("brief_text") or inputs.get("prompt") or ""
                ).strip()
                if not brief_text:
                    return (
                        "asset-reference-generate requiere brief_text "
                        "estructurado en inputs."
                    )
                continue

            raw_value = str(inputs.get(required_key) or "").strip()
            if not raw_value:
                return (
                    f"{target_id} requiere {required_key} en inputs "
                    "para operar en modo canonico."
                )

        if normalize_asset_kind(inputs.get("asset_kind")) == "":
            return "asset_kind debe ser character u object."

        return None

    def resolve_asset_reference_root(self, entity_refs: dict[str, str]) -> Path:
        kind_dir = "characters" if entity_refs["asset_kind"] == "character" else "objects"
        return (
            self.studio_dir
            / "Scenes"
            / entity_refs["project_id"]
            / entity_refs["scene_id"]
            / "assets"
            / kind_dir
            / entity_refs["asset_id"]
            / "references"
        )

    def resolve_reference_source_path(self, raw_path: str) -> Path:
        source_path = Path(raw_path).expanduser()
        if source_path.is_absolute():
            return source_path
        return (self.repo_root / source_path).resolve()

    def execute_operate_request(
        self,
        *,
        request: StartRunRequest,
        run_id: str,
        target_id: str,
        paths: dict[str, Path],
    ) -> dict[str, Any]:
        entity_refs = {
            "project_id": sanitize_token(str(request.inputs.get("project_id")), "default"),
            "scene_id": sanitize_token(str(request.inputs.get("scene_id")), "scene-draft"),
            "asset_kind": normalize_asset_kind(request.inputs.get("asset_kind")),
            "asset_id": sanitize_token(str(request.inputs.get("asset_id")), "asset-unknown"),
        }
        payload: dict[str, Any] = {
            "runner_id": RUNNER_ID,
            "operation_kind": OPERATE_KIND,
            "target_id": target_id,
            "run_id": run_id,
            "status": "running",
            "message": f"Iniciando {target_id} en modo canonico.",
            "requested_by": request.requested_by,
            "channel": request.channel,
            "validation_root": str(paths["validation_root"]),
            "manifest_path": str(paths["manifest_path"]),
            "summary_path": str(paths["summary_path"]),
            "evidence_path": str(paths["evidence_path"]),
            "artifact_refs": [],
            "case_results": [],
            "entity_refs": entity_refs,
            "current_target_id": target_id,
            "current_prompt_id": None,
            "prompt_ids": {},
            "cancel_requested": False,
            "requested_at": utc_now(),
            "started_at": utc_now(),
            "completed_at": None,
            "updated_at": utc_now(),
            "worker_pid": None,
            "stdout_log_path": str(paths["stdout_log_path"]),
            "stderr_log_path": str(paths["stderr_log_path"]),
            "gate_pass": None,
            "progress_events": [],
            "inputs_echo": {
                "project_id": entity_refs["project_id"],
                "scene_id": entity_refs["scene_id"],
                "asset_kind": entity_refs["asset_kind"],
                "asset_id": entity_refs["asset_id"],
            },
        }
        append_progress_event(
            payload,
            step_id="request-accepted",
            state="done",
            message=f"Run {run_id} aceptado para {target_id}.",
        )

        if target_id == "asset-reference-import":
            return self.execute_asset_reference_import(payload, request.inputs)
        if target_id == "asset-reference-generate":
            return self.execute_asset_reference_generate(payload, request.inputs)

        payload["status"] = "fail_compile"
        payload["message"] = f"target_id no implementado: {target_id!r}."
        payload["completed_at"] = utc_now()
        payload["updated_at"] = utc_now()
        append_progress_event(
            payload,
            step_id="request-rejected",
            state="failed",
            message=payload["message"],
        )
        return payload

    def execute_asset_reference_import(
        self,
        payload: dict[str, Any],
        inputs: dict[str, Any],
    ) -> dict[str, Any]:
        references_root = self.resolve_asset_reference_root(payload["entity_refs"])
        published_dir = references_root / "published"
        published_dir.mkdir(parents=True, exist_ok=True)
        append_progress_event(
            payload,
            step_id="prepare-target-paths",
            state="done",
            message=f"Ruta canonica lista en {published_dir}.",
        )

        source_paths = parse_string_list(inputs.get("reference_source_paths"))
        artifact_refs: list[str] = []
        copied_sources: list[dict[str, str]] = []
        missing_sources: list[str] = []
        for index, raw_source_path in enumerate(source_paths, start=1):
            source_path = self.resolve_reference_source_path(raw_source_path)
            if not source_path.exists() or not source_path.is_file():
                missing_sources.append(str(source_path))
                continue

            suffix = source_path.suffix.lower() or ".bin"
            target_path = (
                published_dir
                / f"{payload['entity_refs']['asset_id']}__ref__{index:03d}{suffix}"
            )
            shutil.copy2(source_path, target_path)
            artifact_refs.append(str(target_path))
            copied_sources.append(
                {
                    "source_path": str(source_path),
                    "published_path": str(target_path),
                }
            )

        payload["artifact_refs"] = artifact_refs
        payload["copied_sources"] = copied_sources
        payload["missing_sources"] = missing_sources
        if artifact_refs:
            payload["status"] = "pass"
            payload["message"] = (
                "Referencias importadas en rutas canonicas del asset "
                f"({len(artifact_refs)} archivo(s))."
            )
            append_progress_event(
                payload,
                step_id="publish-references",
                state="done",
                message=payload["message"],
            )
        else:
            payload["status"] = "blocked_missing_asset"
            payload["message"] = (
                "No se pudieron importar referencias: ninguna ruta fuente "
                "existente fue encontrada."
            )
            append_progress_event(
                payload,
                step_id="publish-references",
                state="blocked",
                message=payload["message"],
            )

        payload["current_target_id"] = None
        payload["completed_at"] = utc_now()
        payload["updated_at"] = utc_now()
        return payload

    def execute_asset_reference_generate(
        self,
        payload: dict[str, Any],
        inputs: dict[str, Any],
    ) -> dict[str, Any]:
        references_root = self.resolve_asset_reference_root(payload["entity_refs"])
        requests_dir = references_root / "requests"
        requests_dir.mkdir(parents=True, exist_ok=True)
        request_path = requests_dir / f"{payload['run_id']}__request.json"

        brief_text = str(inputs.get("brief_text") or inputs.get("prompt") or "").strip()
        preset_id = str(
            inputs.get("preset_id") or "uc-img-02-frame-baseline-preview"
        ).strip()
        request_payload = {
            "run_id": payload["run_id"],
            "target_id": payload["target_id"],
            "project_id": payload["entity_refs"]["project_id"],
            "scene_id": payload["entity_refs"]["scene_id"],
            "asset_kind": payload["entity_refs"]["asset_kind"],
            "asset_id": payload["entity_refs"]["asset_id"],
            "brief_text": brief_text,
            "preset_id": preset_id,
            "reference_source_paths": parse_string_list(
                inputs.get("reference_source_paths")
            ),
            "requested_at": payload["requested_at"],
            "requested_by": payload["requested_by"],
            "channel": payload["channel"],
            "notes": str(inputs.get("notes") or "").strip(),
        }
        write_json(request_path, request_payload)
        append_progress_event(
            payload,
            step_id="persist-generation-request",
            state="done",
            message=f"Solicitud estructurada registrada en {request_path}.",
        )

        payload["artifact_refs"] = [str(request_path)]
        payload["status"] = "soft_pass_with_fallback"
        payload["message"] = (
            "Solicitud de generacion registrada. La ejecucion de ComfyUI queda "
            "encapsulada y pendiente de orquestacion de runtime."
        )
        payload["generation_request_path"] = str(request_path)
        payload["current_target_id"] = None
        payload["completed_at"] = utc_now()
        payload["updated_at"] = utc_now()
        append_progress_event(
            payload,
            step_id="close-run",
            state="done",
            message=payload["message"],
        )
        return payload

    def render_operate_evidence_markdown(self, payload: dict[str, Any]) -> str:
        lines = [
            "# ComfyUI operate evidence",
            "",
            f"- run_id: `{payload['run_id']}`",
            f"- target_id: `{payload.get('target_id')}`",
            f"- status: `{payload.get('status')}`",
            f"- message: {payload.get('message')}",
        ]
        entity_refs = payload.get("entity_refs", {})
        if entity_refs:
            lines.extend(
                [
                    "",
                    "## Entity Refs",
                    f"- project_id: `{entity_refs.get('project_id')}`",
                    f"- scene_id: `{entity_refs.get('scene_id')}`",
                    f"- asset_kind: `{entity_refs.get('asset_kind')}`",
                    f"- asset_id: `{entity_refs.get('asset_id')}`",
                ]
            )
        artifact_refs = list(payload.get("artifact_refs", []))
        lines.append("")
        lines.append("## Artifact Refs")
        if artifact_refs:
            for artifact_ref in artifact_refs:
                lines.append(f"- `{artifact_ref}`")
        else:
            lines.append("- none")

        progress_events = list(payload.get("progress_events", []))
        lines.append("")
        lines.append("## Progress")
        if progress_events:
            for event in progress_events:
                lines.append(
                    f"- {event.get('at')} | {event.get('step_id')} | "
                    f"{event.get('state')} | {event.get('message')}"
                )
        else:
            lines.append("- no progress events")

        missing_sources = list(payload.get("missing_sources", []))
        if missing_sources:
            lines.append("")
            lines.append("## Missing Sources")
            for source_path in missing_sources:
                lines.append(f"- `{source_path}`")
        return "\n".join(lines) + "\n"

    def normalize_smoke_target(self, target_id: str | None) -> str:
        if target_id is None:
            return SMOKE_SUITE_TARGET_ID
        normalized_target_id = str(target_id).strip()
        if normalized_target_id.lower() in SMOKE_TARGET_ALIASES:
            return SMOKE_SUITE_TARGET_ID

        known_case_ids = {spec.case_id for spec in list_smoke_case_specs()}
        if normalized_target_id not in known_case_ids:
            raise ValueError(
                f"case_id desconocido para smoke validation: {normalized_target_id!r}."
            )
        return normalized_target_id

    def normalize_atomic_target(self, target_id: str | None) -> str:
        if target_id is None:
            return "atomic"
        normalized_target_id = str(target_id).strip()
        if normalized_target_id.lower() in ATOMIC_TARGET_ALIASES:
            return "atomic"
        known_case_ids = {spec.case_id for spec in list_atomic_case_specs()}
        if normalized_target_id not in known_case_ids:
            raise ValueError(
                f"case_id desconocido para atomic validation: {normalized_target_id!r}."
            )
        return normalized_target_id

    def normalize_composed_target(self, target_id: str | None) -> str:
        if target_id is None:
            return "composed"
        normalized_target_id = str(target_id).strip()
        if normalized_target_id.lower() in COMPOSED_TARGET_ALIASES:
            return "composed"
        known_case_ids = {spec.case_id for spec in list_composed_case_specs()}
        if normalized_target_id not in known_case_ids:
            raise ValueError(
                f"case_id desconocido para composed validation: {normalized_target_id!r}."
            )
        return normalized_target_id

    def build_smoke_paths(self, run_id: str) -> dict[str, Path]:
        validation_root = self.studio_dir / "Validation" / RUNNER_ID / "smoke" / run_id
        manifests_dir = validation_root / "manifests"
        evidence_dir = validation_root / "evidence"
        logs_dir = validation_root / "logs"
        return {
            "validation_root": validation_root,
            "manifests_dir": manifests_dir,
            "evidence_dir": evidence_dir,
            "logs_dir": logs_dir,
            "manifest_path": manifests_dir / "run.json",
            "summary_path": manifests_dir / "summary.json",
            "evidence_path": evidence_dir / "summary.md",
            "stdout_log_path": logs_dir / "runner.stdout.log",
            "stderr_log_path": logs_dir / "runner.stderr.log",
        }

    def build_validation_paths(self, run_id: str, validation_type: str) -> dict[str, Path]:
        validation_root = self.studio_dir / "Validation" / RUNNER_ID / validation_type / run_id
        manifests_dir = validation_root / "manifests"
        evidence_dir = validation_root / "evidence"
        logs_dir = validation_root / "logs"
        fixtures_dir = validation_root / "fixtures"
        published_dir = validation_root / "published"
        output_dir = validation_root / "output"
        return {
            "validation_root": validation_root,
            "manifests_dir": manifests_dir,
            "evidence_dir": evidence_dir,
            "logs_dir": logs_dir,
            "fixtures_dir": fixtures_dir,
            "published_dir": published_dir,
            "output_dir": output_dir,
            "manifest_path": manifests_dir / "run.json",
            "summary_path": manifests_dir / "summary.json",
            "evidence_path": evidence_dir / "summary.md",
            "stdout_log_path": logs_dir / "runner.stdout.log",
            "stderr_log_path": logs_dir / "runner.stderr.log",
        }

    def spawn_worker(
        self,
        *,
        operation_kind: str,
        run_id: str,
        target_id: str,
        stdout_log_path: Path,
        stderr_log_path: Path,
    ) -> int:
        env = dict(os.environ)
        src_path = str(self.repo_root / "src")
        existing_pythonpath = env.get("PYTHONPATH", "")
        env["PYTHONPATH"] = (
            f"{src_path}:{existing_pythonpath}" if existing_pythonpath else src_path
        )
        command = [
            sys.executable,
            "-m",
            "openclaw_studio.runner_cli",
            "--json",
            "execute",
            RUNNER_ID,
            operation_kind,
            "--run-id",
            run_id,
            "--target-id",
            target_id,
        ]
        with stdout_log_path.open("ab") as stdout_handle, stderr_log_path.open(
            "ab"
        ) as stderr_handle:
            process = subprocess.Popen(
                command,
                cwd=self.repo_root,
                env=env,
                stdout=stdout_handle,
                stderr=stderr_handle,
                start_new_session=True,
            )
        return process.pid

    def iter_known_run_paths(self, run_id: str):
        yield "smoke", self.build_smoke_paths(run_id)
        yield "atomic", self.build_validation_paths(run_id, "atomic")
        yield "composed", self.build_validation_paths(run_id, "composed")
        yield "operate", self.build_validation_paths(run_id, "operate")

    def load_run_payload(self, run_id: str) -> dict[str, Any]:
        for run_family, paths in self.iter_known_run_paths(run_id):
            if paths["manifest_path"].exists():
                state_store = JsonStateStore(paths["manifest_path"])
                payload = state_store.read()
                if (
                    run_family == "smoke"
                    and payload["status"] in ACTIVE_RUN_STATUSES
                    and paths["summary_path"].exists()
                ):
                    legacy_payload = self.build_legacy_summary_payload(run_id)
                    payload = state_store.update(
                        lambda current: current.update(
                            {
                                "status": legacy_payload["status"],
                                "message": legacy_payload["message"],
                                "gate_pass": legacy_payload.get("gate_pass"),
                                "artifact_refs": legacy_payload.get(
                                    "artifact_refs", []
                                ),
                                "case_results": legacy_payload.get(
                                    "case_results", []
                                ),
                                "summary_path": legacy_payload.get("summary_path"),
                                "evidence_path": legacy_payload.get("evidence_path"),
                                "completed_at": legacy_payload.get("completed_at")
                                or utc_now(),
                                "current_target_id": None,
                                "current_prompt_id": None,
                            }
                        )
                    )
                elif (
                    payload["status"] in ACTIVE_RUN_STATUSES
                    and not process_is_alive(payload.get("worker_pid"))
                    and not paths["summary_path"].exists()
                ):
                    payload = state_store.update(
                        lambda current: current.update(
                            {
                                "status": "fail_runtime",
                                "message": (
                                    "El worker del runner termino sin escribir "
                                    "summary.json."
                                ),
                                "completed_at": utc_now(),
                                "current_target_id": None,
                                "current_prompt_id": None,
                            }
                        )
                    )
                return payload

            if run_family == "smoke" and paths["summary_path"].exists():
                return self.build_legacy_summary_payload(run_id)

        raise FileNotFoundError(f"No existe corrida conocida con run_id={run_id!r}.")

    def build_legacy_summary_payload(self, run_id: str) -> dict[str, Any]:
        paths = self.build_smoke_paths(run_id)
        summary = json.loads(paths["summary_path"].read_text(encoding="utf-8"))
        case_results = [
            CaseResult(
                case_id=item["case_id"],
                status=item["status"],
                blocking=bool(item.get("blocking", False)),
                message=item.get("message", ""),
                output_paths=list(item.get("output_paths", [])),
                prompt_id=item.get("prompt_id"),
                elapsed_seconds=item.get("elapsed_seconds"),
                workflow_path=item.get("workflow_path"),
                use_case_id=item.get("use_case_id"),
                preset_id=item.get("preset_id"),
            )
            for item in summary.get("results", [])
        ]
        status = summary.get("status") or derive_smoke_run_status(case_results)
        target_id = summary.get("target_id") or (
            case_results[0].case_id
            if len(case_results) == 1
            else SMOKE_SUITE_TARGET_ID
        )
        artifact_refs = summary.get("artifact_refs") or flatten_case_artifacts(
            summary.get("results", [])
        )
        return {
            "runner_id": RUNNER_ID,
            "operation_kind": summary.get("operation_kind", "validate_smoke"),
            "target_id": target_id,
            "run_id": run_id,
            "status": status,
            "message": summary.get("message")
            or f"Resultado heredado de summary.json para {run_id}.",
            "validation_root": summary.get("validation_root"),
            "manifest_path": None,
            "summary_path": str(paths["summary_path"]),
            "evidence_path": (
                str(paths["evidence_path"]) if paths["evidence_path"].exists() else None
            ),
            "artifact_refs": artifact_refs,
            "case_results": summary.get("results", []),
            "current_target_id": None,
            "current_prompt_id": None,
            "cancel_requested": False,
            "requested_at": None,
            "started_at": None,
            "completed_at": utc_now(),
            "updated_at": utc_now(),
            "worker_pid": None,
            "stdout_log_path": None,
            "stderr_log_path": None,
            "gate_pass": summary.get("gate_pass"),
        }

    def payload_to_status(self, payload: dict[str, Any]) -> RunStatus:
        return RunStatus(
            runner_id=payload["runner_id"],
            operation_kind=payload["operation_kind"],
            target_id=payload.get("target_id"),
            run_id=payload["run_id"],
            status=payload["status"],
            message=payload["message"],
            current_target_id=payload.get("current_target_id"),
            manifest_path=payload.get("manifest_path"),
            summary_path=payload.get("summary_path"),
            evidence_path=payload.get("evidence_path"),
            artifact_refs=list(payload.get("artifact_refs", [])),
            metadata={
                "validation_root": payload.get("validation_root"),
                "current_prompt_id": payload.get("current_prompt_id"),
                "cancel_requested": bool(payload.get("cancel_requested")),
                "gate_pass": payload.get("gate_pass"),
                "case_results": list(payload.get("case_results", [])),
                "worker_pid": payload.get("worker_pid"),
                "stdout_log_path": payload.get("stdout_log_path"),
                "stderr_log_path": payload.get("stderr_log_path"),
                "requested_at": payload.get("requested_at"),
                "started_at": payload.get("started_at"),
                "completed_at": payload.get("completed_at"),
                "entity_refs": dict(payload.get("entity_refs", {})),
                "progress_events": list(payload.get("progress_events", [])),
                "missing_sources": list(payload.get("missing_sources", [])),
            },
        )

    def payload_to_result(self, payload: dict[str, Any]) -> RunResult:
        return RunResult(
            runner_id=payload["runner_id"],
            operation_kind=payload["operation_kind"],
            target_id=payload.get("target_id"),
            run_id=payload["run_id"],
            status=payload["status"],
            message=payload["message"],
            manifest_path=payload.get("manifest_path"),
            summary_path=payload.get("summary_path"),
            evidence_path=payload.get("evidence_path"),
            artifact_refs=list(payload.get("artifact_refs", [])),
            metadata={
                "validation_root": payload.get("validation_root"),
                "gate_pass": payload.get("gate_pass"),
                "case_results": list(payload.get("case_results", [])),
                "requested_at": payload.get("requested_at"),
                "started_at": payload.get("started_at"),
                "completed_at": payload.get("completed_at"),
                "entity_refs": dict(payload.get("entity_refs", {})),
                "progress_events": list(payload.get("progress_events", [])),
                "missing_sources": list(payload.get("missing_sources", [])),
            },
        )
