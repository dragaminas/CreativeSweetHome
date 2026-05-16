"""Tests para validate_atomic y validate_composed en ComfyUIRunner (Task 8.18)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Ensure src is on the path
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from openclaw_studio.comfyui_smoke_validation import (
    ATOMIC_CASE_SPECS,
    COMPOSED_CASE_SPECS,
    SMOKE_CASE_SPECS,
    list_atomic_case_specs,
    list_composed_case_specs,
    list_smoke_case_specs,
)
from openclaw_studio.runners.comfyui import (
    ATOMIC_TARGET_ALIASES,
    COMPOSED_TARGET_ALIASES,
    ComfyUIRunner,
    RUNNER_ID,
)
from openclaw_studio.runners.contracts import StartRunRequest


@pytest.fixture
def runner(tmp_path):
    """Create a ComfyUIRunner with isolated directories."""
    r = ComfyUIRunner(
        repo_root=tmp_path / "repo",
        studio_dir=tmp_path / "studio",
        comfyui_dir=tmp_path / "comfyui",
        comfyui_host="127.0.0.1",
        comfyui_port=8188,
    )
    # Ensure repo dir exists so spawn_worker doesn't fail on cwd
    (tmp_path / "repo").mkdir(parents=True, exist_ok=True)
    return r


class TestAtomicCaseSpecs:
    """Test that atomic case specs are properly defined."""

    def test_atomic_specs_are_not_empty(self):
        specs = list_atomic_case_specs()
        assert len(specs) > 0, "ATOMIC_CASE_SPECS must not be empty"

    def test_atomic_specs_have_required_fields(self):
        specs = list_atomic_case_specs()
        for spec in specs:
            assert spec.case_id.startswith("AT-"), f"case_id {spec.case_id} must start with 'AT-'"
            assert spec.display_label, f"display_label must not be empty for {spec.case_id}"
            assert spec.workflow_relpath, f"workflow_relpath must not be empty for {spec.case_id}"
            assert spec.use_case_id, f"use_case_id must not be empty for {spec.case_id}"
            assert spec.preset_id, f"preset_id must not be empty for {spec.case_id}"

    def test_atomic_case_ids_match_documentation(self):
        expected_ids = {
            "AT-IMG-02-01",
            "AT-VID-01-01",
            "AT-VID-02-01",
            "AT-IMG-03-01",
            "AT-VID-03-01",
            "AT-VID-04-01",
        }
        actual_ids = {spec.case_id for spec in list_atomic_case_specs()}
        assert expected_ids.issubset(actual_ids), (
            f"Missing atomic case IDs: {expected_ids - actual_ids}"
        )


class TestComposedCaseSpecs:
    """Test that composed case specs are properly defined."""

    def test_composed_specs_are_not_empty(self):
        specs = list_composed_case_specs()
        assert len(specs) > 0, "COMPOSED_CASE_SPECS must not be empty"

    def test_composed_specs_have_required_fields(self):
        specs = list_composed_case_specs()
        for spec in specs:
            assert spec.case_id.startswith("CP-"), f"case_id {spec.case_id} must start with 'CP-'"
            assert spec.display_label, f"display_label must not be empty for {spec.case_id}"
            assert spec.workflow_relpath, f"workflow_relpath must not be empty for {spec.case_id}"
            assert spec.use_case_id, f"use_case_id must not be empty for {spec.case_id}"
            assert spec.preset_id, f"preset_id must not be empty for {spec.case_id}"

    def test_composed_case_ids_match_documentation(self):
        expected_ids = {
            "CP-STILL-01",
            "CP-VIDEO-01",
            "CP-MOTION-01",
        }
        actual_ids = {spec.case_id for spec in list_composed_case_specs()}
        assert expected_ids.issubset(actual_ids), (
            f"Missing composed case IDs: {expected_ids - actual_ids}"
        )


class TestRunnerDescribe:
    """Test that runner describe includes validate_atomic and validate_composed."""

    def test_describe_includes_atomic(self, runner):
        desc = runner.describe()
        assert "validate_atomic" in desc.supported_operation_kinds

    def test_describe_includes_composed(self, runner):
        desc = runner.describe()
        assert "validate_composed" in desc.supported_operation_kinds

    def test_describe_includes_smoke(self, runner):
        desc = runner.describe()
        assert "validate_smoke" in desc.supported_operation_kinds


class TestRunnerListTargets:
    """Test that list_targets works for all operation kinds."""

    def test_list_targets_smoke_returns_suite(self, runner):
        targets = runner.list_targets("validate_smoke")
        target_ids = [t.target_id for t in targets]
        assert "smoke" in target_ids

    def test_list_targets_smoke_returns_cases(self, runner):
        targets = runner.list_targets("validate_smoke")
        case_targets = [t for t in targets if t.target_kind == "case"]
        assert len(case_targets) == len(list_smoke_case_specs())

    def test_list_targets_atomic_returns_suite(self, runner):
        targets = runner.list_targets("validate_atomic")
        target_ids = [t.target_id for t in targets]
        assert "atomic" in target_ids

    def test_list_targets_atomic_returns_cases(self, runner):
        targets = runner.list_targets("validate_atomic")
        case_targets = [t for t in targets if t.target_kind == "case"]
        assert len(case_targets) == len(list_atomic_case_specs())

    def test_list_targets_composed_returns_suite(self, runner):
        targets = runner.list_targets("validate_composed")
        target_ids = [t.target_id for t in targets]
        assert "composed" in target_ids

    def test_list_targets_composed_returns_cases(self, runner):
        targets = runner.list_targets("validate_composed")
        case_targets = [t for t in targets if t.target_kind == "case"]
        assert len(case_targets) == len(list_composed_case_specs())

    def test_list_targets_unknown_operation_returns_empty(self, runner):
        targets = runner.list_targets("unknown_operation")
        assert targets == []

    def test_atomic_targets_have_correct_metadata(self, runner):
        targets = runner.list_targets("validate_atomic")
        case_targets = [t for t in targets if t.target_kind == "case"]
        for target in case_targets:
            assert "use_case_id" in target.metadata
            assert "preset_id" in target.metadata
            assert "blocking" in target.metadata

    def test_composed_targets_have_correct_metadata(self, runner):
        targets = runner.list_targets("validate_composed")
        case_targets = [t for t in targets if t.target_kind == "case"]
        for target in case_targets:
            assert "use_case_id" in target.metadata
            assert "preset_id" in target.metadata
            assert "blocking" in target.metadata


class TestRunnerStartRun:
    """Test that start_run properly handles atomic and composed operations."""

    def test_start_run_atomic_accepted(self, runner, tmp_path):
        """Test that start_run accepts validate_atomic requests."""
        with patch.object(runner, 'spawn_worker', return_value=9999):
            request = StartRunRequest(
                runner_id=RUNNER_ID,
                operation_kind="validate_atomic",
                target_id="atomic",
                requested_by="test",
                channel="test",
                run_id="atomic-test-001",
            )
            response = runner.start_run(request)
        assert response.accepted is True
        assert response.status == "queued"
        assert response.operation_kind == "validate_atomic"

    def test_start_run_composed_accepted(self, runner, tmp_path):
        """Test that start_run accepts validate_composed requests."""
        with patch.object(runner, 'spawn_worker', return_value=9999):
            request = StartRunRequest(
                runner_id=RUNNER_ID,
                operation_kind="validate_composed",
                target_id="composed",
                requested_by="test",
                channel="test",
                run_id="composed-test-001",
            )
            response = runner.start_run(request)
        assert response.accepted is True
        assert response.status == "queued"
        assert response.operation_kind == "validate_composed"

    def test_start_run_atomic_with_case_id(self, runner, tmp_path):
        """Test that start_run accepts validate_atomic with specific case_id."""
        with patch.object(runner, 'spawn_worker', return_value=9999):
            request = StartRunRequest(
                runner_id=RUNNER_ID,
                operation_kind="validate_atomic",
                target_id="AT-IMG-02-01",
                requested_by="test",
                channel="test",
                run_id="atomic-at-img02-001",
            )
            response = runner.start_run(request)
        assert response.accepted is True
        assert response.target_id == "AT-IMG-02-01"

    def test_start_run_composed_with_case_id(self, runner, tmp_path):
        """Test that start_run accepts validate_composed with specific case_id."""
        with patch.object(runner, 'spawn_worker', return_value=9999):
            request = StartRunRequest(
                runner_id=RUNNER_ID,
                operation_kind="validate_composed",
                target_id="CP-STILL-01",
                requested_by="test",
                channel="test",
                run_id="composed-cp-still-001",
            )
            response = runner.start_run(request)
        assert response.accepted is True
        assert response.target_id == "CP-STILL-01"

    def test_start_run_atomic_with_unknown_case_rejected(self, runner, tmp_path):
        """Test that start_run rejects validate_atomic with unknown case_id."""
        request = StartRunRequest(
            runner_id=RUNNER_ID,
            operation_kind="validate_atomic",
            target_id="AT-UNKNOWN-999",
            requested_by="test",
            channel="test",
            run_id="atomic-unknown-001",
        )
        response = runner.start_run(request)
        assert response.accepted is False
        assert response.status == "fail_compile"

    def test_start_run_composed_with_unknown_case_rejected(self, runner, tmp_path):
        """Test that start_run rejects validate_composed with unknown case_id."""
        request = StartRunRequest(
            runner_id=RUNNER_ID,
            operation_kind="validate_composed",
            target_id="CP-UNKNOWN-999",
            requested_by="test",
            channel="test",
            run_id="composed-unknown-001",
        )
        response = runner.start_run(request)
        assert response.accepted is False
        assert response.status == "fail_compile"

    def test_start_run_atomic_with_alias(self, runner, tmp_path):
        """Test that start_run accepts validate_atomic with suite alias."""
        for alias in ATOMIC_TARGET_ALIASES:
            if alias == "":
                continue
            request = StartRunRequest(
                runner_id=RUNNER_ID,
                operation_kind="validate_atomic",
                target_id=alias,
                requested_by="test",
                channel="test",
                run_id=f"atomic-alias-{alias}-001",
            )
            response = runner.start_run(request)
            assert response.accepted is True, f"Alias {alias!r} should be accepted"

    def test_start_run_composed_with_alias(self, runner, tmp_path):
        """Test that start_run accepts validate_composed with suite alias."""
        for alias in COMPOSED_TARGET_ALIASES:
            if alias == "":
                continue
            request = StartRunRequest(
                runner_id=RUNNER_ID,
                operation_kind="validate_composed",
                target_id=alias,
                requested_by="test",
                channel="test",
                run_id=f"composed-alias-{alias}-001",
            )
            response = runner.start_run(request)
            assert response.accepted is True, f"Alias {alias!r} should be accepted"

    def test_start_run_atomic_validation_paths_structure(self, runner, tmp_path):
        """Test that start_run computes correct validation directory paths for atomic."""
        run_id = "atomic-paths-test-001"
        request = StartRunRequest(
            runner_id=RUNNER_ID,
            operation_kind="validate_atomic",
            target_id="atomic",
            requested_by="test",
            channel="test",
            run_id=run_id,
        )
        response = runner.start_run(request)
        assert response.accepted is True

        # Verify the run_id is stored correctly in the state
        validation_root = runner.studio_dir / "Validation" / RUNNER_ID / "atomic" / run_id
        manifest_path = validation_root / "manifests" / "run.json"
        assert manifest_path.exists()
        # Verify the state contains the expected structure
        import json
        with open(manifest_path) as f:
            state = json.load(f)
        assert state["run_id"] == run_id
        assert state["operation_kind"] == "validate_atomic"
        assert state["target_id"] == "atomic"
        assert state["status"] == "queued"
        # Verify paths are persisted correctly
        assert state["validation_root"] == str(validation_root)
        assert state["manifest_path"] == str(manifest_path)
        assert str(validation_root / "evidence") in state["evidence_path"]
        # Verify directories were created by start_run
        assert (validation_root / "manifests").exists()
        assert (validation_root / "evidence").exists()
        assert (validation_root / "logs").exists()

    def test_start_run_composed_validation_paths_structure(self, runner, tmp_path):
        """Test that start_run computes correct validation directory paths for composed."""
        run_id = "composed-paths-test-001"
        request = StartRunRequest(
            runner_id=RUNNER_ID,
            operation_kind="validate_composed",
            target_id="composed",
            requested_by="test",
            channel="test",
            run_id=run_id,
        )
        response = runner.start_run(request)
        assert response.accepted is True

        # Verify the run_id is stored correctly in the state
        validation_root = runner.studio_dir / "Validation" / RUNNER_ID / "composed" / run_id
        manifest_path = validation_root / "manifests" / "run.json"
        assert manifest_path.exists()
        # Verify the state contains the expected structure
        import json
        with open(manifest_path) as f:
            state = json.load(f)
        assert state["run_id"] == run_id
        assert state["operation_kind"] == "validate_composed"

    def test_start_run_duplicate_atomic_run_rejected(self, runner, tmp_path):
        """Test that start_run rejects duplicate run_id for atomic."""
        run_id = "atomic-dup-test-001"
        request = StartRunRequest(
            runner_id=RUNNER_ID,
            operation_kind="validate_atomic",
            target_id="atomic",
            requested_by="test",
            channel="test",
            run_id=run_id,
        )
        response1 = runner.start_run(request)
        assert response1.accepted is True

        # Second run with same run_id should be rejected
        response2 = runner.start_run(request)
        assert response2.accepted is False
        assert response2.status == "fail_runtime"


class TestRunnerNormalizeTargets:
    """Test target normalization for atomic and composed operations."""

    def test_normalize_atomic_target_none(self, runner):
        result = runner.normalize_atomic_target(None)
        assert result == "atomic"

    def test_normalize_atomic_target_suite_alias(self, runner):
        for alias in ATOMIC_TARGET_ALIASES:
            if alias == "":
                result = runner.normalize_atomic_target(None)
                assert result == "atomic"
                continue
            result = runner.normalize_atomic_target(alias)
            assert result == "atomic", f"Alias {alias!r} should normalize to 'atomic'"

    def test_normalize_atomic_target_known_case(self, runner):
        result = runner.normalize_atomic_target("AT-IMG-02-01")
        assert result == "AT-IMG-02-01"

    def test_normalize_atomic_target_unknown_case_raises(self, runner):
        with pytest.raises(ValueError, match="case_id desconocido"):
            runner.normalize_atomic_target("AT-UNKNOWN-999")

    def test_normalize_composed_target_none(self, runner):
        result = runner.normalize_composed_target(None)
        assert result == "composed"

    def test_normalize_composed_target_suite_alias(self, runner):
        for alias in COMPOSED_TARGET_ALIASES:
            if alias == "":
                result = runner.normalize_composed_target(None)
                assert result == "composed"
                continue
            result = runner.normalize_composed_target(alias)
            assert result == "composed", f"Alias {alias!r} should normalize to 'composed'"

    def test_normalize_composed_target_known_case(self, runner):
        result = runner.normalize_composed_target("CP-STILL-01")
        assert result == "CP-STILL-01"

    def test_normalize_composed_target_unknown_case_raises(self, runner):
        with pytest.raises(ValueError, match="case_id desconocido"):
            runner.normalize_composed_target("CP-UNKNOWN-999")


class TestBuildValidationPaths:
    """Test build_validation_paths method for atomic and composed."""

    def test_build_atomic_paths_structure(self, runner, tmp_path):
        paths = runner.build_validation_paths("atomic-test-001", "atomic")
        assert "validation_root" in paths
        assert "manifests_dir" in paths
        assert "evidence_dir" in paths
        assert "logs_dir" in paths
        assert "fixtures_dir" in paths
        assert "published_dir" in paths
        assert "output_dir" in paths
        assert "manifest_path" in paths
        assert "summary_path" in paths
        assert "evidence_path" in paths
        assert "stdout_log_path" in paths
        assert "stderr_log_path" in paths

    def test_atomic_paths_point_to_correct_location(self, runner, tmp_path):
        run_id = "atomic-test-002"
        paths = runner.build_validation_paths(run_id, "atomic")
        expected_root = runner.studio_dir / "Validation" / RUNNER_ID / "atomic" / run_id
        assert paths["validation_root"] == expected_root
        assert paths["manifest_path"] == expected_root / "manifests" / "run.json"
        assert paths["summary_path"] == expected_root / "manifests" / "summary.json"
        assert paths["evidence_path"] == expected_root / "evidence" / "summary.md"

    def test_composed_paths_point_to_correct_location(self, runner, tmp_path):
        run_id = "composed-test-001"
        paths = runner.build_validation_paths(run_id, "composed")
        expected_root = runner.studio_dir / "Validation" / RUNNER_ID / "composed" / run_id
        assert paths["validation_root"] == expected_root
        assert paths["manifest_path"] == expected_root / "manifests" / "run.json"


class TestExecuteRunUnsupported:
    """Test that execute_run properly rejects unsupported operations."""

    def test_execute_run_unknown_operation(self, runner):
        result = runner.execute_run(
            operation_kind="unknown_operation",
            run_id="test-001",
            target_id=None,
        )
        assert result.status == "unsupported"
        assert "unknown_operation" in result.message


class TestSmokeValidationImports:
    """Test that the new functions are properly exported from comfyui_smoke_validation."""

    def test_list_atomic_case_specs_is_callable(self):
        specs = list_atomic_case_specs()
        assert isinstance(specs, list)

    def test_list_composed_case_specs_is_callable(self):
        specs = list_composed_case_specs()
        assert isinstance(specs, list)

    def test_atomic_specs_are_separate_from_smoke(self):
        atomic_ids = {s.case_id for s in list_atomic_case_specs()}
        smoke_ids = {s.case_id for s in list_smoke_case_specs()}
        assert atomic_ids.isdisjoint(smoke_ids), (
            "Atomic and smoke specs should not share case IDs"
        )

    def test_composed_specs_are_separate_from_smoke(self):
        composed_ids = {s.case_id for s in list_composed_case_specs()}
        smoke_ids = {s.case_id for s in list_smoke_case_specs()}
        assert composed_ids.isdisjoint(smoke_ids), (
            "Composed and smoke specs should not share case IDs"
        )

    def test_atomic_specs_are_separate_from_composed(self):
        atomic_ids = {s.case_id for s in list_atomic_case_specs()}
        composed_ids = {s.case_id for s in list_composed_case_specs()}
        assert atomic_ids.isdisjoint(composed_ids), (
            "Atomic and composed specs should not share case IDs"
        )
