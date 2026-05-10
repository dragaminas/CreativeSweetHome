from __future__ import annotations

import json
import os
import re
import shlex
import shutil
import subprocess
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .contracts import (
    RunResult,
    Runner,
    RunnerDescription,
    RunnerTarget,
    RunStatus,
    StartRunRequest,
    StartRunResponse,
)


RUNNER_ID = "blender"
TARGET_ID_CLEANUP_PRE_RIG = "cleanup_pre_rig_humanoid"
SUPPORTED_SOURCE_EXTENSIONS = {".fbx", ".glb", ".gltf", ".obj", ".ply", ".stl"}
SUPPORTED_MODES = {"auto", "debug"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sanitize_path_token(value: str | None, default: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return default
    sanitized = re.sub(r"[^a-zA-Z0-9._-]+", "_", raw)
    sanitized = sanitized.strip("._-")
    return sanitized or default


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    ensure_parent(path)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def quote_command(command: list[str]) -> str:
    return " ".join(shlex.quote(part) for part in command)


@dataclass(frozen=True)
class CleanupPaths:
    run_root: Path
    input_dir: Path
    blender_dir: Path
    instant_meshes_dir: Path
    output_dir: Path
    manifests_dir: Path
    logs_dir: Path
    manifest_path: Path
    summary_path: Path
    report_path: Path
    source_copy_path: Path
    blender_config_path: Path
    blender_report_json_path: Path
    working_blend_path: Path
    cleaned_obj_path: Path
    cleaned_glb_path: Path
    remeshed_obj_path: Path
    command_logs_path: Path
    blender_stdout_log_path: Path
    blender_stderr_log_path: Path
    instant_stdout_log_path: Path
    instant_stderr_log_path: Path


class BlenderRunner(Runner):
    def __init__(
        self,
        *,
        repo_root: Path | None = None,
        studio_dir: Path | None = None,
        blender_wrapper_path: Path | None = None,
        instant_meshes_wrapper_path: Path | None = None,
    ) -> None:
        self.repo_root = (repo_root or Path(__file__).resolve().parents[3]).resolve()
        self.studio_dir = Path(
            studio_dir or os.environ.get("STUDIO_DIR", Path.home() / "Studio")
        ).resolve()
        self.blender_wrapper_path = (
            blender_wrapper_path or self.repo_root / "scripts" / "apps" / "blender.sh"
        ).resolve()
        self.instant_meshes_wrapper_path = (
            instant_meshes_wrapper_path
            or self.repo_root / "scripts" / "apps" / "instant-meshes.sh"
        ).resolve()

    def describe(self) -> RunnerDescription:
        return RunnerDescription(
            runner_id=RUNNER_ID,
            display_label="Blender + Instant Meshes",
            supported_operation_kinds=["operate"],
            supported_target_kinds=["use_case"],
            supports_cancel=False,
            supports_progress=False,
            default_evidence_root=str(self.studio_dir / "Assets3D"),
        )

    def list_targets(self, operation_kind: str) -> list[RunnerTarget]:
        if operation_kind != "operate":
            return []

        return [
            RunnerTarget(
                target_id=TARGET_ID_CLEANUP_PRE_RIG,
                display_label="Cleanup pre-rig humanoid",
                target_kind="use_case",
                operation_kind="operate",
                metadata={
                    "default_mode": "auto",
                    "supported_modes": sorted(SUPPORTED_MODES),
                    "required_inputs": ["source_model_path"],
                },
            )
        ]

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

        if request.operation_kind != "operate":
            return StartRunResponse(
                runner_id=RUNNER_ID,
                operation_kind=request.operation_kind,
                target_id=request.target_id,
                run_id=request.run_id,
                accepted=False,
                status="unsupported",
                message=(
                    f"El runner {RUNNER_ID} solo soporta operation_kind='operate'."
                ),
            )

        if request.target_id != TARGET_ID_CLEANUP_PRE_RIG:
            return StartRunResponse(
                runner_id=RUNNER_ID,
                operation_kind=request.operation_kind,
                target_id=request.target_id,
                run_id=request.run_id,
                accepted=False,
                status="fail_compile",
                message=(
                    "target_id desconocido para el runner blender: "
                    f"{request.target_id!r}."
                ),
            )

        mode = str(
            request.options.get("mode") or request.inputs.get("mode") or "auto"
        ).strip().lower()
        if mode not in SUPPORTED_MODES:
            return StartRunResponse(
                runner_id=RUNNER_ID,
                operation_kind=request.operation_kind,
                target_id=request.target_id,
                run_id=request.run_id,
                accepted=False,
                status="fail_compile",
                message=(
                    f"Modo no soportado: {mode!r}. Usa uno de {sorted(SUPPORTED_MODES)}."
                ),
            )

        run_id = request.run_id or self.build_run_id()
        source_path = self.resolve_source_path(request.inputs.get("source_model_path"))
        project_id = sanitize_path_token(request.inputs.get("project_id"), "default")
        entity_hint = request.inputs.get("entity_id")
        if entity_hint is None and source_path is not None:
            entity_hint = source_path.stem
        entity_id = sanitize_path_token(entity_hint, "humanoid")
        paths = self.build_paths(project_id=project_id, entity_id=entity_id, run_id=run_id)

        if paths.manifest_path.exists() or paths.summary_path.exists():
            return StartRunResponse(
                runner_id=RUNNER_ID,
                operation_kind=request.operation_kind,
                target_id=request.target_id,
                run_id=run_id,
                accepted=False,
                status="fail_runtime",
                message=(
                    f"Ya existe evidencia previa para run_id={run_id!r}. "
                    "Usa otro run_id o consulta ese resultado."
                ),
                manifest_path=str(paths.manifest_path),
                summary_path=str(paths.summary_path),
                evidence_path=str(paths.report_path),
            )

        self.prepare_run_directories(paths)

        base_payload = {
            "runner_id": RUNNER_ID,
            "operation_kind": request.operation_kind,
            "target_id": request.target_id,
            "run_id": run_id,
            "project_id": project_id,
            "entity_id": entity_id,
            "mode": mode,
            "status": "running",
            "message": (
                "Preparando cleanup pre-rig con Blender e Instant Meshes."
            ),
            "requested_by": request.requested_by,
            "channel": request.channel,
            "requested_at": utc_now(),
            "started_at": utc_now(),
            "completed_at": None,
            "manifest_path": str(paths.manifest_path),
            "summary_path": str(paths.summary_path),
            "evidence_path": str(paths.report_path),
            "run_root": str(paths.run_root),
            "artifact_refs": [],
            "warnings": [],
            "command_logs": [],
            "source_model_path": str(source_path) if source_path else None,
            "source_copy_path": None,
            "working_blend_path": str(paths.working_blend_path),
            "cleaned_obj_path": str(paths.cleaned_obj_path),
            "cleaned_glb_path": str(paths.cleaned_glb_path),
            "remeshed_obj_path": str(paths.remeshed_obj_path),
            "blender_report_path": str(paths.blender_report_json_path),
            "cleanup_report_path": str(paths.report_path),
            "metadata": {
                "supported_source_extensions": sorted(SUPPORTED_SOURCE_EXTENSIONS),
            },
        }
        write_json(paths.manifest_path, base_payload)

        if source_path is None:
            payload = self.finalize_payload(
                paths=paths,
                payload=base_payload,
                status="blocked_missing_asset",
                message=(
                    "Falta inputs.source_model_path para ejecutar cleanup_pre_rig_humanoid."
                ),
            )
            return self.payload_to_start_response(payload)

        if not source_path.exists():
            payload = self.finalize_payload(
                paths=paths,
                payload=base_payload,
                status="blocked_missing_asset",
                message=f"No existe el modelo de entrada: {source_path}",
            )
            return self.payload_to_start_response(payload)

        if source_path.suffix.lower() not in SUPPORTED_SOURCE_EXTENSIONS:
            payload = self.finalize_payload(
                paths=paths,
                payload=base_payload,
                status="fail_compile",
                message=(
                    "Extension no soportada para cleanup pre-rig: "
                    f"{source_path.suffix.lower()!r}."
                ),
            )
            return self.payload_to_start_response(payload)

        copied_source_path = self.copy_source_model(source_path, paths.source_copy_path)
        base_payload["source_copy_path"] = str(copied_source_path)

        blender_config = self.build_blender_config(
            request=request,
            paths=paths,
            source_model_path=copied_source_path,
            mode=mode,
            run_id=run_id,
        )
        write_json(paths.blender_config_path, blender_config)

        blender_result = self.run_backend_command(
            stage="blender",
            command=[
                "bash",
                str(self.blender_wrapper_path),
                "pre-rig-cleanup",
                str(paths.blender_config_path),
            ],
            stdout_path=paths.blender_stdout_log_path,
            stderr_path=paths.blender_stderr_log_path,
        )
        base_payload["command_logs"].append(blender_result)
        write_json(paths.command_logs_path, {"commands": base_payload["command_logs"]})

        if blender_result["exit_code"] != 0:
            payload = self.finalize_payload(
                paths=paths,
                payload=base_payload,
                status="fail_runtime",
                message=(
                    "Blender no pudo completar el cleanup pre-rig. "
                    f"Revisa {paths.blender_stderr_log_path}."
                ),
            )
            return self.payload_to_start_response(payload)

        if not paths.blender_report_json_path.exists():
            payload = self.finalize_payload(
                paths=paths,
                payload=base_payload,
                status="fail_runtime",
                message=(
                    "Blender termino sin publicar el reporte esperado "
                    f"en {paths.blender_report_json_path}."
                ),
            )
            return self.payload_to_start_response(payload)

        blender_report = read_json(paths.blender_report_json_path)
        warnings = list(blender_report.get("warnings", []))
        base_payload["warnings"] = warnings
        base_payload["metadata"]["blender_report"] = blender_report

        if not paths.cleaned_obj_path.exists() or not paths.cleaned_glb_path.exists():
            payload = self.finalize_payload(
                paths=paths,
                payload=base_payload,
                status="fail_runtime",
                message=(
                    "Blender reporto exito parcial, pero no genero ambos outputs "
                    "limpios esperados."
                ),
            )
            return self.payload_to_start_response(payload)

        instant_meshes_command = self.build_instant_meshes_command(request, paths)
        instant_meshes_result = self.run_backend_command(
            stage="instant_meshes",
            command=instant_meshes_command,
            stdout_path=paths.instant_stdout_log_path,
            stderr_path=paths.instant_stderr_log_path,
        )
        base_payload["command_logs"].append(instant_meshes_result)
        write_json(paths.command_logs_path, {"commands": base_payload["command_logs"]})

        final_status = "pass"
        final_message = (
            "Cleanup pre-rig completado con Blender y remesh publicado con Instant Meshes."
        )

        if instant_meshes_result["exit_code"] != 0 or not paths.remeshed_obj_path.exists():
            final_status = "soft_pass_with_fallback"
            final_message = (
                "Cleanup pre-rig completado en Blender, pero Instant Meshes no produjo "
                "salida utilizable. Se publica el cleaned export como fallback."
            )
            fallback_warning = (
                "Instant Meshes no genero el OBJ remesheado esperado; usa el cleaned "
                "export o reintenta con debug."
            )
            if fallback_warning not in warnings:
                warnings.append(fallback_warning)
            base_payload["warnings"] = warnings

        payload = self.finalize_payload(
            paths=paths,
            payload=base_payload,
            status=final_status,
            message=final_message,
        )
        return self.payload_to_start_response(payload)

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
        del requested_by
        del channel
        return self.get_run_status(run_id)

    def get_run_result(self, run_id: str) -> RunResult:
        payload = self.load_run_payload(run_id)
        return self.payload_to_result(payload)

    def build_run_id(self) -> str:
        return datetime.now(timezone.utc).strftime("cleanup-%Y%m%d-%H%M%S")

    def resolve_source_path(self, value: Any) -> Path | None:
        if value is None:
            return None
        source_text = str(value).strip()
        if not source_text:
            return None
        return Path(source_text).expanduser().resolve()

    def build_paths(self, *, project_id: str, entity_id: str, run_id: str) -> CleanupPaths:
        run_root = self.studio_dir / "Assets3D" / project_id / entity_id / "cleanup" / run_id
        input_dir = run_root / "input"
        blender_dir = run_root / "blender"
        instant_meshes_dir = run_root / "instant_meshes"
        output_dir = run_root / "output"
        manifests_dir = run_root / "manifests"
        logs_dir = run_root / "logs"
        source_copy_name = f"{entity_id}__source__v001"
        return CleanupPaths(
            run_root=run_root,
            input_dir=input_dir,
            blender_dir=blender_dir,
            instant_meshes_dir=instant_meshes_dir,
            output_dir=output_dir,
            manifests_dir=manifests_dir,
            logs_dir=logs_dir,
            manifest_path=manifests_dir / "run.json",
            summary_path=manifests_dir / "summary.json",
            report_path=run_root / "cleanup-report.md",
            source_copy_path=input_dir / source_copy_name,
            blender_config_path=blender_dir / "cleanup-config.json",
            blender_report_json_path=manifests_dir / "blender-cleanup.json",
            working_blend_path=blender_dir / f"{entity_id}__cleanup__v001.blend",
            cleaned_obj_path=output_dir / f"{entity_id}__cleaned__v001.obj",
            cleaned_glb_path=output_dir / f"{entity_id}__cleaned__v001.glb",
            remeshed_obj_path=output_dir / f"{entity_id}__remeshed__v001.obj",
            command_logs_path=logs_dir / "commands.json",
            blender_stdout_log_path=logs_dir / "blender.stdout.log",
            blender_stderr_log_path=logs_dir / "blender.stderr.log",
            instant_stdout_log_path=logs_dir / "instant-meshes.stdout.log",
            instant_stderr_log_path=logs_dir / "instant-meshes.stderr.log",
        )

    def prepare_run_directories(self, paths: CleanupPaths) -> None:
        for directory in (
            paths.input_dir,
            paths.blender_dir,
            paths.instant_meshes_dir,
            paths.output_dir,
            paths.manifests_dir,
            paths.logs_dir,
        ):
            directory.mkdir(parents=True, exist_ok=True)

    def copy_source_model(self, source_path: Path, target_base_path: Path) -> Path:
        target_path = target_base_path.with_suffix(source_path.suffix.lower())
        ensure_parent(target_path)
        shutil.copy2(source_path, target_path)
        return target_path

    def build_blender_config(
        self,
        *,
        request: StartRunRequest,
        paths: CleanupPaths,
        source_model_path: Path,
        mode: str,
        run_id: str,
    ) -> dict[str, Any]:
        decimate_face_threshold = int(
            request.options.get("decimate_face_threshold")
            or request.inputs.get("decimate_face_threshold")
            or 250000
        )
        target_face_count = int(
            request.options.get("target_face_count")
            or request.inputs.get("target_face_count")
            or 150000
        )
        return {
            "run_id": run_id,
            "mode": mode,
            "source_model_path": str(source_model_path),
            "working_blend_path": str(paths.working_blend_path),
            "cleaned_obj_path": str(paths.cleaned_obj_path),
            "cleaned_glb_path": str(paths.cleaned_glb_path),
            "report_json_path": str(paths.blender_report_json_path),
            "remove_small_floaters": bool(
                request.options.get("remove_small_floaters", mode == "auto")
            ),
            "join_mesh_parts": bool(
                request.options.get("join_mesh_parts", True)
            ),
            "allow_decimate": bool(
                request.options.get("allow_decimate", mode == "auto")
            ),
            "decimate_face_threshold": decimate_face_threshold,
            "target_face_count": target_face_count,
            "small_component_vertex_ratio": float(
                request.options.get("small_component_vertex_ratio", 0.005)
            ),
            "small_component_max_vertices": int(
                request.options.get("small_component_max_vertices", 500)
            ),
        }

    def build_instant_meshes_command(
        self,
        request: StartRunRequest,
        paths: CleanupPaths,
    ) -> list[str]:
        command = [
            "bash",
            str(self.instant_meshes_wrapper_path),
            "remesh",
            str(paths.cleaned_obj_path),
            str(paths.remeshed_obj_path),
            "--faces",
            str(
                int(
                    request.options.get("instant_meshes_faces")
                    or request.inputs.get("instant_meshes_faces")
                    or 8000
                )
            ),
        ]

        option_pairs = (
            ("instant_meshes_rosy", "--rosy"),
            ("instant_meshes_posy", "--posy"),
            ("instant_meshes_crease", "--crease"),
            ("instant_meshes_smooth", "--smooth"),
            ("instant_meshes_threads", "--threads"),
        )
        for option_name, flag_name in option_pairs:
            value = request.options.get(option_name)
            if value is None:
                value = request.inputs.get(option_name)
            if value is None:
                continue
            command.extend([flag_name, str(value)])

        if bool(request.options.get("instant_meshes_deterministic", False)):
            command.append("--deterministic")
        if bool(request.options.get("instant_meshes_dominant", False)):
            command.append("--dominant")
        if bool(request.options.get("instant_meshes_intrinsic", False)):
            command.append("--intrinsic")
        if bool(request.options.get("instant_meshes_boundaries", False)):
            command.append("--boundaries")
        return command

    def run_backend_command(
        self,
        *,
        stage: str,
        command: list[str],
        stdout_path: Path,
        stderr_path: Path,
    ) -> dict[str, Any]:
        ensure_parent(stdout_path)
        ensure_parent(stderr_path)
        started_at = utc_now()
        started_monotonic = time.monotonic()
        with stdout_path.open("ab") as stdout_handle, stderr_path.open("ab") as stderr_handle:
            process = subprocess.run(
                command,
                cwd=self.repo_root,
                stdout=stdout_handle,
                stderr=stderr_handle,
                check=False,
            )
        completed_at = utc_now()
        return {
            "stage": stage,
            "command": command,
            "command_text": quote_command(command),
            "stdout_log_path": str(stdout_path),
            "stderr_log_path": str(stderr_path),
            "started_at": started_at,
            "completed_at": completed_at,
            "duration_seconds": round(time.monotonic() - started_monotonic, 3),
            "exit_code": process.returncode,
        }

    def finalize_payload(
        self,
        *,
        paths: CleanupPaths,
        payload: dict[str, Any],
        status: str,
        message: str,
    ) -> dict[str, Any]:
        final_payload = dict(payload)
        final_payload["status"] = status
        final_payload["message"] = message
        final_payload["completed_at"] = utc_now()
        final_payload["artifact_refs"] = self.collect_artifacts(paths)
        write_json(paths.manifest_path, final_payload)
        write_json(paths.summary_path, final_payload)
        paths.report_path.write_text(
            self.build_markdown_report(final_payload),
            encoding="utf-8",
        )
        return final_payload

    def collect_artifacts(self, paths: CleanupPaths) -> list[str]:
        artifacts: list[str] = []
        for candidate in (
            paths.source_copy_path.with_suffix(".glb"),
            paths.source_copy_path.with_suffix(".gltf"),
            paths.source_copy_path.with_suffix(".fbx"),
            paths.source_copy_path.with_suffix(".obj"),
            paths.source_copy_path.with_suffix(".ply"),
            paths.source_copy_path.with_suffix(".stl"),
            paths.cleaned_glb_path,
            paths.cleaned_obj_path,
            paths.remeshed_obj_path,
            paths.working_blend_path,
            paths.blender_report_json_path,
            paths.report_path,
            paths.command_logs_path,
        ):
            if candidate.exists():
                artifacts.append(str(candidate))
        return artifacts

    def build_markdown_report(self, payload: dict[str, Any]) -> str:
        warnings = list(payload.get("warnings", []))
        command_logs = list(payload.get("command_logs", []))
        artifact_refs = list(payload.get("artifact_refs", []))

        lines = [
            "# Cleanup Pre-Rig Report",
            "",
            f"- status: `{payload['status']}`",
            f"- message: {payload['message']}",
            f"- runner_id: `{payload['runner_id']}`",
            f"- run_id: `{payload['run_id']}`",
            f"- project_id: `{payload.get('project_id', '')}`",
            f"- entity_id: `{payload.get('entity_id', '')}`",
            f"- mode: `{payload.get('mode', 'auto')}`",
            f"- requested_at: `{payload.get('requested_at', '')}`",
            f"- completed_at: `{payload.get('completed_at', '')}`",
            "",
            "## Model Refs",
            "",
            f"- source_model_path: `{payload.get('source_model_path')}`",
            f"- source_copy_path: `{payload.get('source_copy_path')}`",
            f"- cleaned_obj_path: `{payload.get('cleaned_obj_path')}`",
            f"- cleaned_glb_path: `{payload.get('cleaned_glb_path')}`",
            f"- remeshed_obj_path: `{payload.get('remeshed_obj_path')}`",
            "",
            "## Command Logs",
            "",
        ]

        if command_logs:
            for item in command_logs:
                lines.extend(
                    [
                        f"- {item['stage']}: `{item['command_text']}`",
                        f"  stdout: `{item['stdout_log_path']}`",
                        f"  stderr: `{item['stderr_log_path']}`",
                        f"  exit_code: `{item['exit_code']}`",
                    ]
                )
        else:
            lines.append("- No backend commands were executed.")

        lines.extend(["", "## Warnings", ""])
        if warnings:
            for warning in warnings:
                lines.append(f"- {warning}")
        else:
            lines.append("- None.")

        lines.extend(["", "## Artifact Refs", ""])
        if artifact_refs:
            for artifact_ref in artifact_refs:
                lines.append(f"- `{artifact_ref}`")
        else:
            lines.append("- No artifacts published.")

        blender_report = payload.get("metadata", {}).get("blender_report")
        if isinstance(blender_report, dict):
            before_stats = blender_report.get("before", {})
            after_stats = blender_report.get("after", {})
            lines.extend(
                [
                    "",
                    "## Cleanup Metrics",
                    "",
                    f"- before_mesh_count: `{before_stats.get('mesh_count')}`",
                    f"- before_face_count: `{before_stats.get('face_count')}`",
                    f"- after_mesh_count: `{after_stats.get('mesh_count')}`",
                    f"- after_face_count: `{after_stats.get('face_count')}`",
                    f"- joined_meshes: `{blender_report.get('joined_meshes')}`",
                    f"- removed_small_components: `{blender_report.get('removed_small_components')}`",
                    f"- decimation_applied: `{blender_report.get('decimation_applied')}`",
                ]
            )

        return "\n".join(lines) + "\n"

    def find_run_manifest(self, run_id: str) -> Path:
        assets_root = self.studio_dir / "Assets3D"
        pattern = f"*/*/cleanup/{run_id}/manifests/run.json"
        matches = sorted(assets_root.glob(pattern))
        if not matches:
            raise FileNotFoundError(f"No existe corrida conocida con run_id={run_id!r}.")
        return matches[-1]

    def load_run_payload(self, run_id: str) -> dict[str, Any]:
        manifest_path = self.find_run_manifest(run_id)
        return read_json(manifest_path)

    def payload_to_start_response(self, payload: dict[str, Any]) -> StartRunResponse:
        accepted = payload["status"] not in {"fail_compile"}
        return StartRunResponse(
            runner_id=payload["runner_id"],
            operation_kind=payload["operation_kind"],
            target_id=payload.get("target_id"),
            run_id=payload["run_id"],
            accepted=accepted,
            status=payload["status"],
            message=payload["message"],
            manifest_path=payload.get("manifest_path"),
            summary_path=payload.get("summary_path"),
            evidence_path=payload.get("evidence_path"),
            artifact_refs=list(payload.get("artifact_refs", [])),
            metadata={
                "project_id": payload.get("project_id"),
                "entity_id": payload.get("entity_id"),
                "mode": payload.get("mode"),
                "warnings": list(payload.get("warnings", [])),
            },
        )

    def payload_to_status(self, payload: dict[str, Any]) -> RunStatus:
        return RunStatus(
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
                "project_id": payload.get("project_id"),
                "entity_id": payload.get("entity_id"),
                "mode": payload.get("mode"),
                "warnings": list(payload.get("warnings", [])),
                "command_logs": list(payload.get("command_logs", [])),
                "requested_at": payload.get("requested_at"),
                "started_at": payload.get("started_at"),
                "completed_at": payload.get("completed_at"),
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
                "project_id": payload.get("project_id"),
                "entity_id": payload.get("entity_id"),
                "mode": payload.get("mode"),
                "warnings": list(payload.get("warnings", [])),
                "command_logs": list(payload.get("command_logs", [])),
                "requested_at": payload.get("requested_at"),
                "started_at": payload.get("started_at"),
                "completed_at": payload.get("completed_at"),
            },
        )
