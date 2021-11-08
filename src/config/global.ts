export default {
  postgresUrl: process.env.POSTGRES_URL || 'postgres://marketplace:12345@marketplace-postgres:5432/marketplace_db',
  testingPostgresUrl: 'postgres://test:test@test-postgres:5432/test',
  listenPort : parseInt(process.env.API_PORT || '5000'),
  disableSecurity: process.env.DISABLE_SECURITY === 'true',
  dev: {
    debugMigrations: false
  },
  swagger: {
    title: 'Marketplace api',
    version: '1.0',
    description: ''
  }
}