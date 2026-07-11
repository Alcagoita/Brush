module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // KAN-259 — hardcoded-color guard. Colors live in src/theme/tokens.ts
      // and reach components via useTheme(); src/mockData is sample data,
      // not rendered UI, so it's exempt.
      files: ['src/**/*.{ts,tsx}'],
      excludedFiles: ['src/theme/**', 'src/mockData/**'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: "Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
            message: 'Hardcoded hex color literal — use a token from src/theme/tokens.ts via useTheme() instead (repo rule: never hardcode a color).',
          },
          {
            selector: "Literal[value=/^rgba?\\(/]",
            message: 'Hardcoded rgb()/rgba() color literal — use a token from src/theme/tokens.ts via useTheme() instead (repo rule: never hardcode a color).',
          },
        ],
      },
    },
  ],
};
