import { IKeyringPair } from '@polkadot/types/types';

import { Escrow } from './base';
import * as logging from '../utils/logging';
import { delay } from '../utils/delay';
import { BigNumber } from '../utils/blockchain/util';
import { transactionStatus, signTransaction } from '../utils/blockchain/polka';
import { MONEY_TRANSFER_STATUS } from './constants';

const kusamaBlockMethods = {
  METHOD_TRANSFER_KEEP_ALIVE: 'transferKeepAlive',
  METHOD_TRANSFER: 'transfer',
  METHOD_TRANSFER_FROM: 'transferFrom'
}

export class KusamaEscrow extends Escrow {
  SECTION_BALANCES = 'balances'

  async getBalance(address: string) {
    return new BigNumber((await this.api.query.system.account(address)).data.free);
  }

  async transfer(sender: IKeyringPair, recipient: string, amountBN) {
    const senderBalance = await this.getBalance(sender.address);
    const recipientBalance = await this.getBalance(recipient);
    logging.log(['Transfer start from', sender.address, 'to', recipient, 'amount', amountBN.toString(), 'total sender balance', senderBalance.toString(), 'total recipient balance', recipientBalance.toString()]);

    if (senderBalance.isLessThan(amountBN)) {
      const error = `Sender balance ${senderBalance.toString()} is insufficient to send ${amountBN.toString()} to ${recipient.toString()}.`;
      logging.log(error, logging.level.ERROR);
      throw error;
    }

    let balanceTransaction = this.api.tx.balances.transfer(recipient, amountBN.toString());
    const result = await signTransaction(sender, balanceTransaction, 'api.tx.balances.transfer') as any;
    if(result.status !== transactionStatus.SUCCESS) throw Error('Transfer failed');
    logging.log(['Transfer successful. Sender balance:', (await this.getBalance(sender.address)).toString(), ' Recipient balance:', (await this.getBalance(recipient)).toString()])
  }

  async scanBlock(blockNum, force=false) {
    const network = this.config.blockchain.kusama.network;
    if(!force && (await this.service.isBlockScanned(blockNum, network))) return; // Block already scanned
    const blockHash = await this.api.rpc.chain.getBlockHash(blockNum);

    const signedBlock = await this.api.rpc.chain.getBlock(blockHash);
    const allRecords = await this.api.query.system.events.at(blockHash);

    for (let [extrinsicIndex, ex] of signedBlock.block.extrinsics.entries()) {
      if(ex.method.section === this.SECTION_TIMESTAMP && ex.method.method === 'set') {
        await this.service.addBlock(blockNum, ex.method.toJSON().args.now, network);
        continue;
      }
      if(ex.method.section !== this.SECTION_BALANCES) {
        continue;
      }
      let method = ex.method.method;
      if([kusamaBlockMethods.METHOD_TRANSFER_KEEP_ALIVE].indexOf(method) > -1) method = kusamaBlockMethods.METHOD_TRANSFER;
      if(!(method === kusamaBlockMethods.METHOD_TRANSFER && ex.method.args[0].toString() !== this.admin.address.toString())) continue;
      const amount = ex.method.args[1];
      const address = ex.signer.toString();
      let isSuccess = this.isSuccessfulExtrinsic(allRecords, extrinsicIndex);
      if (!isSuccess) {
        logging.log(`Kusama deposit (from ${address}, amount ${amount}) in block #${blockNum} failed`);
        continue;
      }
      await this.service.registerKusamaDeposit(amount, address, blockNum);
      logging.log(`Kusama deposit (from ${address}, amount ${amount}) in block #${blockNum} saved to db`);
    }
  }

  async processWithdraw() {
    while(true) {
      let withdraw = await this.service.getPendingKusamaWithdraw();
      if(!withdraw) break;
      try {
        logging.log(`Kusama withdraw for money transfer #${withdraw.id} started`);
        let amountReturned = new BigNumber(withdraw.amount);

        await this.service.updateMoneyTransferStatus(withdraw.id, MONEY_TRANSFER_STATUS.IN_PROGRESS);

        await this.transfer(this.admin, withdraw.extra.address, amountReturned.toString());
        await this.service.updateMoneyTransferStatus(withdraw.id, MONEY_TRANSFER_STATUS.COMPLETED);
        logging.log(`Kusama withdraw for money transfer #${withdraw.id} successful`)
      } catch (e) {
        await this.service.updateMoneyTransferStatus(withdraw.id, MONEY_TRANSFER_STATUS.FAILED);
        logging.log(`Kusama withdraw for money transfer #${withdraw.id} failed`, logging.level.ERROR);
        logging.log(e, logging.level.ERROR);
      }
    }
  }

  async work() {
    while(true) {
      logging.log('Kusama escrow working');
      await delay(5 * 1000);
    }
  }
}