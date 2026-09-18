"""KAN-459. One stand-in for the extraction image's network dependencies.

The extraction image ships `requests` and `duckdb` for real; a bare
interpreter — a laptop, the CI runner — does not have them, and the modules
under test import them at module level (`d1_client`, `run_job`,
`extract_overture`). Every test module that needs one of them absent used to
roll its own stub, and the copies disagreed:

  * one installed a bare `types.ModuleType` unconditionally, which has no
    `__spec__`; the next module's `importlib.util.find_spec('requests')` then
    raised `ValueError: requests.__spec__ is None`, so the suite passed one
    module at a time and failed under discover, in an order that depended on
    filenames;
  * one guarded on `'requests' not in sys.modules` and would have shadowed
    the real package for every later test had it been imported first.

This module is idempotent and order-safe, and never shadows a package that
is really installed. Import it before the module under test:

    from _stubs import stub_missing_dependencies
    stub_missing_dependencies()
    import run_job  # noqa: E402

A stub carries a real `ModuleSpec` and an empty `__path__`, so `find_spec`
answers for it like any package and a second call is a no-op.
"""
import importlib.machinery
import importlib.util
import sys
import types

REQUESTS_ATTRIBUTES = {'RequestException': Exception, 'get': None, 'post': None, 'put': None}


def _installed(name):
    """Is a real distribution of `name` importable? A stub of ours, or a
    bare module someone else planted, is not one."""
    module = sys.modules.get(name)
    if module is not None:
        return not getattr(module, '__brush_test_stub__', False) and getattr(module, '__spec__', None) is not None \
            and module.__spec__.origin not in (None, 'brush-test-stub')
    try:
        return importlib.util.find_spec(name) is not None
    except (ValueError, ImportError):
        return False


def stub_if_missing(name, **attributes):
    """Install a stand-in for `name` unless it is really installed. Returns
    the module that `import name` will now give — real or stub."""
    if _installed(name):
        return sys.modules.get(name) or importlib.import_module(name)
    # A bare module someone else planted is adopted in place, not replaced:
    # a module under test may already hold it as `requests`.
    module = sys.modules.get(name)
    if module is None:
        module = types.ModuleType(name)
        sys.modules[name] = module
    if not getattr(module, '__brush_test_stub__', False):
        module.__spec__ = importlib.machinery.ModuleSpec(name, None, origin='brush-test-stub')
        if not hasattr(module, '__path__'):
            module.__path__ = []
        module.__brush_test_stub__ = True
    for key, value in attributes.items():
        if not hasattr(module, key):
            setattr(module, key, value)
    return module


def stub_missing_dependencies():
    """`requests` and `duckdb`, the two the extraction scripts import at
    module level. Tests that exercise a network path patch the attribute
    they need on the module this returns."""
    return stub_if_missing('requests', **REQUESTS_ATTRIBUTES), stub_if_missing('duckdb')
