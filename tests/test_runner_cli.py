from __future__ import annotations

import io
import json
import unittest
from contextlib import redirect_stdout

from openclaw_studio import runner_cli


class RunnerCliTests(unittest.TestCase):
    def test_list_runners_uses_registered_catalog(self) -> None:
        stdout = io.StringIO()

        with redirect_stdout(stdout):
            exit_code = runner_cli.main(["--json", "list-runners"])

        payload = json.loads(stdout.getvalue())
        runner_ids = [entry["runner_id"] for entry in payload]

        self.assertEqual(exit_code, 0)
        self.assertEqual(runner_ids, sorted(runner_ids))
        self.assertIn("blender", runner_ids)
        self.assertIn("comfyui", runner_ids)
        self.assertIn("hunyuan3d", runner_ids)


if __name__ == "__main__":
    unittest.main()
