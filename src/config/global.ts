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
  },
  blockchain: {
    adminSeed: process.env.ADMIN_SEED || '//Alice',
    testingAdminSeed: '//Alice',
    unique: {
      wsEndpoint: process.env.UNIQUE_WS_ENDPOINT || 'wss://opal.unique.network',
      testingWsEndpoint: 'ws://localhost:9944',
      startFromBlock : `${process.env.UNIQUE_START_FROM_BLOCK || 'current'}`,
      marketContractAddress : process.env.MATCHER_CONTRACT_ADDRESS || "5EuBcZYh47ruAjrDweHvH4Fm5BwYkiFHNpTGKWAHkA3WFsEG",
    },
    kusama: {
      wsEndpoint: process.env.KUSAMA_WS_ENDPOINT || 'wss://kusama-rpc.polkadot.io',
      testingWsEndpoint: 'wss://ws-relay-opal.unique.network',
      startFromBlock: `${process.env.KUSAMA_START_FROM_BLOCK || 'current'}`,
      ss58Format: parseInt(process.env.KUSAMA_SS58_FORMAT || '2'),
      marketCommission: parseInt(process.env.COMMISSION || '10')
    }
  }
}