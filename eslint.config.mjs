// @ts-check
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['**/dist/**', '**/.aws-sam/**', '**/node_modules/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
