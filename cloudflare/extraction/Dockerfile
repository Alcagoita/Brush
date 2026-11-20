# KAN-354. The extraction pipeline, as a Cloudflare Container. Same image
# for both triggers — MODE/TARGET (set per-invocation via envVars when the
# Worker calls container.start(), see src/index.ts's triggerBuild) is the
# only thing that differs.
#
# Build context is the REPO ROOT, not this directory — set explicitly via
# `image_build_context` in wrangler.jsonc (wrangler's own default is the
# Dockerfile's own directory, too narrow for what this image needs; see
# that config's comment). Every COPY below is repo-root-relative.
FROM python:3.12-slim

# httpfs (DuckDB's Iceberg REST support) needs libcurl at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY cloudflare/extraction/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# The pipeline reads src/poiTypeCategories.json, src/storeSubtypeCategories.json,
# src/foodSubtypeCategories.json (classification + category_ids.py) and
# src/constants/brandDictionary.json, storeSubtypeDictionary.json,
# restaurantFoodDictionary.json (classify_and_load.py's brand/keyword
# fallback) — REPO_ROOT-relative paths, so both cloudflare/ and the repo
# root's src/ must be present in the image, not just extraction/.
COPY src ./src
COPY cloudflare/src ./cloudflare/src
COPY cloudflare/extraction ./cloudflare/extraction
# KAN-461: the landmark rule's word lists (landmark_identity.py reads them
# REPO_ROOT-relative): kinds per language, PT place names, translations.
COPY docs/kan-461/landmark-kinds.json docs/kan-461/place-names-PT.txt docs/kan-461/keep-both.json ./docs/kan-461/
COPY docs/kan-433/landmark-terms.json ./docs/kan-433/

WORKDIR /app/cloudflare/extraction
RUN mkdir -p ../build

ENTRYPOINT ["python3", "run_job.py"]
