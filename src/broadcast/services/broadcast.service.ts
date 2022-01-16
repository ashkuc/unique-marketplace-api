import { Injectable, Logger } from "@nestjs/common";

import { BroadcastWebSocketServer } from "../types";

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  public server: BroadcastWebSocketServer = null;

  init(server: BroadcastWebSocketServer): void {
    this.server = server;

    this.logger.debug(`initialised`);
  }

  sendNotification<T = any>(room: string | string[], payload: T) {
    this.logger.debug(`sendNotification to "${room}": ${JSON.stringify(payload)}`);

    this.server.to(room).emit('notification', payload)
  }
}