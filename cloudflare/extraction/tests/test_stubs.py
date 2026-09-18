"""KAN-459. The shared dependency stub is idempotent, order-safe, and never
shadows a package that is really installed."""
import importlib.util
import os
import sys
import types
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import _stubs  # noqa: E402


class StubIfMissingTest(unittest.TestCase):
    NAME = 'brush_test_only_dependency'

    def tearDown(self):
        sys.modules.pop(self.NAME, None)

    def test_a_missing_package_gets_a_stub_that_find_spec_accepts(self):
        module = _stubs.stub_if_missing(self.NAME, thing=1)
        self.assertIs(sys.modules[self.NAME], module)
        self.assertEqual(module.thing, 1)
        # The old per-file stubs failed here: a bare ModuleType has no
        # __spec__, and the next module's find_spec raised ValueError.
        self.assertIsNotNone(importlib.util.find_spec(self.NAME))

    def test_a_second_call_is_a_no_op(self):
        first = _stubs.stub_if_missing(self.NAME, thing=1)
        second = _stubs.stub_if_missing(self.NAME, thing=2, other=3)
        self.assertIs(first, second)
        self.assertEqual(first.thing, 1)  # an attribute already set is kept
        self.assertEqual(first.other, 3)

    def test_a_really_installed_package_is_never_shadowed(self):
        module = _stubs.stub_if_missing('json', loads='not the real one')
        import json
        self.assertIs(module, json)
        self.assertIsNot(json.loads, 'not the real one')

    def test_a_bare_module_someone_else_planted_is_adopted_in_place(self):
        planted = types.ModuleType(self.NAME)
        planted.RequestException = KeyError
        sys.modules[self.NAME] = planted
        module = _stubs.stub_if_missing(self.NAME, RequestException=Exception, post=None)
        self.assertIs(module, planted)  # whoever imported it earlier still holds the right object
        self.assertIs(planted.RequestException, KeyError)
        self.assertIsNone(planted.post)
        self.assertIsNotNone(importlib.util.find_spec(self.NAME))

    def test_the_two_extraction_dependencies_are_covered(self):
        requests, duckdb = _stubs.stub_missing_dependencies()
        self.assertIs(sys.modules['requests'], requests)
        self.assertIs(sys.modules['duckdb'], duckdb)
        self.assertTrue(hasattr(requests, 'RequestException'))
        # Whether real or stubbed, a second call hands back the same objects.
        self.assertEqual(_stubs.stub_missing_dependencies(), (requests, duckdb))


if __name__ == '__main__':
    unittest.main()
