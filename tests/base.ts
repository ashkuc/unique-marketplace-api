import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createConnection } from 'typeorm';

import { getConfig } from '../src/config';
import { AppModule } from '../src/app.module';
import { activeMigrations } from '../src/migrations';
import { ProjectNamingStrategy } from '../src/database/naming_strategy'
import { ignoreQueryCase, useGlobalPipes } from '../src/utils/application';

const testConfigFactory = (extra?) => () => {
  let config = getConfig();
  config.postgresUrl = config.testingPostgresUrl;
  config = {...config, ...(extra || {})}
  return config;
};


export const initApp = async (config?): Promise<INestApplication> => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule]
  }).overrideProvider('CONFIG').useFactory({factory: testConfigFactory(config)}).compile();

  const app = moduleFixture.createNestApplication();
  ignoreQueryCase(app);
  useGlobalPipes(app);
  return app;
}

export const getMigrationsConnection = async (config, logging: boolean = false) => {
  return await createConnection({
    name: 'migrations', type: 'postgres', url: config.postgresUrl, logging: logging, migrations: activeMigrations,
    namingStrategy: new ProjectNamingStrategy()
  });
}

export const runMigrations = async (config) => {
  const connection = await getMigrationsConnection(config);
  await connection.dropDatabase();
  await connection.runMigrations();
  await connection.close();
}