import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/** List source modules without treating test helpers as production modules. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === '__tests__') return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}

describe('KAN-350 Google Places retirement', () => {
  it('keeps the Places API endpoint and credential out of mobile and Functions source', () => {
    const sources = [
      ...sourceFiles(join(ROOT, 'src')).filter(path => path !== join(ROOT, 'src/config/keys.ts')),
      ...sourceFiles(join(ROOT, 'functions/src')),
    ];

    for (const path of sources) {
      const source = readFileSync(path, 'utf8');
      expect(source).not.toMatch(/places\.googleapis\.com|GOOGLE_PLACES_API_KEY/);
      if (path.startsWith(join(ROOT, 'src'))) {
        expect(source).not.toMatch(/from ['"][^'"]*\/config\/keys['"]/);
      }
    }
  });

  it('does not export the retired app-facing callables', () => {
    const entrypoint = readFileSync(join(ROOT, 'functions/src/index.ts'), 'utf8');
    expect(entrypoint).not.toMatch(/searchNearbyPlacesProxy|placesAutocompleteProxy|getPlaceDetailsProxy/);
  });

  it('keeps live nearby search on Brush’s own API', () => {
    const maps = readFileSync(join(ROOT, 'src/services/maps.ts'), 'utf8');
    expect(maps).not.toMatch(/from ['"]\.\/osmPlaces['"]/);
  });

  it('retains the internal extraction script’s environment-based credential', () => {
    const extraction = readFileSync(join(ROOT, 'cloudflare/extraction/enrich_google_places.py'), 'utf8');
    expect(extraction).toContain("os.environ.get('GOOGLE_PLACES_API_KEY')");
  });
});
