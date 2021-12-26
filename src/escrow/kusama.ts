import { Escrow } from './base'
import * as logging from '../utils/logging'
import { delay } from '../utils/delay';

export class KusamaEscrow extends Escrow {
  async work() {
    while(true) {
      logging.log('Kusama escrow working');
      await delay(5 * 1000);
    }
  }
}