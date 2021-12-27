import { EscrowService } from './service';

export class Escrow {
  api;
  admin;
  config;
  service: EscrowService;

  SECTION_TIMESTAMP = 'timestamp';

  constructor(api, admin, config, service: EscrowService) {
    this.api = api;
    this.admin = admin;
    this.config = config;
    this.service = service;
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

  async work() {

  }
}
