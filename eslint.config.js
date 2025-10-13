import js from '@eslint/js'
import react from 'eslint-plugin-react'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [
  // Base recommended rules
  js.configs.recommended,

  // TypeScript + React for TS/TSX files
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['dist/**', 'node_modules/**'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...react.configs.recommended.rules,
      'react/prop-types': 'off',
      // Avoid false positives for browser globals when using TS
      'no-undef': 'off',
    },
    settings: { react: { version: 'detect' } },
  },
]
