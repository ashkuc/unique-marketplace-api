import { Global, Module } from "@nestjs/common";

import { BroadcastSampleController } from "./broadcast-sample.controller";
import { BroadcastWebSocketGateway } from "./services/broadcast-websocket.gateway";
import { BroadcastService } from "./services/broadcast.service";

@Global()
@Module({
  controllers: [BroadcastSampleController],
  providers: [BroadcastWebSocketGateway, BroadcastService],
  exports: [BroadcastService],
})
export class BroadcastModule {}