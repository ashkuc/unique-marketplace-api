import { Command, Positional } from 'nestjs-command';
import { Injectable } from '@nestjs/common';

import { KusamaEscrow } from './kusama';
import { UniqueEscrow } from './unique';

@Injectable()
export class EscrowCommand {
  @Command({
    command: 'start_escrow <network>',
    describe: 'Starts escrow service for selected network',
  })
  async start_escrow(@Positional({name: 'network'}) network: string) {
    const networks = {
      'unique': UniqueEscrow,
      'kusama': KusamaEscrow
    }
    if(!networks.hasOwnProperty(network)) {
      console.error(`No escrow service for ${network} network`);
      return;
    }
    const escrow = new networks[network]();
    await escrow.work()
  }
}