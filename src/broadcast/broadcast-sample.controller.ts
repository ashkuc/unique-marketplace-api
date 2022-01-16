import { Body, Controller, Post } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { BroadcastService } from "./services/broadcast.service";

class BroadcastEvent {
  @ApiProperty({ required: true, type: String })
  room: string;

  @ApiProperty({ required: true, type: String })
  text: string;
}

@Controller('BroadcastSample')
export class BroadcastSampleController {
  constructor(private webSocketService: BroadcastService) {}

  @Post('sendToAll')
  sendToAll(@Body() { room, text }: BroadcastEvent): void {
    this.webSocketService.sendNotification(room, text);
  }
}
