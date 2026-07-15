import json
import math
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

import sound_picker  # noqa: E402


class SoundPickerTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.output = Path(self.temporary.name)
        self.state = sound_picker.PickerState("test vibe", self.output, None)

    def tearDown(self):
        self.temporary.cleanup()

    def write_candidate(self, slot="tooltip-show", name="cand-1.mp3"):
        path = self.output / ".picker" / slot / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"candidate audio")
        sound_picker._write_metadata(
            path,
            {
                "kind": "generated",
                "source_slot": slot,
                "prompt": "soft useful blip",
                "parent_url": None,
                "edits": None,
            },
        )
        return path, self.state._url_for(path)

    def test_state_exposes_cross_slot_assignment_targets(self):
        targets = {target["name"] for target in self.state.targets()}
        self.assertIn("item-hover", targets)
        self.assertIn("nav-item-hover", targets)
        self.assertIn("tooltip-show", targets)

    def test_picker_uses_a_visual_waveform_editor(self):
        self.assertIn('id="wave-canvas"', sound_picker.PAGE)
        self.assertIn('id="trim-start-handle"', sound_picker.PAGE)
        self.assertIn('id="trim-end-handle"', sound_picker.PAGE)
        self.assertIn('type="range"', sound_picker.PAGE)
        self.assertIn("save as new revision", sound_picker.PAGE)
        self.assertNotIn("soften edge", sound_picker.PAGE.lower())
        self.assertNotIn('type="number"', sound_picker.PAGE)

    def test_accept_can_assign_candidate_to_a_different_slot_with_provenance(self):
        path, url = self.write_candidate()
        with patch.object(sound_picker, "probe_duration_ms", return_value=500):
            result = self.state.accept("nav-item-hover", url)

        self.assertTrue(result["ok"])
        destination = self.output / "navigation" / "nav-item-hover.mp3"
        self.assertEqual(destination.read_bytes(), path.read_bytes())
        entry = json.loads((self.output / "theme.json").read_text())["sounds"][
            "nav-item-hover"
        ]
        self.assertEqual(entry["prompt"], "soft useful blip")
        self.assertEqual(entry["accepted_from"]["slot"], "tooltip-show")
        self.assertIn("NAV_ITEM_HOVER", (self.output / "constants.ts").read_text())

    def test_replacing_current_snapshots_it_for_undo(self):
        current = self.output / "navigation" / "item-hover.mp3"
        current.parent.mkdir(parents=True, exist_ok=True)
        current.write_bytes(b"old current")
        (self.output / "theme.json").write_text(
            json.dumps(
                {
                    "sounds": {
                        "item-hover": {
                            "file": "navigation/item-hover.mp3",
                            "prompt": "old prompt",
                        }
                    }
                }
            )
        )
        _path, url = self.write_candidate("item-hover")
        with patch.object(sound_picker, "probe_duration_ms", return_value=500):
            self.state.accept("item-hover", url)

        history = json.loads((self.output / "theme.json").read_text())["sounds"][
            "item-hover"
        ]["assignment_history"]
        self.assertEqual(len(history), 1)
        snapshot = self.state._resolve_url(history[0]["url"])
        self.assertEqual(snapshot.read_bytes(), b"old current")

    def test_accept_can_adopt_an_existing_unmanifested_theme_file(self):
        current = self.output / "transactions" / "tx-sent.mp3"
        current.parent.mkdir(parents=True, exist_ok=True)
        current.write_bytes(b"existing selected audio")

        with patch.object(sound_picker, "probe_duration_ms", return_value=500):
            result = self.state.accept("tx-sent", "/files/transactions/tx-sent.mp3")

        self.assertTrue(result["ok"])
        self.assertEqual(current.read_bytes(), b"existing selected audio")
        entry = json.loads((self.output / "theme.json").read_text())["sounds"][
            "tx-sent"
        ]
        self.assertEqual(entry["accepted_from"]["kind"], "current")
        self.assertTrue(entry["prompt"])

    def test_concurrent_accepts_preserve_both_manifest_entries(self):
        for sound in ("tx-sent", "tx-received"):
            current = self.output / "transactions" / f"{sound}.mp3"
            current.parent.mkdir(parents=True, exist_ok=True)
            current.write_bytes(sound.encode())

        with patch.object(sound_picker, "probe_duration_ms", return_value=500):
            with ThreadPoolExecutor(max_workers=2) as pool:
                results = list(
                    pool.map(
                        lambda sound: self.state.accept(
                            sound, f"/files/transactions/{sound}.mp3"
                        ),
                        ("tx-sent", "tx-received"),
                    )
                )

        self.assertTrue(all(result["ok"] for result in results))
        sounds = json.loads((self.output / "theme.json").read_text())["sounds"]
        self.assertIn("tx-sent", sounds)
        self.assertIn("tx-received", sounds)

    def test_delete_is_candidate_only_and_cascades_revisions(self):
        parent, parent_url = self.write_candidate("item-hover", "cand.mp3")
        child, _child_url = self.write_candidate("item-hover", "rev.mp3")
        metadata = sound_picker._read_metadata(child)
        metadata.update({"kind": "revision", "parent_url": parent_url})
        sound_picker._write_metadata(child, metadata)

        result = self.state.delete_candidate(parent_url, cascade=True)
        self.assertEqual(result, {"ok": True, "deleted": 2})
        self.assertFalse(parent.exists())
        self.assertFalse(child.exists())
        self.assertTrue(sound_picker._read_metadata(parent)["deleted"])

    def test_audio_edit_validation_rejects_invalid_values(self):
        with self.assertRaisesRegex(ValueError, "gainDb must be a number"):
            sound_picker.validate_edits({"gainDb": "loud"}, 500)
        with self.assertRaisesRegex(ValueError, "leave at least 40 ms"):
            sound_picker.validate_edits(
                {"trimStartMs": 250, "trimEndMs": 230}, 500
            )
        with self.assertRaises(ValueError):
            sound_picker.validate_edits({"gainDb": math.inf}, 500)

    def test_filter_adds_release_and_limiter_without_shell_text(self):
        audio_filter, values = sound_picker.build_audio_filter(
            {"releaseMs": 12, "gainDb": -1.5}, 500
        )
        self.assertEqual(values["releaseMs"], 12)
        self.assertIn("afade=t=out", audio_filter)
        self.assertIn("volume=-1.50dB", audio_filter)
        self.assertIn("alimiter=limit=0.7943", audio_filter)


if __name__ == "__main__":
    unittest.main()
