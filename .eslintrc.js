/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  extends: [
    'prettier',
    'eslint:recommended',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    projectService: true,
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'jest', 'unicorn', 'import', 'perfectionist'],
  rules: {

    //
    // typescript-eslint
    //

    '@typescript-eslint/return-await': [
      'error',
      'error-handling-correctness-only',
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    // '@typescript-eslint/consistent-type-exports': 'error',
    '@typescript-eslint/no-unnecessary-template-expression': 'error',
    '@typescript-eslint/no-unnecessary-condition': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/method-signature-style': 'error',
    '@typescript-eslint/no-redundant-type-constituents': 'error',
    '@typescript-eslint/no-unnecessary-type-parameters': 'error',
    '@typescript-eslint/no-unnecessary-type-arguments': 'error',
    '@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
    '@typescript-eslint/no-deprecated': 'error',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { disallowTypeAnnotations: false },
    ],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-empty-object-type': [
      'error',
      {
        allowInterfaces: 'always',
      },
    ],
    '@typescript-eslint/no-empty-function': 'off',

    //
    // eslint-base
    //

    'no-irregular-whitespace': 'off',
    'no-param-reassign': 'error',
    curly: ['error', 'all'],
    eqeqeq: ['error', 'always', { null: 'never' }],
    'logical-assignment-operators': 'error',
    'no-else-return': [
      'error',
      {
        allowElseIf: false,
      },
    ],
    'no-fallthrough': [
      'error',
      { commentPattern: '.*intentional fallthrough.*' },
    ],
    'no-implicit-coercion': ['error', { boolean: false }],
    'no-lonely-if': 'error',
    'no-unreachable-loop': 'error',
    'no-useless-call': 'error',
    'no-useless-computed-key': 'error',
    'no-useless-concat': 'error',
    'no-var': 'error',
    'no-void': ['error', { allowAsStatement: true }],
    'object-shorthand': 'error',
    'one-var': ['error', 'never'],
    'operator-assignment': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-const': 'error',
    'prefer-object-has-own': 'error',
    'prefer-object-spread': 'error',
    'prefer-rest-params': 'error',
    'prefer-template': 'error',
    'no-inner-declarations': 'off',
    radix: 'error',

    //
    // eslint-plugin-unicorn
    //

    'unicorn/prefer-at': 'error',
    'unicorn/no-length-as-slice-end': 'error',
    'unicorn/no-lonely-if': 'error',
    'unicorn/no-typeof-undefined': 'error',
    'unicorn/no-single-promise-in-promise-methods': 'error',
    'unicorn/no-useless-spread': 'error',
    'unicorn/prefer-array-some': 'error',
    'unicorn/prefer-export-from': 'error',
    'unicorn/prefer-node-protocol': 'off',
    'unicorn/prefer-regexp-test': 'error',
    'unicorn/prefer-string-replace-all': 'error',
    'unicorn/prefer-structured-clone': 'error',
    'unicorn/prefer-switch': 'error',
    'unicorn/no-useless-undefined': 'error',
    'unicorn/no-useless-promise-resolve-reject': 'error',
    'unicorn/no-array-for-each': 'error',

    //
    // eslint-plugin-jest
    //

    'jest/expect-expect': 'off',
    'jest/no-conditional-expect': 'off',
    'jest/consistent-test-it': 'error',
    'jest/no-confusing-set-timeout': 'error',
  },
  overrides: [
    {
      files: [
        './packages/cli-cloudflare-runtime/**',
        './playground/**',
        './ci-infra/**',
      ],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['./**/*.{js,mjs}'],
      extends: ['plugin:@typescript-eslint/disable-type-checked'],
    },
    {
      files: ['packages/arm-client/**/*.ts', 'packages/cli/**/*.ts'],
      extends: ['plugin:perfectionist/recommended-natural-legacy'],
      rules: {
        'import/order': 'off',
        'perfectionist/sort-imports': [
          'error',
          {
            sortSideEffects: true,
            newlinesBetween: 'never',
            groups: [
              'react',
              'builtin',
              ['side-effect-style', 'side-effect'],
              'type',
              'external',
              'internal-type',
              'internal',
              ['parent-type', 'sibling-type', 'index-type'],
              ['parent', 'sibling', 'index'],
              'object',
              'unknown',
            ],
            customGroups: {
              value: {
                react: ['react', 'react-*'],
              },
              type: {
                react: ['react', 'react-*'],
              },
            },
          },
        ],
        'perfectionist/sort-classes': 'off',
      },
    },
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project: [
          './tsconfig.json',
          './packages/*/tsconfig*.json',
          './apps/*/tsconfig*.json',
        ],
      },
    },
  },
};
