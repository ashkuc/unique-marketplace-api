import { ApiPromise } from '@polkadot/api';
import { IKeyringPair } from '@polkadot/types/types';

import { signTransaction, transactionStatus } from './unique';


const vec2str = arr => {
  return arr.map(x => String.fromCharCode(parseInt(x))).join('')
}

const str2vec = string => {
  if(typeof string !== 'string') return string;
  return Array.from(string).map(x => x.charCodeAt(0));
}


class UniqueExplorer {
  api;
  admin: IKeyringPair;

  constructor(api: ApiPromise, admin: IKeyringPair) {
    this.api = api;
    this.admin = admin;
  }

  async getCollectionData (collectionId: bigint) {
    const collection = await this.api.query.common.collectionById(collectionId);
    let humanCollection = collection.toHuman(), collectionData = {id: collectionId, raw: humanCollection};
    if(humanCollection === null) return null;
    for(let key of ['name', 'description']) {
      collectionData[key] = vec2str(humanCollection[key]);
    }
    collectionData['tokensCount'] = (await this.api.rpc.unique.lastTokenId(collectionId)).toJSON();
    return collectionData;
  }

  async createCollection({name, description, tokenPrefix, modeprm}, label='new collection') {
    if(typeof modeprm === 'undefined') modeprm = {nft: null};
    let creationResult = await signTransaction(
      this.admin,
      this.api.tx.unique.createCollection(str2vec(name), str2vec(description), str2vec(tokenPrefix), modeprm),
      'api.tx.unique.createCollection'
    ) as any;
    if(creationResult.status !== transactionStatus.SUCCESS) {
      throw Error(`Unable to create collection for ${label}`);
    }

    let collectionId = null;
    creationResult.result.events.forEach(({event: {data, method, section}}) => {
      if ((section === 'common') && (method === 'CollectionCreated')) {
        collectionId = parseInt(data[0].toString(), 10);
      }
    });

    if(collectionId === null) {
      throw Error(`No CollectionCreated event for ${label}`)
    }

    return collectionId;
  }

  async createToken({collectionId, owner, constData, variableData}, label='new token') {
    let creationResult = await signTransaction(
      this.admin,
      this.api.tx.unique.createItem(collectionId, (owner.Substrate || owner.Ethereum) ? owner : { Substrate: owner }, { nft: { const_data: constData, variable_data: variableData } }),
      'api.tx.unique.createItem'
    ) as any;
    if(creationResult.status !== transactionStatus.SUCCESS) {
      throw Error(`Unable to create token for ${label}`);
    }
    let success = false, createdCollectionId = null, tokenId = null, recipient = null;
    creationResult.result.events.forEach(({event: {data, method, section}}) => {
      if (method === 'ExtrinsicSuccess') {
        success = true;
      } else if ((section === 'common') && (method === 'ItemCreated')) {
        createdCollectionId = parseInt(data[0].toString(), 10);
        tokenId = parseInt(data[1].toString(), 10);
        recipient = data[2].toJSON();
      }
    });
    return {success, tokenId, recipient, collectionId: createdCollectionId};
  }

  async burnToken({collectionId, tokenId}) {
    await signTransaction(
      this.admin,
      this.api.tx.unique.burnItem(collectionId, tokenId, 1),
      'api.tx.unique.burnItem'
    );
    return !((await this.api.rpc.unique.tokenExists(collectionId, tokenId)).toJSON())
  }
}

export {
  vec2str, str2vec, UniqueExplorer
}