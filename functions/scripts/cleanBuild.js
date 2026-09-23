const { rmSync } = require('node:fs');
const { resolve } = require('node:path');

// TypeScript does not remove output for deleted source files. Never package
// stale callable exports from a previous build.
rmSync(resolve(__dirname, '../lib'), { recursive: true, force: true });
