module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: false,
  // 忽略 node_modules 目录
  testPathIgnorePatterns: ['/node_modules/'],
  // 设置超时时间为 60 秒，因为安全检查可能需要一些时间
  testTimeout: 60000
}
