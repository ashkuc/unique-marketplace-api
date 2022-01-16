import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from "@nestjs/common";
import { GatewayMetadata } from "@nestjs/websockets/interfaces/gateway-metadata.interface";

import { BroadcastService } from "./broadcast.service";
import { BroadcastWebSocketServer } from "../types";

const allowAllOrigin = (requestOrigin: string, callback: (err: Error | null, origin: string) => void) => {
  callback(null, requestOrigin);
}

@WebSocketGateway({
  cors: {
    origin: allowAllOrigin,
    credentials: true,
  },
} as GatewayMetadata)
export class BroadcastWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  private readonly logger = new Logger(BroadcastWebSocketGateway.name);
  private readonly serverId = Math.floor(Math.random() * 100 );

  @WebSocketServer()
  server: Server;

  constructor(private readonly webSocketService: BroadcastService) {}

  handleConnection(socket: Socket): void {
      this.logger.debug(`Socket connected ${socket.id}`);
      socket.emit('serverId', this.serverId);
  }

  handleDisconnect(socket: Socket): void {
    this.logger.debug(`Socket disconnected ${socket.id}`);
  }

  afterInit(server: BroadcastWebSocketServer): void {
    this.webSocketService.init(server);
  }

  @SubscribeMessage('joinRoom')
  subscribeToToken(@ConnectedSocket() socket: Socket, @MessageBody() room: string): void {
    this.logger.debug(`joinRoom ${socket.id} - ${room}`);

    // todo - no validation - easy DoS?
    socket.join(room);
  }

  @SubscribeMessage('leaveRoom')
  unsubscribeFromToken(@ConnectedSocket() socket: Socket, @MessageBody() room: string): void {
    this.logger.debug(`leaveRoom ${socket.id} - ${room}`);

    socket.leave(room);
  }
}
