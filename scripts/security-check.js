#!/usr/bin/env node

const { execSync } = require('child_process')

/**
 * Security check script
 * Uses npm audit to check for insecure dependencies
 * Script will fail if high or critical vulnerabilities are found
 */
try {
  console.log('Checking for security vulnerabilities in project dependencies...')

  // Run npm audit and get output
  const auditOutput = execSync('npm audit --json', { encoding: 'utf8' })
  const auditResult = JSON.parse(auditOutput)

  // Extract vulnerability information
  const { vulnerabilities } = auditResult
  const highVulnerabilities = vulnerabilities?.high || 0
  const criticalVulnerabilities = vulnerabilities?.critical || 0

  // Output check results
  console.log(`Found ${highVulnerabilities} high severity vulnerabilities`)
  console.log(`Found ${criticalVulnerabilities} critical severity vulnerabilities`)

  // Exit with failure if high or critical vulnerabilities are found
  if (highVulnerabilities > 0 || criticalVulnerabilities > 0) {
    console.error('Security check failed: High or critical vulnerabilities detected')
    console.log('Run npm audit for details, and npm audit fix to automatically fix issues where possible')
    process.exit(1)
  }

  console.log('Security check passed! No high or critical vulnerabilities found')
  process.exit(0)
} catch (error) {
  console.error('Error running security check:', error.message)
  process.exit(1)
}
