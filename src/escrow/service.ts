import { Injectable, Inject } from '@nestjs/common';
import { Connection } from 'typeorm';

import { BlockchainBlock, NFTTransfer, ContractAsk, SearchIndex } from '../entity/evm';
import { Offer, Trade, TokenTextSearch } from '../entity';
import { ASK_STATUS } from './constants';
import { v4 as uuid } from 'uuid';
import {decodeAddress} from "@polkadot/util-crypto";


const oldOfferStatus = {
  ACTIVE: 1,
  CANCELED: 2,
  TRADED: 3
}

@Injectable()
export class EscrowService {
  constructor(
    @Inject('DATABASE_CONNECTION') private db: Connection,
    @Inject('CONFIG') private config
  ) {}

  getNetwork(network?: string) {
    if(!network) return this.config.blockchain.unique.network;
    return network;
  }

  async isBlockScanned(blockNum: bigint | number, network?: string): Promise<boolean> {
    return !!((await this.db.getRepository(BlockchainBlock).findOne({block_number: `${blockNum}`, network: this.getNetwork(network)}))?.block_number);
  }

  async getLastScannedBlock(network?: string) {
    return await this.db.getRepository(BlockchainBlock).createQueryBuilder("blockchain_block").orderBy("block_number", "DESC").where("blockchain_block.network = :network", {network: this.getNetwork(network)}).limit(1).getOne();
  }

  async registerAsk(blockNum: bigint | number, data: {collectionId: number, tokenId: number, addressFrom: string, addressTo: string, price: number, currency: string}, network?: string) {
    const repository = this.db.getRepository(ContractAsk);
    await repository.insert({
      id: uuid(),
      block_number_ask: `${blockNum}`, network: this.getNetwork(network), collection_id: data.collectionId.toString(), token_id: data.tokenId.toString(),
      address_from: data.addressFrom, address_to: data.addressTo, status: ASK_STATUS.ACTIVE, price: data.price.toString(), currency: data.currency
    });
  }

  async registerTransfer(blockNum: bigint | number, data: {collectionId: number, tokenId: number, addressFrom: string, addressTo: string}, network?: string) {
    const repository = this.db.getRepository(NFTTransfer);
    await repository.insert({
      id: uuid(),
      block_number: `${blockNum}`, network: this.getNetwork(network), collection_id: data.collectionId.toString(), token_id: data.tokenId.toString(),
      address_from: data.addressFrom, address_to: data.addressTo
    });
  }

  async addBlock(blockNum: bigint | number, timestamp: number, network?: string) {
    const repository = this.db.getRepository(BlockchainBlock);
    const created_at = new Date(timestamp);
    await repository.upsert({block_number: `${blockNum}`, network: this.getNetwork(network), created_at}, ["block_number", "network"]);
  }

  async oldGetActiveOffer(collectionId: number, tokenId: number) {
    const repository = this.db.getRepository(Offer);
    return await repository.findOne({
      collectionId: collectionId.toString(), tokenId: tokenId.toString(), offerStatus: oldOfferStatus.ACTIVE
    });
  }

  async oldCancelOffers(collectionId: number, tokenId: number) {
    const repository = this.db.getRepository(Offer);
    await repository.update({collectionId: collectionId.toString(), tokenId: tokenId.toString(), offerStatus: oldOfferStatus.ACTIVE}, {offerStatus: oldOfferStatus.CANCELED});
  }

  async oldRegisterOffer(data: {collectionId: number, tokenId: number, seller: string, price: bigint}) {
    await this.oldCancelOffers(data.collectionId, data.tokenId);

    // Convert address into public key
    const publicKey = Buffer.from(decodeAddress(data.seller).toString(), 'binary').toString('base64');
    const repository = this.db.getRepository(Offer);
    await repository.insert({
      id: uuid(), creationDate: new Date(), collectionId: data.collectionId.toString(), tokenId: data.tokenId.toString(),
      price: data.price, sellerPublicKeyBytes: decodeAddress(data.seller), metadata: {}, seller: publicKey, offerStatus: oldOfferStatus.ACTIVE, quoteId: "2"
    });
  }

  async oldRegisterTrade(buyer, offer: Offer) {
    const repository = this.db.getRepository(Trade);
    // Convert address into public key
    const publicKey = Buffer.from(decodeAddress(buyer).toString(), 'binary').toString('base64');

    await repository.insert({id: uuid(), tradeDate: new Date(), buyer: publicKey, offerId: offer.id});
    await this.db.getRepository(Offer).update({id: offer.id}, {offerStatus: oldOfferStatus.TRADED});
  }

  async oldAddSearchIndexes(keywords, data: {collectionId: number, tokenId: number}) {
    const repository = this.db.getRepository(TokenTextSearch);
    const alreadyExist = await repository.count({collectionId: data.collectionId.toString(), tokenId: data.tokenId.toString()})
    if(alreadyExist > 0) return;
    await repository.insert(keywords.map(x => {
      return {id: uuid(), collectionId: data.collectionId.toString(), tokenId: data.tokenId.toString(), locale: x.locale, text: x.text}
    }));
  }
}