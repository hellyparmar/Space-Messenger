import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      react: {
        rules: {
          'forbid-dom-props': { create() { return {}; } },
          'forbid-component-props': { create() { return {}; } },
        }
      }
    },
    rules: {
      // Suppress IDE-injected react/* rules that require eslint-plugin-react
      // which is not installed in this project
      'react/forbid-dom-props': 'off',
      'react/forbid-component-props': 'off',
      // Allow empty catch blocks (used intentionally for silent error suppression)
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Allow `any` in places where the API shape is genuinely unknown
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
])

