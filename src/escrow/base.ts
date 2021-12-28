import { EscrowService } from './service';
import * as logging from '../utils/logging';
import { delay } from '../utils/delay';


export class Escrow {
  api;
  admin;
  configObj;
  configMode;
  store;
  initialized = false;
  service: EscrowService;

  SECTION_TIMESTAMP = 'timestamp';
  static MODE_PROD = 'prod';
  static MODE_TESTING = 'testing';

  constructor(config, service: EscrowService, mode=Escrow.MODE_PROD) {
    this.configObj = config;
    this.service = service;
    this.configMode = mode;

    this.store = {
      currentBlock: 0,
      latestBlock: 0
    }
  }

  config(path, defaultVal=null) {
    if(this.configMode === Escrow.MODE_TESTING) path = `blockchain.testing.${path}`;
    else path = `blockchain.${path}`;
    let val = this.configObj;
    for(let key of path.split('.')) {
      val = val[key];
    }
    return typeof val !== 'undefined' ? val : defaultVal;
  }

  async init() {
    throw Error('NotImplemented');
  }

  async connectApi() {
    throw Error('NotImplemented');
  }

  isSuccessfulExtrinsic(eventRecords, extrinsicIndex) {
    const events = eventRecords.filter(({ phase }) =>
      phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(extrinsicIndex)
    ).map(({ event }) => `${event.section}.${event.method}`);

    return events.includes('system.ExtrinsicSuccess');
  }

  async getLatestBlockNumber() {
    return (await this.api.rpc.chain.getHeader()).number.toNumber();
  }

  async subscribe() {
    await this.api.rpc.chain.subscribeNewHeads(lastHeader => {
      this.store.latestBlock = lastHeader.number.toNumber();
      if(lastHeader.number % 100 === 0) logging.log(`New block #${lastHeader.number}`);
    });
  }

  async processBlock(blockNum, force=false) {
    throw Error('NotImplemented');
  }

  async mainLoop() {
    while(true) {
      let lastLatest = this.store.latestBlock;
      if(this.store.currentBlock % 10 === 0) logging.log(`Scanning block #${this.store.currentBlock}`);
      await this.processBlock(this.store.currentBlock);
      this.store.currentBlock += 1;
      if(this.store.currentBlock < lastLatest) continue;
      while(lastLatest === this.store.latestBlock) await delay(100);
    }
  }

  async work() {
    throw Error('NotImplemented');
  }
}
