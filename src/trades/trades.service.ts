import { Inject, Injectable } from '@nestjs/common';
import { Connection, SelectQueryBuilder } from 'typeorm';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { Trade } from '../entity';

import { nullOrWhitespace } from '../utils/string/null-or-white-space';
import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResult } from '../utils/pagination/pagination-result';
import { paginate } from '../utils/pagination/paginate';
import { TradeDto } from './trade-dto';

@Injectable()
export class TradesService {

  constructor(@Inject('DATABASE_CONNECTION') private connection: Connection) {
  }

  filterByCollectionIds(query: SelectQueryBuilder<Trade>, collectionIds: number[] | undefined) {
    if(collectionIds == null || collectionIds.length <= 0) {
      return query;
    }

    return query.andWhere('offer.CollectionId in (:...collectionIds)', {collectionIds});
  }

  filterBySeller(query: SelectQueryBuilder<Trade>, seller: string | undefined): SelectQueryBuilder<Trade> {
    if(nullOrWhitespace(seller)) {
      return query;
    }

    const key = Buffer.from(decodeAddress(seller)).toString('base64');


    return query.andWhere('offer.Seller = :seller', {seller: key});
  }

  async get(collectionIds: number[] | undefined, seller: string | undefined, paginationRequest: PaginationRequest): Promise<PaginationResult<TradeDto>> {
    let tradesQuery = this.connection.manager.createQueryBuilder(Trade, 'trade')
      .innerJoinAndSelect('trade.offer', 'offer');

    tradesQuery = this.filterByCollectionIds(tradesQuery, collectionIds);
    tradesQuery = this.filterBySeller(tradesQuery, seller);
    tradesQuery = tradesQuery.orderBy('trade.TradeDate', 'DESC');

    const paginationResult = await paginate(tradesQuery, paginationRequest);

    return {
      ...paginationResult,
      items: paginationResult.items.map(t => this.mapToDto(t))
    }
  }

  mapToDto(trade: Trade): TradeDto {
    return {
      buyer: trade.buyer && encodeAddress(Buffer.from(trade.buyer, 'base64')),
      seller: trade.offer.seller && encodeAddress(Buffer.from(trade.offer.seller, 'base64')),
      collectionId: +trade.offer.collectionId,
      creationDate: trade.offer.creationDate,
      metadata: trade.offer.metadata,
      price: trade.offer.price?.toString(),
      quoteId: +trade.offer.quoteId,
      tokenId: +trade.offer.tokenId,
      tradeDate: trade.tradeDate
    }
  }
}
