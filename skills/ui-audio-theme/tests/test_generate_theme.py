import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

import generate_theme  # noqa: E402


class GenerateThemeTests(unittest.TestCase):
    def test_hover_slots_are_first_class_and_tooltip_remains_distinct(self):
        navigation = generate_theme.SOUND_CATEGORIES["navigation"]
        self.assertIn("item-hover", navigation)
        self.assertIn("nav-item-hover", navigation)
        self.assertIn("tooltip-show", generate_theme.SOUND_CATEGORIES["modals"])

    def test_regeneration_preserves_existing_manifest_entries(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary)
            existing = {
                "name": "pixel-minimal",
                "version": "1.0.0",
                "vibe": "old vibe",
                "sounds": {
                    "notification-success": {
                        "file": "feedback/notification-success.mp3",
                        "duration_ms": 500,
                        "prompt": "accepted prompt",
                        "picked": True,
                    }
                },
            }
            (output / "theme.json").write_text(json.dumps(existing))

            def fake_generate(**kwargs):
                path = kwargs["output_path"]
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(b"audio")
                return generate_theme.GenerationResult(
                    sound_name=path.stem,
                    file_path=str(path),
                    duration_ms=500,
                    prompt=kwargs["prompt"],
                    success=True,
                )

            with (
                patch.object(generate_theme, "get_api_key", return_value="test"),
                patch.object(generate_theme, "require_ffmpeg"),
                patch.object(generate_theme, "generate_sound", side_effect=fake_generate),
                patch.object(generate_theme.time, "sleep"),
            ):
                manifest = generate_theme.generate_theme(
                    vibe="new vibe",
                    output_dir=output,
                    regenerate_only=["nav-item-hover"],
                )

            self.assertTrue(manifest["sounds"]["notification-success"]["picked"])
            self.assertIn("nav-item-hover", manifest["sounds"])
            constants = (output / "constants.ts").read_text()
            self.assertIn("NOTIFICATION_SUCCESS", constants)
            self.assertIn("NAV_ITEM_HOVER", constants)


if __name__ == "__main__":
    unittest.main()
