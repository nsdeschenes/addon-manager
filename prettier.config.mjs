// Modified from getsentry/sentry
// See: https://github.com/getsentry/sentry/blob/master/prettier.config.mjs

/**
 * @type {import("prettier").Config}
 */
const config = {
  plugins: ['@prettier/plugin-oxc', '@ianvs/prettier-plugin-sort-imports'],
  importOrder: [
    String.raw`^@sentry$`,
    // Node.js builtins.
    '<BUILTIN_MODULES>',
    '',
    // Packages.
    '<THIRD_PARTY_MODULES>',
    '',
    // Parent imports. Put `..` last.
    String.raw`^\.\.(?!/?$)`,
    String.raw`^\.\./?$`,
    '',
    // Other relative imports. Put same-folder imports and `.` last.
    String.raw`^\./(?=.*/)(?!/?$)`,
    String.raw`^\.(?!/?$)`,
    String.raw`^\./?$`,
    // newline after imports
    '',
  ],
  bracketSpacing: false,
  bracketSameLine: false,
  printWidth: 90,
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  useTabs: false,
  arrowParens: 'avoid',
};

export default config;