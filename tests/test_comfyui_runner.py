from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from openclaw_studio.runners import StartRunRequest
from openclaw_studio.runners.comfyui import ComfyUIRunner


class ComfyUIRunnerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)
        self.repo_root = self.root / "repo"
        self.studio_dir = self.root / "Studio"
        self.comfyui_dir = self.root / "ComfyUI"
        self.repo_root.mkdir(parents=True)
        self.studio_dir.mkdir(parents=True)
        self.comfyui_dir.mkdir(parents=True)
        self.runner = ComfyUIRunner(
            repo_root=self.repo_root,
            studio_dir=self.studio_dir,
            comfyui_dir=self.comfyui_dir,
            comfyui_host="127.0.0.1",
            comfyui_port=8188,
        )

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_legacy_summary_is_exposed_via_runner_status(self) -> None:
        run_id = "smoke-light-5"
        manifests_dir = (
            self.studio_dir / "Validation" / "comfyui" / "smoke" / run_id / "manifests"
        )
        evidence_dir = (
            self.studio_dir / "Validation" / "comfyui" / "smoke" / run_id / "evidence"
        )
        manifests_dir.mkdir(parents=True, exist_ok=True)
        evidence_dir.mkdir(parents=True, exist_ok=True)
        (evidence_dir / "summary.md").write_text("# evidence\n", encoding="utf-8")

        summary = {
            "run_id": run_id,
            "gate_pass": True,
            "results": [
                {
                    "case_id": "SMK-IMG-02-01",
                    "status": "pass",
                    "blocking": True,
                    "message": "ok",
                    "output_paths": ["/tmp/render.png"],
                },
                {
                    "case_id": "SMK-VID-02-01",
                    "status": "soft_pass_with_fallback",
                    "blocking": True,
                    "message": "fallback",
                    "output_paths": [],
                },
                {
                    "case_id": "SMK-VID-03-01",
                    "status": "blocked_missing_asset",
                    "blocking": False,
                    "message": "missing",
                    "output_paths": [],
                },
            ],
        }
        (manifests_dir / "summary.json").write_text(
            json.dumps(summary, indent=2), encoding="utf-8"
        )

        status = self.runner.get_run_status(run_id)

        self.assertEqual(status.run_id, run_id)
        self.assertEqual(status.status, "soft_pass_with_fallback")
        self.assertEqual(status.target_id, "smoke")
        self.assertEqual(
            status.summary_path,
            str(manifests_dir / "summary.json"),
        )
        self.assertEqual(
            status.evidence_path,
            str(evidence_dir / "summary.md"),
        )

    def test_atomic_validation_routes_through_same_runner(self) -> None:
        with patch.object(self.runner, "spawn_worker", return_value=12345):
            response = self.runner.start_run(
                StartRunRequest(
                    runner_id="comfyui",
                    operation_kind="validate_atomic",
                    target_id="AT-IMG-02-01",
                    requested_by="tests",
                    channel="tests",
                    run_id="atomic-test-001",
                )
            )

        self.assertTrue(response.accepted)
        self.assertEqual(response.status, "queued")
        self.assertEqual(response.operation_kind, "validate_atomic")
        self.assertEqual(response.target_id, "AT-IMG-02-01")

    def test_operate_targets_include_asset_reference_import_and_generate(self) -> None:
        targets = self.runner.list_targets("operate")
        target_ids = {target.target_id for target in targets}

        self.assertIn("asset-reference-import", target_ids)
        self.assertIn("asset-reference-generate", target_ids)

    def test_operate_asset_reference_import_publishes_references(self) -> None:
        source_a = self.root / "ref-a.png"
        source_b = self.root / "ref-b.jpg"
        source_a.write_bytes(b"ref-a")
        source_b.write_bytes(b"ref-b")

        response = self.runner.start_run(
            StartRunRequest(
                runner_id="comfyui",
                operation_kind="operate",
                target_id="asset-reference-import",
                requested_by="tests",
                channel="tests",
                run_id="operate-import-001",
                inputs={
                    "project_id": "pilot-project",
                    "scene_id": "sc001",
                    "asset_kind": "character",
                    "asset_id": "chr-001",
                    "reference_source_paths": [str(source_a), str(source_b)],
                },
            )
        )

        self.assertTrue(response.accepted)
        self.assertEqual(response.status, "pass")
        self.assertIsNotNone(response.manifest_path)
        self.assertIsNotNone(response.summary_path)
        self.assertIsNotNone(response.evidence_path)
        self.assertEqual(len(response.artifact_refs), 2)
        for artifact_path in response.artifact_refs:
            self.assertTrue(Path(artifact_path).exists())

        summary_payload = json.loads(
            Path(response.summary_path).read_text(encoding="utf-8")  # type: ignore[arg-type]
        )
        self.assertEqual(summary_payload["status"], "pass")
        self.assertEqual(summary_payload["operation_kind"], "operate")
        self.assertEqual(summary_payload["target_id"], "asset-reference-import")
        self.assertEqual(summary_payload["entity_refs"]["asset_id"], "chr-001")

        status = self.runner.get_run_status("operate-import-001")
        self.assertEqual(status.status, "pass")
        self.assertEqual(status.operation_kind, "operate")

    def test_operate_asset_reference_generate_requires_brief(self) -> None:
        response = self.runner.start_run(
            StartRunRequest(
                runner_id="comfyui",
                operation_kind="operate",
                target_id="asset-reference-generate",
                requested_by="tests",
                channel="tests",
                run_id="operate-generate-missing-brief",
                inputs={
                    "project_id": "pilot-project",
                    "scene_id": "sc001",
                    "asset_kind": "object",
                    "asset_id": "obj-001",
                },
            )
        )

        self.assertFalse(response.accepted)
        self.assertEqual(response.status, "fail_compile")
        self.assertIn("brief", response.message.lower())

    def test_operate_asset_reference_generate_records_orchestration_request(self) -> None:
        response = self.runner.start_run(
            StartRunRequest(
                runner_id="comfyui",
                operation_kind="operate",
                target_id="asset-reference-generate",
                requested_by="tests",
                channel="tests",
                run_id="operate-generate-001",
                inputs={
                    "project_id": "pilot-project",
                    "scene_id": "sc001",
                    "asset_kind": "object",
                    "asset_id": "obj-001",
                    "brief_text": "drone industrial azul con textura metalica desgastada",
                    "preset_id": "uc-img-02-frame-baseline-preview",
                },
            )
        )

        self.assertTrue(response.accepted)
        self.assertEqual(response.status, "soft_pass_with_fallback")
        self.assertTrue(len(response.artifact_refs) >= 1)
        self.assertIsNotNone(response.summary_path)
        summary_payload = json.loads(
            Path(response.summary_path).read_text(encoding="utf-8")  # type: ignore[arg-type]
        )
        self.assertEqual(summary_payload["status"], "soft_pass_with_fallback")
        self.assertEqual(summary_payload["target_id"], "asset-reference-generate")


if __name__ == "__main__":
    unittest.main()
