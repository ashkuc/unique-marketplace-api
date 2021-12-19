import { Escrow } from './base'
import * as logging from '../utils/logging'
import { delay } from '../utils/delay';

export class UniqueEscrow implements Escrow {
  async work() {
    while(true) {
      logging.log('Unique escrow working');
      await delay(5 * 1000);
    }
  }
}