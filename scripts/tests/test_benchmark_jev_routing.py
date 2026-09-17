"""Offline checks for paired scoring; no Gateway requests."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('jev_benchmark', Path(__file__).parents[1]/'benchmark-jev-routing.py')
benchmark = importlib.util.module_from_spec(spec)
spec.loader.exec_module(benchmark)

class ScoringTests(unittest.TestCase):
    def test_errors_and_fallbacks_stay_in_denominator(self):
        cases = [{'id': 'positive', 'category': 'ordinary', 'acceptable': ['skill:x']},
                 {'id': 'negative', 'category': 'negative', 'acceptable': ['NONE']}]
        rows = []
        for case in cases:
            for arm in ['keyword', 'jev']:
                rows.append({'case_id': case['id'], 'category': case['category'], 'repeat': 1,
                    'arm': arm, 'prediction': 'NONE', 'suggestions': [], 'correct': True,
                    'latency_ms': 100, 'helper': {'source': 'error'} if arm == 'jev' else None,
                    'error': 'hook-error' if arm == 'jev' and case['id'] == 'negative' else None})
        with tempfile.TemporaryDirectory() as scratch:
            folder = Path(scratch)
            (folder/'metadata.json').write_text('{"repeats":1}')
            (folder/'results.jsonl').write_text('\n'.join(json.dumps(r) for r in rows))
            result = benchmark.summarize(folder, cases)
            self.assertEqual(result['keyword']['accuracy'], .5)
            self.assertEqual(result['jev']['accuracy'], 0)
            self.assertEqual(result['jev']['trials'], 2)
            self.assertEqual(result['jev']['fallbacks'], 2)
            self.assertEqual(result['jev']['top2_hits'], 0)
            self.assertEqual(result['paired_lift'], -.5)
            (folder/'results.jsonl').write_text(json.dumps(rows[0]))
            with self.assertRaisesRegex(AssertionError, 'Incomplete'):
                benchmark.summarize(folder, cases)

if __name__ == '__main__':
    unittest.main()
