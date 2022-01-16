import { Server } from "socket.io";

export type ServerToClientEvents = {
  messageWithoutPayload: () => void;
  messageWithAcknowledgement: (text: string, callback: (answer: number) => void) => void;
  notification: (payload: any) => void;
}

export type ClientToServerEvents = {
  joinRoom: (roomName: string) => void;
  leaveRoom: (roomName: string) => void;
};

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
}

export type BroadcastWebSocketServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>