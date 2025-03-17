#!/usr/bin/env node

/**
 * Development tools installation script
 * Used to resolve dependency conflicts
 */

const { execSync } = require('child_process')

// Development dependencies to install
const devDependencies = [
  'jest',
  '@testing-library/react',
  '@testing-library/jest-dom',
  'eslint-plugin-prettier',
  'eslint-config-prettier',
  'prettier',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser'
]

console.log('Installing development tools...')

try {
  // Install dev dependencies, ignoring peer dependency errors
  execSync(`npm install --save-dev ${devDependencies.join(' ')} --legacy-peer-deps`, {
    stdio: 'inherit',
    encoding: 'utf8'
  })

  console.log('Development tools installed successfully!')
  console.log('Use the following commands:')
  console.log('- npm run lint: Run ESLint code check')
  console.log('- npm run format: Format code with Prettier')
  console.log('- npm run security-check: Check for security vulnerabilities')
  console.log('- npm test: Run tests')
} catch (error) {
  console.error('Error installing development tools:', error.message)
  process.exit(1)
}
