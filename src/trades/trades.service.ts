import { Inject, Injectable } from '@nestjs/common';
import { Connection, SelectQueryBuilder } from 'typeorm';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { Trade } from '../entity';

import { nullOrWhitespace } from '../utils/string/null-or-white-space';
import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResult } from '../utils/pagination/pagination-result';
import { equalsIgnoreCase } from '../utils/string/equals-ignore-case';
import { SortingOrder } from '../utils/sorting/sorting-order';
import { TradeSortingRequest } from '../utils/sorting/sorting-request';
import { paginate } from '../utils/pagination/paginate';
import { TradeDto } from './trade-dto';

@Injectable()
export class TradesService {

  private offerSortingColumns = ['Price', 'TokenId', 'CollectionId'];
  private sortingColumns = [...this.offerSortingColumns, 'TradeDate'];

  constructor(@Inject('DATABASE_CONNECTION') private connection: Connection) {
  }

  applySort(query: SelectQueryBuilder<Trade>, sort: TradeSortingRequest): SelectQueryBuilder<Trade> {
    let params = [];

    for(let param of (sort.sort ?? [])) {
      let column = this.sortingColumns.find(column => equalsIgnoreCase(param.column, column));
      if (column === null) continue;
      params.push({...param, column});
    }

    if(params.length <= 0) {
      return query;
    }

    let first = true;
    for(let param of params) {
      let table = this.offerSortingColumns.indexOf(param.column) > -1 ? 'offer' : 'trade';
      query = query[first ? 'orderBy': 'addOrderBy'](`${table}.${param.column}`, param.order === SortingOrder.Asc ? 'ASC' : 'DESC');
      first = false;
    }

    return query;
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

  async get(collectionIds: number[] | undefined, seller: string | undefined, paginationRequest: PaginationRequest, sort: TradeSortingRequest): Promise<PaginationResult<TradeDto>> {
    let tradesQuery = this.connection.manager.createQueryBuilder(Trade, 'trade')
      .innerJoinAndSelect('trade.offer', 'offer');

    tradesQuery = this.filterByCollectionIds(tradesQuery, collectionIds);
    tradesQuery = this.filterBySeller(tradesQuery, seller);
    tradesQuery = this.applySort(tradesQuery, sort);

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
