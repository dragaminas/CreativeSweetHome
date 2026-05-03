from __future__ import annotations

import unittest

from openclaw_studio.application.session_engine import GuidedSessionEngine
from openclaw_studio.contracts.flows import ImplementationMaturity
from openclaw_studio.implementations import BUILTIN_FLOW_CATALOG


class BuiltinFlowCatalogAliasTests(unittest.TestCase):
    def setUp(self) -> None:
        self.session_engine = GuidedSessionEngine(BUILTIN_FLOW_CATALOG)

    def test_primary_aliases_are_unique_and_non_empty(self) -> None:
        primary_aliases = [flow.friendly_alias for flow in BUILTIN_FLOW_CATALOG]

        self.assertTrue(all(primary_aliases))
        self.assertEqual(len(primary_aliases), len(set(primary_aliases)))
        for flow in BUILTIN_FLOW_CATALOG:
            self.assertEqual(flow.user_aliases[0], flow.friendly_alias)

    def test_engine_matches_primary_and_spaced_aliases(self) -> None:
        expected_matches = {
            "prepara-video": "UC-VID-01",
            "prepara video": "UC-VID-01",
            "prepare-video": "UC-VID-01",
            "render-video": "UC-VID-02",
            "render video": "UC-VID-02",
            "explora-estilos": "UC-IMG-03",
            "texto a 3d": "UC-3D-01",
            "imagen-a-3d": "UC-3D-02",
        }

        for request_text, expected_use_case_id in expected_matches.items():
            with self.subTest(request_text=request_text):
                selected_flow = self.session_engine.select_flow_for_request(
                    f"quiero usar {request_text}"
                )
                self.assertEqual(selected_flow.use_case_id, expected_use_case_id)

    def test_3d_flows_point_to_trellis_as_active_route(self) -> None:
        expected_use_case_ids = ("UC-3D-01", "UC-3D-02", "UC-3D-03", "UC-3D-04")

        for use_case_id in expected_use_case_ids:
            with self.subTest(use_case_id=use_case_id):
                flow = next(
                    flow_definition
                    for flow_definition in BUILTIN_FLOW_CATALOG
                    if flow_definition.use_case_id == use_case_id
                )
                active_variant = flow.execution_variants[0]

                self.assertIn("trellis2", active_variant.variant_id)
                self.assertNotEqual(active_variant.maturity, ImplementationMaturity.LEGACY)
                self.assertIn(
                    "uc-3d-02-image-to-asset-trellis2-gguf-q4-v1.json",
                    active_variant.workflow_file_references[0],
                )
                self.assertTrue(
                    any(
                        variant.variant_id.startswith("hunyuan3d")
                        and variant.maturity == ImplementationMaturity.LEGACY
                        for variant in flow.execution_variants[1:]
                    )
                )


if __name__ == "__main__":
    unittest.main()
