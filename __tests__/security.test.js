const { execSync } = require('child_process')
const path = require('path')

describe('Security Check Tests', () => {
  test('Check for vulnerable dependencies', () => {
    // This test runs our security check script
    const scriptPath = path.resolve(__dirname, '../scripts/security-check.js')

    let exitCode = 0
    let output = ''

    try {
      // Run the script with node and capture the output
      output = execSync(`node ${scriptPath}`, { encoding: 'utf8' })
    } catch (error) {
      // If the script exits with a non-zero code, catch the error
      output = error.stdout
      exitCode = error.status
    }

    // Log the script output for debugging
    console.log('[test] Security check output:', output)

    // Check if there are high or critical vulnerabilities
    // If vulnerabilities are found, the script will exit with a non-zero code
    if (exitCode !== 0) {
      console.warn('[test] Warning: Potential security issues found')
    }

    // Make the test fail if security issues are found
    expect(exitCode).toBe(0)
  })
})
