import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettierConfig from 'eslint-config-prettier'

export default [
  { ignores: ['dist', 'node_modules', 'server'] },

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // React 17+ — pas besoin d'importer React dans chaque fichier JSX
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // Texte français avec apostrophes — trop de faux positifs
      'react/no-unescaped-entities': 'off',

      // Vite HMR
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Qualité du code
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',

      // Style léger (le reste est géré par Prettier)
      // 'smart' autorise != null / == null (check null + undefined en même temps, pattern valide JS)
      'eqeqeq': ['error', 'smart'],
      'no-duplicate-imports': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // La règle preserve-caught-error est trop stricte pour des libs existantes
      'no-useless-catch': 'warn',
    },
  },

  // Désactiver les règles de formatage ESLint en conflit avec Prettier
  prettierConfig,
]
