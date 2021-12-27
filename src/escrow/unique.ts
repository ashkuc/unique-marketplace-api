import * as fs from 'fs';
import * as path from 'path';

import { Escrow } from './base'
import * as logging from '../utils/logging'
import { delay } from '../utils/delay';
import { normalizeAccountId, extractCollectionIdFromAddress, UniqueExplorer } from '../utils/blockchain/util';
import { EscrowService } from './service';


export class UniqueEscrow extends Escrow {
  inputDecoder;
  explorer;
  SECTION_UNIQUE = 'unique';
  SECTION_CONTRACT = 'evm';

  BLOCKED_SCHEMA_KEYS = ['ipfsJson'];

  address2string(address): string {
    if(typeof address === 'string') return address;
    if(address.Ethereum) return address.Ethereum;
    if(address.ethereum) return address.ethereum;
    if(address.Substrate) return address.Substrate;
    if(address.substrate) return address.substrate;
    throw Error('Invalid address');
  }

  constructor(api, admin, config, service: EscrowService) {
    super(api, admin, config, service);
    const InputDataDecoder = require('ethereum-input-data-decoder');
    const abi = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'blockchain', 'MarketPlace.abi')).toString());
    this.inputDecoder = new InputDataDecoder(abi);
    this.explorer = new UniqueExplorer(api, admin);
  }

  *convertEnumToString(value, key, protoSchema) {
    try {
      let valueJsonComment = protoSchema.fields[key].resolvedType.options[value];
      let translationObject = JSON.parse(valueJsonComment);
      if (translationObject) {
        yield* Object.keys(translationObject).map(k => ({ locale: k, text: translationObject[k] }));
      }
    } catch (e) {
      logging.log('Error parsing schema when trying to convert enum to string', logging.level.ERROR);
      logging.log(e, logging.level.ERROR);
    }
  }

  *getKeywords(protoSchema, dataObj) {
    for(let key of Object.keys(dataObj)) {
      if(this.BLOCKED_SCHEMA_KEYS.indexOf(key) > -1) continue;
      yield {locale: null, text: key};
      if (protoSchema.fields[key].resolvedType && protoSchema.fields[key].resolvedType.constructor.name.toString() === "Enum") {
        if (Array.isArray(dataObj[key])) {
          for (let i = 0; i < dataObj[key].length; i++) {
            yield* this.convertEnumToString(dataObj[key][i], key, protoSchema);
          }
        } else {
          yield* this.convertEnumToString(dataObj[key], key, protoSchema);
        }
      } else {
        yield {locale: null, text: dataObj[key]};
      }
    }
  }

  async getSearchIndexes(collectionId, tokenId) {
    let keywords = [];
    try {
      let data = await this.explorer.getTokenData(tokenId, collectionId);
      keywords.push({locale: null, text: data.collection.toHuman().tokenPrefix});
      for (let k of this.getKeywords(data.schema.NFTMeta, data.data.human)) {
        keywords.push(k);
      }
    }
    catch (e) {
      logging.log(`Unable to get search indexes for token #${tokenId} from collection #${collectionId}`, logging.level.ERROR);
      logging.log(e, logging.level.ERROR);
    }
    keywords.push({locale: null, text: tokenId.toString()});

    return keywords.filter(x => typeof x.text === 'string' && x.text.trim() !== '');
  }

  async processTransfer(blockNum, rawExtrinsic) {
    const extrinsic = rawExtrinsic.toHuman().method;
    const addressFrom = normalizeAccountId(rawExtrinsic.signer.toString());
    const addressTo = normalizeAccountId(extrinsic.args.recipient);
    const collectionId = parseInt(extrinsic.args.collection_id);
    const tokenId = parseInt(extrinsic.args.item_id);
    if(this.config.blockchain.unique.collectionIds.indexOf(collectionId) === -1) return; // Collection not managed by market
    await this.service.registerTransfer(blockNum, {
      collectionId, tokenId, addressTo: this.address2string(addressTo), addressFrom: this.address2string(addressFrom)
    });
    logging.log(`Got nft transfer (collectionId: ${collectionId}, tokenId: ${tokenId}) in block #${blockNum}`);
  }

  async processAddAsk(blockNum, extrinsic, inputData) {
    const addressTo = normalizeAccountId(extrinsic.args.target);
    const addressFrom = normalizeAccountId(extrinsic.args.source);
    const price = inputData.inputs[0].toString()
    const currency = inputData.inputs[1];
    const collectionEVMAddress = inputData.inputs[2];
    const collectionId = extractCollectionIdFromAddress(collectionEVMAddress);
    const tokenId = inputData.inputs[3].toNumber();
    if(this.config.blockchain.unique.collectionIds.indexOf(collectionId) === -1) return; // Collection not managed by market
    await this.service.registerAsk(blockNum, {
      collectionId, tokenId, addressTo: this.address2string(addressTo), addressFrom: this.address2string(addressFrom), price, currency
    });
    logging.log(`Got ask (collectionId: ${collectionId}, tokenId: ${tokenId}, price: ${price}) in block #${blockNum}`);
    // TODO: use correct address (Or maybe we don't need this at all)
    if(this.address2string(addressTo) === this.config.blockchain.unique.marketContractAddress || true) {
      await this.service.oldRegisterOffer({collectionId, tokenId, price: inputData.inputs[0], seller: this.address2string(addressFrom)});
      await this.service.oldAddSearchIndexes(await this.getSearchIndexes(collectionId, tokenId), {collectionId, tokenId});
    }
  }

  async processBuyKSM(blockNum, extrinsic, inputData) {
    const addressTo = normalizeAccountId(extrinsic.args.target);
    const addressFrom = normalizeAccountId(extrinsic.args.source);
    const collectionEVMAddress = inputData.inputs[0];
    const collectionId = extractCollectionIdFromAddress(collectionEVMAddress);
    const tokenId = inputData.inputs[1].toNumber();
    const buyer = normalizeAccountId(inputData.inputs[2]);
    const receiver = normalizeAccountId(inputData.inputs[3]);
    const existedOffer = await this.service.oldGetActiveOffer(collectionId, tokenId);
    if(!existedOffer) return;
    await this.service.oldRegisterTrade(this.address2string(buyer), existedOffer);
    logging.log(`Got buyKSM (collectionId: ${collectionId}, tokenId: ${tokenId}, buyer: ${this.address2string(buyer)}) in block #${blockNum}`);
  }

  async processCancelAsk(blockNum, extrinsic, inputData) {
    const collectionEVMAddress = inputData.inputs[0];
    const collectionId = extractCollectionIdFromAddress(collectionEVMAddress);
    const tokenId = inputData.inputs[1].toNumber();
    await this.service.oldCancelOffers(collectionId, tokenId);
    logging.log(`Got cancelAsk (collectionId: ${collectionId}, tokenId: ${tokenId}) in block #${blockNum}`);
  }

  async processCall(blockNum, rawExtrinsic) {
    const extrinsic = rawExtrinsic.toHuman().method;
    const inputData = this.inputDecoder.decodeData(extrinsic.args.input);
    if(inputData.method === 'addAsk') {
      return await this.processAddAsk(blockNum, extrinsic, inputData);
    }
    if(inputData.method === 'buyKSM') {
      return await this.processBuyKSM(blockNum, extrinsic, inputData);
    }
    if(inputData.method === 'cancelAsk') {
      return await this.processCancelAsk(blockNum, extrinsic, inputData);
    }
  }

  async scanBlock(blockNum: bigint | number, force: boolean = false) {
    if(!force && (await this.service.isBlockScanned(blockNum))) return; // Block already scanned

    const blockHash = await this.api.rpc.chain.getBlockHash(blockNum);

    const signedBlock = await this.api.rpc.chain.getBlock(blockHash);
    const allRecords = await this.api.query.system.events.at(blockHash);


    for (let [extrinsicIndex, ex] of signedBlock.block.extrinsics.entries()) {
      let isSuccess = this.isSuccessfulExtrinsic(allRecords, extrinsicIndex);
      if(!isSuccess) continue;
      if(['parachainSystem'].indexOf(ex.method.section) > -1) continue;
      if(this.config.dev.debugScanBlock && ex.method.section != 'timestamp') logging.log([blockNum, ex.method.section, ex.method.method]);
      if(ex.method.section === this.SECTION_UNIQUE && ex.method.method === 'transfer') {
        await this.processTransfer(blockNum, ex);
        continue;
      }
      if(ex.method.section === this.SECTION_CONTRACT && ex.method.method === 'call') {
        await this.processCall(blockNum, ex);
        continue;
      }
      if(ex.method.section === this.SECTION_TIMESTAMP && ex.method.method === 'set') {
        await this.service.addBlock(blockNum, ex.method.toJSON().args.now);
      }
    }
  }

  async processDeposits() {
    while(true) {
      let deposit = await this.service.getPendingKusamaDeposit();
      if(!deposit) break;
      // await matcher.methods.depositKSM(PRICE, lib.subToEth(alice.address)).send({from: escrow});
    }
  }

  async work() {
    while(true) {
      logging.log('Unique escrow working');
      await delay(5 * 1000);
    }
  }
}