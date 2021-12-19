import { ApiPromise, WsProvider } from '@polkadot/api';
import * as defs from '@unique-nft/types/definitions'

import * as logging from '../logging';

const connectApi = async function (opalUrl, exitOnDisconnect=true) {
  const wsProvider = new WsProvider(opalUrl);

  const api = new ApiPromise({
    provider: wsProvider,
    rpc: { unique: defs.unique.rpc }
  });

  api.on('disconnected', async (value) => {
    if(!exitOnDisconnect) return;
    logging.log(`[opal] disconnected: ${value}`, logging.level.WARNING);
    process.exit(1);
  });
  api.on('error', async (value) => {
    logging.log(`[opal] error`, logging.level.ERROR);
    logging.log(value, logging.level.ERROR);
    process.exit(1);
  });

  await api.isReady;

  return api;
}

const transactionStatus = {
  NOT_READY: 'NotReady',
  FAIL: 'Fail',
  SUCCESS: 'Success'
}

const getTransactionStatus = ({events, status}) => {
  if (status.isReady) {
    return transactionStatus.NOT_READY;
  }
  if (status.isBroadcast) {
    return transactionStatus.NOT_READY;
  }
  if (status.isInBlock || status.isFinalized) {
    const errors = events.filter(e => e.event.data.method === 'ExtrinsicFailed');
    if(errors.length > 0) {
      return transactionStatus.FAIL;
    }
    if(events.filter(e => e.event.data.method === 'ExtrinsicSuccess').length > 0) {
      return transactionStatus.SUCCESS;
    }
  }

  return status.FAIL;
}

const signTransaction = (sender, transaction, label='transaction') => {
  return new Promise(async (resolve, reject) => {
    try {
      let unsub = await transaction.signAndSend(sender, result => {
        const status = getTransactionStatus(result);

        if (status === transactionStatus.SUCCESS) {
          logging.log(`${label} successful`);
          resolve({result, status});
          unsub();
        } else if (status === transactionStatus.FAIL) {
          logging.log(`Something went wrong with ${label}. Status: ${status}`);
          reject({result, status});
          unsub();
        }
      });
    } catch (e) {
      logging.log(e, logging.level.ERROR);
      reject(e);
    }
  });
}

export { transactionStatus, signTransaction, connectApi }