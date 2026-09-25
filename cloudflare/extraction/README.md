# Extraction scripts

The Python side of the POI registry: the container's `run_job.py`, the
Overture country import and promotion, the OSM supplement, the Multibanco
import, the evidence-join tooling and the one-off backfills that write
migrations. `docs/evidence-join-runbook.md` is the operator's guide; this
file is about running the tests.

## Country name data

Every new Overture country extract must retain `names.primary`, the complete
source-supplied `names.common` language map, and its ISO country code. The
loader carries those fields through candidates and served POIs and publishes
the country’s available language keys on successful import. Do not hardcode a
two-language list or infer translations from the spelling of the primary name.
The original name remains the compatibility fallback when a source language
is absent. Importing a new country is still a separate deployment decision.

## Tests

One command, from this directory, on a bare interpreter (Python 3.11+, no
`requests`, no `duckdb`, no Cloudflare token, no network):

```
cd cloudflare/extraction && BRUSH_TYPE_RELATION=sql python3 -m unittest discover -s tests
```

`BRUSH_TYPE_RELATION=sql` replays `type_relation` from the committed
`type_relation_schema.sql` and migrations, so nothing reads live D1. CI runs
exactly this on every PR that touches `cloudflare/extraction/**`, the
category and dictionary JSON, the schema or a migration
(`.github/workflows/extraction-tests.yml`), and then runs the same modules
again reversed and shuffled.

### Order independence

`unittest discover` loads modules in filename order, which is the one order
a stub leaking between modules never trips on. Prove a change is order-safe
with:

```
python3 tests/run_in_order.py reverse
python3 tests/run_in_order.py shuffle --seed 7
BRUSH_TYPE_RELATION=sql python3 -m unittest discover -s tests -p 'test_[a-m]*.py'
BRUSH_TYPE_RELATION=sql python3 -m unittest discover -s tests -p 'test_[n-z]*.py'
```

### Stubbing `requests` and `duckdb`

The extraction image ships both; a laptop or the CI runner does not, and
`d1_client`, `run_job` and `extract_overture` import them at module level.
A test module that imports any of those goes through the shared stub, which
is idempotent, order-safe, and never shadows a package that is really
installed:

```python
sys.path.insert(0, os.path.join(EXTRACTION_DIR, 'tests'))
from _stubs import stub_missing_dependencies  # noqa: E402
stub_missing_dependencies()

import run_job  # noqa: E402
```

Do not plant a `types.ModuleType('requests')` in `sys.modules` yourself: a
bare module has no `__spec__`, and the next module's
`importlib.util.find_spec` raises on it (KAN-459 is the history).

### One module

```
BRUSH_TYPE_RELATION=sql python3 -m unittest tests.test_chain_brands
```

A test that needs the network or wrangler is a bug in the test. Mock the
client at the module boundary (`run_job.d1_client`,
`validator.subprocess.run`), as the existing tests do.
