// Enhanced ESLint configuration with security and accessibility rules
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'jsx-a11y', 'import', 'security', 'sonarjs'],
  extends: [
    'next/core-web-vitals',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:security/recommended',
    'plugin:sonarjs/recommended',
    'prettier',
  ],
  rules: {
    // Keep noise low but useful
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
    'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
    'react/no-unknown-property': ['error', { ignore: ['css'] }], // if using vanilla-extract/etc.
    'sonarjs/no-duplicate-string': 'off', // tune as needed

    // Production safety
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'security/detect-object-injection': 'off', // too noisy for typical React patterns
    'jsx-a11y/alt-text': 'warn', // Accessibility
    'jsx-a11y/aria-props': 'warn',

    // Allow inline styles (common in React, especially for dynamic styles)
    'react/forbid-dom-props': 'off',
    'react/no-unknown-property': ['error', { ignore: ['css', 'style'] }],
    '@next/next/no-css-tags': 'off', // Allow CSS imports
    'sonarjs/no-inline-styles': 'off', // Allow inline styles in React
    // Disable style-related warnings from various plugins
    'react-native/no-inline-styles': 'off',
    'react/jsx-no-duplicate-props': 'error',
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
};
