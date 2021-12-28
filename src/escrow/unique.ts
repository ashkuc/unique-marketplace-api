import * as fs from 'fs';
import * as path from 'path';

import { Escrow } from './base';
import * as logging from '../utils/logging';
import { normalizeAccountId, extractCollectionIdFromAddress, UniqueExplorer } from '../utils/blockchain/util';
import * as lib from '../utils/blockchain/web3';
import * as unique from '../utils/blockchain/unique';
import * as util from '../utils/blockchain/util';
import { MONEY_TRANSFER_STATUS } from './constants';


export class UniqueEscrow extends Escrow {
  inputDecoder;
  explorer;
  web3;
  matcherOwner;
  matcher;
  SECTION_UNIQUE = 'unique';
  SECTION_CONTRACT = 'evm';
  SECTION_ETHEREUM = 'ethereum';

  BLOCKED_SCHEMA_KEYS = ['ipfsJson'];

  address2string(address): string {
    if(typeof address === 'string') return address;
    if(address.Ethereum) return address.Ethereum;
    if(address.ethereum) return address.ethereum;
    if(address.Substrate) return address.Substrate;
    if(address.substrate) return address.substrate;
    throw Error('Invalid address');
  }

  async init() {
    this.initialized = true;
    await this.connectApi();
    const InputDataDecoder = require('ethereum-input-data-decoder');
    const abi = JSON.parse(fs.readFileSync(path.join(this.configObj.rootDir, 'blockchain', 'MarketPlace.abi')).toString());
    this.inputDecoder = new InputDataDecoder(abi);
    this.explorer = new UniqueExplorer(this.api, this.admin);
    this.web3 = lib.connectWeb3(this.config('unique.wsEndpoint')).web3;
    this.matcherOwner = this.web3.eth.accounts.privateKeyToAccount(this.config('unique.matcherOwnerSeed'));
    this.web3.eth.accounts.wallet.add(this.matcherOwner.privateKey);

    this.matcher = new this.web3.eth.Contract(abi, this.config('unique.matcherContractAddress'));
  }

  async connectApi() {
    this.api = await unique.connectApi(this.config('unique.wsEndpoint'), true);
    this.admin = util.privateKey(this.config('escrowSeed'));
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
    if(this.config('unique.collectionIds').indexOf(collectionId) === -1) return; // Collection not managed by market
    await this.service.registerTransfer(blockNum, {
      collectionId, tokenId, addressTo: this.address2string(addressTo), addressFrom: this.address2string(addressFrom)
    }, this.config('unique.network'));
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
    if(this.config('unique.collectionIds').indexOf(collectionId) === -1) return; // Collection not managed by market
    await this.service.registerAsk(blockNum, {
      collectionId, tokenId, addressTo: this.address2string(addressTo), addressFrom: this.address2string(addressFrom), price, currency
    }, this.config('unique.network'));
    logging.log(`Got ask (collectionId: ${collectionId}, tokenId: ${tokenId}, price: ${price}) in block #${blockNum}`);
    // TODO: use correct address (Or maybe we don't need this at all)
    if(this.address2string(addressTo) === this.config('unique.matcherContractAddress') || true) {
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

  async processEthereum(blockNum, rawExtrinsic) {
    const extrinsic = rawExtrinsic.toHuman().method;
    if(!('transaction' in extrinsic.args)) return;
    const inputData = this.inputDecoder.decodeData(extrinsic.args.transaction.input);
    if(inputData.method === 'depositKSM') {
      const amount = inputData.inputs[0].toString();
      const sender = normalizeAccountId(inputData.inputs[1]);
      logging.log(`Got depositKSM (Sender: ${this.address2string(sender)}, amount: ${amount}) in block #${blockNum}`);
    }
  }

  async scanBlock(blockNum: bigint | number, force: boolean = false) {
    const network = this.config('unique.network');
    if(!force && (await this.service.isBlockScanned(blockNum, network))) return; // Block already scanned

    const blockHash = await this.api.rpc.chain.getBlockHash(blockNum);

    const signedBlock = await this.api.rpc.chain.getBlock(blockHash);
    const allRecords = await this.api.query.system.events.at(blockHash);

    let timestamp = null;

    for (let [extrinsicIndex, ex] of signedBlock.block.extrinsics.entries()) {
      let isSuccess = this.isSuccessfulExtrinsic(allRecords, extrinsicIndex);
      if(!isSuccess) continue;
      if(['parachainSystem'].indexOf(ex.method.section) > -1) continue;
      if(this.configObj.dev.debugScanBlock && ex.method.section != 'timestamp') logging.log([blockNum, ex.method.section, ex.method.method]);
      if(ex.method.section === this.SECTION_UNIQUE && ex.method.method === 'transfer') {
        await this.processTransfer(blockNum, ex);
        continue;
      }
      if(ex.method.section === this.SECTION_CONTRACT && ex.method.method === 'call') {
        await this.processCall(blockNum, ex);
        continue;
      }
      if(ex.method.section === this.SECTION_ETHEREUM && ex.method.method === 'transact') {
        await this.processEthereum(blockNum, ex);
        continue;
      }
      if(ex.method.section === this.SECTION_TIMESTAMP && ex.method.method === 'set') {
        timestamp = ex.method.toJSON().args.now;
      }
    }
    if(timestamp !== null) await this.service.addBlock(blockNum, timestamp, network);
  }

  async processDeposits() {
    while(true) {
      let deposit = await this.service.getPendingKusamaDeposit();
      if(!deposit) break;
      await this.service.updateMoneyTransferStatus(deposit.id, MONEY_TRANSFER_STATUS.IN_PROGRESS);
      try {
        logging.log(`Unique depositKSM for money transfer #${deposit.id} started`);
        await this.matcher.methods.depositKSM(deposit.amount, lib.subToEth(deposit.extra.address)).send({from: this.matcherOwner.address, ...lib.GAS_ARGS});
        await this.service.updateMoneyTransferStatus(deposit.id, MONEY_TRANSFER_STATUS.COMPLETED);
        logging.log(`Unique depositKSM for money transfer #${deposit.id} successful`);
      }
      catch(e) {
        await this.service.updateMoneyTransferStatus(deposit.id, MONEY_TRANSFER_STATUS.FAILED);
        logging.log(`Unique depositKSM for money transfer #${deposit.id} failed`, logging.level.ERROR);
        logging.log(e, logging.level.ERROR);
      }
    }
  }

  async processBlock(blockNum, force=false) {
    try {
      await this.scanBlock(blockNum, force);
    } catch(e) {
      logging.log(`Unable to scan block #${blockNum} (WTF?)`, logging.level.ERROR);
      logging.log(e, logging.level.ERROR);
    }
    await this.processDeposits();
  }

  async getStartBlock() {
    let startFromBlock = this.config('unique.startFromBlock');
    if(startFromBlock === 'latest') return await this.getLatestBlockNumber() - 10;
    let latestBlock = await this.service.getLastScannedBlock(this.config('unique.network'));
    if(latestBlock?.block_number) return parseInt(latestBlock.block_number);
    if(startFromBlock === 'current') return await this.getLatestBlockNumber() - 10;
    return parseInt(startFromBlock);
  }

  async work() {
    if(!this.initialized) throw Error('Unable to start uninitialized escrow. Call "await escrow.init()" before work');
    this.store.currentBlock = await this.getStartBlock();
    this.store.latestBlock = await this.getLatestBlockNumber();
    logging.log(`Unique escrow starting from block #${this.store.currentBlock} (mode: ${this.config('unique.startFromBlock')}, maxBlock: ${this.store.latestBlock})`)
    await this.subscribe();
    await this.mainLoop();
  }
}