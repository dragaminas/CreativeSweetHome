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
)


FAKE_BLENDER_SCRIPT = """#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" != "pre-rig-cleanup" ]]; then
  exit 0
fi

config_json="${2:-}"
if [[ "${FAKE_BLENDER_FAIL:-0}" == "1" ]]; then
  echo "forced blender failure" >&2
  exit 1
fi

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

    def make_request(self, *, inputs: dict[str, object] | None = None) -> StartRunRequest:
        return StartRunRequest(
            runner_id=RUNNER_ID,
            operation_kind="operate",
            target_id=TARGET_ID_CLEANUP_PRE_RIG,
            requested_by="tests",
            channel="tests",
            inputs=inputs or {},
        )

    def test_list_targets_exposes_cleanup_use_case(self) -> None:
        targets = self.runner.list_targets("operate")

        self.assertEqual(len(targets), 1)
        self.assertEqual(targets[0].target_id, TARGET_ID_CLEANUP_PRE_RIG)
        self.assertEqual(targets[0].metadata["default_mode"], "auto")

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


if __name__ == "__main__":
    unittest.main()
