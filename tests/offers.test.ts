import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { initApp, runMigrations } from './base';
import { prepareSearchData } from './prepare_data';

describe('Offers service', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await initApp();
    await runMigrations(app.get('CONFIG'));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  })

  it('/offers (GET, search by query)', async () => {
    await prepareSearchData(app.get('DATABASE_CONNECTION').createQueryBuilder());

    const doSearch = async (searchString: string) => {
      searchString = searchString.split(' ').join('%20');
      return request(app.getHttpServer()).get(`/offers?page=1&pageSize=20&collectionId=23&collectionId=25&sort=desc(creationDate)&searchLocale=en&searchText=${searchString}`);
    }

    // Only one token has that trait
    let response = await doSearch("Asian Eyes");
    await expect(response.statusCode).toBe(200);
    await expect(response.body.items.length).toBe(1);
    await expect(response.body.items[0].tokenId).toBe(42);

    // No tokens with that trait
    response = await doSearch("Not exists trait");
    await expect(response.statusCode).toBe(200);
    await expect(response.body.items.length).toBe(0);

    // All tokens has that trait
    response = await doSearch("Smile")
    await expect(response.body.items.length).toBe(3);
    await expect(response.body.items.map(x => x.tokenId)).toStrictEqual([120, 42, 12]);

    // Trait for several tokens
    response = await doSearch("Left Earring")
    await expect(response.body.items.length).toBe(2);
    await expect(response.body.items.map(x => x.tokenId)).toStrictEqual([42, 12]);

    // Search by tokenId (120 contains 12)
    response = await doSearch("12");
    await expect(response.statusCode).toBe(200);
    await expect(response.body.items.length).toBe(2);
    await expect(response.body.items.map(x => x.tokenId)).toStrictEqual([120, 12]);

    // Search by unique tokenId
    response = await doSearch("42");
    await expect(response.statusCode).toBe(200);
    await expect(response.body.items.length).toBe(1);
    await expect(response.body.items[0].tokenId).toBe(42);

    // Search by not exists tokenId
    response = await doSearch("13");
    await expect(response.statusCode).toBe(200);
    await expect(response.body.items.length).toBe(0);
  })
});