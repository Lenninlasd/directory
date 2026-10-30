// @ts-check
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default defineConfig(
  {
    ignores: ['**/dist/**', '**/.aws-sam/**', '**/node_modules/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Express identifies error handlers by their four parameters, so unused ones are named with `_`.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['frontend/**/*.ts', 'frontend/**/*.tsx'],
    extends: [reactHooks.configs.flat.recommended],
  },
);
