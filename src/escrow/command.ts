import { Command, Positional } from 'nestjs-command';
import { ModuleRef } from '@nestjs/core';
import { Injectable } from '@nestjs/common';

import { KusamaEscrow } from './kusama';
import { UniqueEscrow } from './unique';
import { EscrowService } from './service';

@Injectable()
export class EscrowCommand {
  constructor(private moduleRef: ModuleRef) {}

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
    const escrow = new networks[network](this.moduleRef.get('CONFIG', {strict: false}), this.moduleRef.get(EscrowService, {strict: false}));

    await escrow.init();

    await escrow.work()
  }
}