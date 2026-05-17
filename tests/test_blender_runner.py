from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from openclaw_studio.runners import StartRunRequest
from openclaw_studio.runners.blender import (
    BlenderRunner,
    RUNNER_ID,
    TARGET_ID_CLEANUP_PRE_RIG,
    TARGET_ID_CREATE_RIG_HUMANOID,
)


FAKE_BLENDER_SCRIPT = """#!/usr/bin/env bash
set -euo pipefail

stage="${1:-}"
if [[ "${FAKE_BLENDER_FAIL:-0}" == "1" ]]; then
  echo "forced blender failure" >&2
  exit 1
fi

if [[ "$stage" == "pre-rig-cleanup" ]]; then
  config_json="${2:-}"
  python3 - "$config_json" <<'PY'
import json
import sys
from pathlib import Path

config_path = Path(sys.argv[1])
config = json.loads(config_path.read_text(encoding="utf-8"))

cleaned_obj = Path(config["cleaned_obj_path"])
cleaned_glb = Path(config["cleaned_glb_path"])
working_blend = Path(config["working_blend_path"])
report_path = Path(config["report_json_path"])

cleaned_obj.parent.mkdir(parents=True, exist_ok=True)
working_blend.parent.mkdir(parents=True, exist_ok=True)
report_path.parent.mkdir(parents=True, exist_ok=True)

cleaned_obj.write_text("o cleaned\\n", encoding="utf-8")
cleaned_glb.write_bytes(b"glb")
working_blend.write_bytes(b"blend")

report = {
    "status": "pass",
    "message": "Cleanup completed in fake Blender.",
    "before": {"mesh_count": 3, "face_count": 300000, "vertex_count": 150000},
    "after": {"mesh_count": 1, "face_count": 120000, "vertex_count": 60000},
    "warnings": ["fake blender warning"],
    "joined_meshes": True,
    "removed_small_components": 2,
    "decimation_applied": True,
}
report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
PY
  exit 0
fi

if [[ "$stage" == "create-rig-humanoid" ]]; then
  config_json="${2:-}"
  python3 - "$config_json" <<'PY'
import json
import sys
from pathlib import Path

config_path = Path(sys.argv[1])
config = json.loads(config_path.read_text(encoding="utf-8"))

rigged_glb = Path(config["rigged_glb_path"])
rigged_fbx = Path(config["rigged_fbx_path"])
working_blend = Path(config["working_blend_path"])
validation_dir = Path(config["validation_dir"])
report_path = Path(config["report_json_path"])

rigged_glb.parent.mkdir(parents=True, exist_ok=True)
working_blend.parent.mkdir(parents=True, exist_ok=True)
validation_dir.mkdir(parents=True, exist_ok=True)
report_path.parent.mkdir(parents=True, exist_ok=True)

rigged_glb.write_bytes(b"rigged-glb")
rigged_fbx.write_bytes(b"rigged-fbx")
working_blend.write_bytes(b"rigged-blend")

pose_artifacts = {}
for pose_name in ("arms", "elbows", "knees", "head", "torso"):
    pose_path = validation_dir / f"{pose_name}.png"
    pose_path.write_bytes(b"pose")
    pose_artifacts[pose_name] = str(pose_path)

report = {
    "status": "pass",
    "message": "Rig generated in fake Blender.",
    "warnings": ["fake rigging warning"],
    "pose_validation": {
        "suite": "basic_humanoid_v1",
        "poses": {
            "arms": {"status": "pass", "deformation_score": 0.07},
            "elbows": {"status": "pass", "deformation_score": 0.08},
            "knees": {"status": "pass", "deformation_score": 0.09},
            "head": {"status": "pass", "deformation_score": 0.05},
            "torso": {"status": "pass", "deformation_score": 0.06},
        },
        "artifacts": pose_artifacts,
    },
}
report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
PY
  exit 0
fi
"""


FAKE_INSTANT_MESHES_SCRIPT = """#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" != "remesh" ]]; then
  exit 0
fi

if [[ "${FAKE_INSTANT_FAIL:-0}" == "1" ]]; then
  echo "forced instant meshes failure" >&2
  exit 1
fi

input_mesh="${2:-}"
output_mesh="${3:-}"
mkdir -p "$(dirname "$output_mesh")"
cp "$input_mesh" "$output_mesh"
"""


class BlenderRunnerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)
        self.studio_dir = self.root / "Studio"
        self.repo_root = self.root / "repo"
        self.studio_dir.mkdir(parents=True)
        self.repo_root.mkdir(parents=True)

        self.blender_wrapper = self.root / "fake-blender.sh"
        self.blender_wrapper.write_text(FAKE_BLENDER_SCRIPT, encoding="utf-8")
        self.blender_wrapper.chmod(0o755)

        self.instant_wrapper = self.root / "fake-instant-meshes.sh"
        self.instant_wrapper.write_text(FAKE_INSTANT_MESHES_SCRIPT, encoding="utf-8")
        self.instant_wrapper.chmod(0o755)

        self.runner = BlenderRunner(
            repo_root=self.repo_root,
            studio_dir=self.studio_dir,
            blender_wrapper_path=self.blender_wrapper,
            instant_meshes_wrapper_path=self.instant_wrapper,
        )

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def make_request(
        self,
        *,
        target_id: str = TARGET_ID_CLEANUP_PRE_RIG,
        inputs: dict[str, object] | None = None,
    ) -> StartRunRequest:
        return StartRunRequest(
            runner_id=RUNNER_ID,
            operation_kind="operate",
            target_id=target_id,
            requested_by="tests",
            channel="tests",
            inputs=inputs or {},
        )

    def test_list_targets_exposes_cleanup_and_rigging_use_cases(self) -> None:
        targets = self.runner.list_targets("operate")
        target_ids = [target.target_id for target in targets]

        self.assertEqual(len(targets), 2)
        self.assertEqual(target_ids, [TARGET_ID_CLEANUP_PRE_RIG, TARGET_ID_CREATE_RIG_HUMANOID])
        self.assertEqual(targets[0].metadata["default_mode"], "auto")
        self.assertEqual(targets[1].metadata["default_mode"], "auto")
        self.assertEqual(targets[1].metadata["required_inputs"], ["prepared_model_path"])

    def test_missing_source_model_returns_blocked_status_and_report(self) -> None:
        response = self.runner.start_run(self.make_request())

        self.assertTrue(response.accepted)
        self.assertEqual(response.status, "blocked_missing_asset")
        self.assertIsNotNone(response.run_id)
        self.assertTrue(Path(response.manifest_path).is_file())  # type: ignore[arg-type]
        self.assertTrue(Path(response.summary_path).is_file())  # type: ignore[arg-type]
        self.assertTrue(Path(response.evidence_path).is_file())  # type: ignore[arg-type]

        status = self.runner.get_run_status(response.run_id or "")
        self.assertEqual(status.status, "blocked_missing_asset")

    def test_pass_flow_publishes_cleaned_and_remeshed_outputs(self) -> None:
        source_model = self.root / "hero.obj"
        source_model.write_text("o hero\n", encoding="utf-8")

        response = self.runner.start_run(
            self.make_request(
                inputs={
                    "source_model_path": str(source_model),
                    "project_id": "demo",
                    "entity_id": "hero",
                }
            )
        )

        self.assertTrue(response.accepted)
        self.assertEqual(response.status, "pass")
        self.assertIsNotNone(response.run_id)

        payload = json.loads(Path(response.summary_path).read_text(encoding="utf-8"))  # type: ignore[arg-type]
        self.assertEqual(payload["status"], "pass")
        self.assertEqual(len(payload["command_logs"]), 2)
        self.assertTrue(Path(payload["cleaned_obj_path"]).is_file())
        self.assertTrue(Path(payload["cleaned_glb_path"]).is_file())
        self.assertTrue(Path(payload["remeshed_obj_path"]).is_file())

        result = self.runner.get_run_result(response.run_id or "")
        self.assertEqual(result.status, "pass")
        self.assertIn(payload["remeshed_obj_path"], result.artifact_refs)

    def test_pass_flow_artifact_refs_include_manifests_and_backend_logs(self) -> None:
        source_model = self.root / "hero.obj"
        source_model.write_text("o hero\n", encoding="utf-8")

        response = self.runner.start_run(
            self.make_request(
                inputs={
                    "source_model_path": str(source_model),
                    "project_id": "demo",
                    "entity_id": "hero",
                }
            )
        )

        self.assertTrue(response.accepted)
        self.assertEqual(response.status, "pass")
        self.assertIsNotNone(response.run_id)

        payload = json.loads(Path(response.summary_path).read_text(encoding="utf-8"))  # type: ignore[arg-type]
        artifact_refs = set(payload["artifact_refs"])

        expected_refs = {
            str(Path(response.manifest_path)),  # type: ignore[arg-type]
            str(Path(response.summary_path)),  # type: ignore[arg-type]
            str(Path(payload["cleanup_report_path"])),
            str(Path(payload["command_logs"][0]["stdout_log_path"])),
            str(Path(payload["command_logs"][0]["stderr_log_path"])),
            str(Path(payload["command_logs"][1]["stdout_log_path"])),
            str(Path(payload["command_logs"][1]["stderr_log_path"])),
        }
        self.assertTrue(expected_refs.issubset(artifact_refs))

    def test_instant_meshes_failure_soft_passes_with_fallback(self) -> None:
        source_model = self.root / "hero.obj"
        source_model.write_text("o hero\n", encoding="utf-8")

        with patch.dict(os.environ, {"FAKE_INSTANT_FAIL": "1"}, clear=False):
            response = self.runner.start_run(
                self.make_request(
                    inputs={
                        "source_model_path": str(source_model),
                        "project_id": "demo",
                        "entity_id": "hero",
                    }
                )
            )

        self.assertTrue(response.accepted)
        self.assertEqual(response.status, "soft_pass_with_fallback")

        payload = json.loads(Path(response.summary_path).read_text(encoding="utf-8"))  # type: ignore[arg-type]
        self.assertEqual(payload["status"], "soft_pass_with_fallback")
        self.assertTrue(Path(payload["cleaned_obj_path"]).is_file())
        self.assertFalse(Path(payload["remeshed_obj_path"]).exists())
        self.assertGreaterEqual(len(payload["warnings"]), 1)

    def test_create_rig_missing_prepared_model_returns_blocked_status_and_report(self) -> None:
        response = self.runner.start_run(self.make_request(target_id=TARGET_ID_CREATE_RIG_HUMANOID))

        self.assertTrue(response.accepted)
        self.assertEqual(response.status, "blocked_missing_asset")
        self.assertIsNotNone(response.run_id)
        self.assertTrue(Path(response.manifest_path).is_file())  # type: ignore[arg-type]
        self.assertTrue(Path(response.summary_path).is_file())  # type: ignore[arg-type]
        self.assertTrue(Path(response.evidence_path).is_file())  # type: ignore[arg-type]

    def test_create_rig_pass_flow_publishes_rigged_exports_and_pose_evidence(self) -> None:
        prepared_model = self.root / "hero-prepared.obj"
        prepared_model.write_text("o hero_prepared\n", encoding="utf-8")

        response = self.runner.start_run(
            self.make_request(
                target_id=TARGET_ID_CREATE_RIG_HUMANOID,
                inputs={
                    "prepared_model_path": str(prepared_model),
                    "project_id": "demo",
                    "entity_id": "hero",
                },
            )
        )

        self.assertTrue(response.accepted)
        self.assertEqual(response.status, "pass")
        self.assertIsNotNone(response.run_id)

        payload = json.loads(Path(response.summary_path).read_text(encoding="utf-8"))  # type: ignore[arg-type]
        self.assertEqual(payload["status"], "pass")
        self.assertEqual(len(payload["command_logs"]), 1)
        self.assertTrue(Path(payload["rigged_glb_path"]).is_file())
        self.assertTrue(Path(payload["rigged_fbx_path"]).is_file())
        self.assertTrue(Path(payload["rigging_report_path"]).is_file())

        validation = payload["metadata"]["blender_report"]["pose_validation"]
        self.assertEqual(validation["suite"], "basic_humanoid_v1")
        self.assertEqual(set(validation["poses"].keys()), {"arms", "elbows", "knees", "head", "torso"})

    def test_run_backend_command_captures_with_pipes_before_persisting_logs(self) -> None:
        backend_script = self.root / "backend-sensitive-to-redirection.sh"
        backend_script.write_text(
            """#!/usr/bin/env bash
set -euo pipefail

fd1_target="$(readlink /proc/$$/fd/1 || true)"
if [[ "$fd1_target" == /* && -f "$fd1_target" ]]; then
  echo "stdout is redirected to a regular file" >&2
  exit 120
fi

echo "backend-stdout"
echo "backend-stderr" >&2
""",
            encoding="utf-8",
        )
        backend_script.chmod(0o755)

        stdout_path = self.root / "sensitive.stdout.log"
        stderr_path = self.root / "sensitive.stderr.log"
        result = self.runner.run_backend_command(
            stage="sensitive",
            command=["bash", str(backend_script)],
            stdout_path=stdout_path,
            stderr_path=stderr_path,
        )

        self.assertEqual(result["exit_code"], 0)
        self.assertTrue(stdout_path.is_file())
        self.assertTrue(stderr_path.is_file())
        self.assertIn("backend-stdout", stdout_path.read_text(encoding="utf-8"))
        self.assertIn("backend-stderr", stderr_path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
