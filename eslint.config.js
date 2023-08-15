module.exports = [
  // {
  //   files: ['frontend/**/*.ts'],
  //   ignores: [
  //     'frontend/**/*.js',
  //     'frontend/**/*.d.ts',
  //     'frontend/packages/ui/dist/**/*.{js,ts}',
  //     'frontend/packages/*/types/*',
  //     'frontend/packages/shared/src/client/.generated/*',
  //     'node_modules/*',
  //     '**/*.config.{js,ts}',
  //     '!**/eslint.config.js',
  //   ],
  //   rules: {
  //     semi: 'error',
  //     'prefer-const': 'error',
  //   },
  //   linterOptions: {
  //     reportUnusedDisableDirectives: true,
  //   },
  // },
  {
    files: ['frontend/apps/electron/**/*.ts'],
    rules: {
      semi: 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['frontend/apps/site/**/*.ts'],
    rules: {
      semi: 'error',
      'prefer-const': 'error',
    },
  },
]
