import * as path from 'path';
export default {
  postgresUrl: process.env.POSTGRES_URL || 'postgres://marketplace:12345@marketplace-postgres:5432/marketplace_db',
  testingPostgresUrl: 'postgres://test:test@test-postgres:5432/test',
  listenPort : parseInt(process.env.API_PORT || '5000'),
  disableSecurity: process.env.DISABLE_SECURITY === 'true',
  rootDir: path.normalize(path.join(__dirname, '..')),
  dev: {
    debugMigrations: false,
    debugScanBlock: false
  },
  swagger: {
    title: 'Marketplace api',
    version: '1.0',
    description: ''
  },
  blockchain: {
    escrowSeed: process.env.ESCROW_SEED || '//Alice',
    ownerSeed: process.env.MATCHER_OWNER_SEED || '//Alice',
    testingAdminSeed: '//Alice',
    unique: {
      wsEndpoint: process.env.UNIQUE_WS_ENDPOINT || 'wss://opal.unique.network',
      network: process.env.UNIQUE_NETWORK || 'quartz',
      testingWsEndpoint: 'ws://localhost:9944',
      startFromBlock : `${process.env.UNIQUE_START_FROM_BLOCK || 'current'}`,
      marketContractAddress : process.env.MATCHER_CONTRACT_ADDRESS || "5EuBcZYh47ruAjrDweHvH4Fm5BwYkiFHNpTGKWAHkA3WFsEG",
      collectionIds: (process.env.UNIQUE_COLLECTION_IDS || '').split(',').map(x => Number(x.trim())).filter(x => (!isNaN(x) && x > 1 && x !== Infinity))
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