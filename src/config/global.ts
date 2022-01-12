export default {
  postgresUrl:
    process.env.POSTGRES_URL ||
    'postgres://marketplace:12345@marketplace-postgres:5432/marketplace_db',
  testingPostgresUrl:
    'postgres://postgresman:test12345@test-postgres:6432/postgres_db',
  listenPort: parseInt(process.env.API_PORT || '5000'),
  disableSecurity: process.env.DISABLE_SECURITY === 'true',
  dev: {
    debugMigrations: false,
  },
  swagger: {
    title: 'Marketplace api',
    version: '1.0',
    description: '',
  },
};
