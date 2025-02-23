import {Inject, Injectable} from '@nestjs/common';
import { Connection, SelectQueryBuilder } from 'typeorm';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { NftIncomingTransaction } from '../entity';
import { nullOrWhitespace } from '../utils/string/null-or-white-space';
import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResult } from '../utils/pagination/pagination-result';
import { paginate } from '../utils/pagination/paginate';
import { OnHoldDto } from './on-hold-dto';

@Injectable()
export class OnHoldService {

  constructor(@Inject('DATABASE_CONNECTION') private connection: Connection) {
  }

  filterByCollectionIds(query: SelectQueryBuilder<NftIncomingTransaction>, collectionIds: number[] | undefined): SelectQueryBuilder<NftIncomingTransaction> {
    if(collectionIds == null || collectionIds.length <= 0) {
      return query;
    }

    return query.andWhere('income.CollectionId in (:...collectionIds)', {collectionIds});
  }

  filterByOwner(query: SelectQueryBuilder<NftIncomingTransaction>, owner: string | undefined): SelectQueryBuilder<NftIncomingTransaction> {
    if(nullOrWhitespace(owner)) {
      return query;
    }

    const key = Buffer.from(decodeAddress(owner)).toString('base64');


    return query.andWhere('income.OwnerPublicKey = :owner', {owner: key});
  }

  async get(collectionIds: number[] | undefined, owner: string | undefined, paginationRequest: PaginationRequest): Promise<PaginationResult<OnHoldDto>> {
    let incomeQuery = this.connection.manager.createQueryBuilder(NftIncomingTransaction, 'income')
      .where('income.OfferId is null');

    incomeQuery = this.filterByCollectionIds(incomeQuery, collectionIds);
    incomeQuery = this.filterByOwner(incomeQuery, owner);

    const paginationResult = await paginate(incomeQuery, paginationRequest);

    return {
      ...paginationResult,
      items: paginationResult.items.map(t => this.mapToDto(t))
    };
  }

  mapToDto(income: NftIncomingTransaction): OnHoldDto {
    return {
      owner: encodeAddress(Buffer.from(income.ownerPublicKey, 'base64')),
      collectionId: +income.collectionId,
      tokenId: +income.tokenId,
    };
  }
}
