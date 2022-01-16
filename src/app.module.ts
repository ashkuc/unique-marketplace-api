import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';

import { DatabaseModule} from './database/module';
import { ConfigModule} from './config/module';
import { OffersController } from './offers/offers.controller';
import { OffersService } from './offers/offers.service';
import { OnHoldController } from './on-hold/on-hold.controller';
import { OnHoldService } from './on-hold/on-hold.service';
import { TradesController } from './trades/trades.controller';
import { TradesService } from './trades/trades.service';
import { EscrowModule } from './escrow/module';
import { PlaygroundCommand } from './utils/playground';
import { BroadcastModule } from "./broadcast/broadcast.module";


@Module({
  imports: [DatabaseModule, ConfigModule, CommandModule, EscrowModule, BroadcastModule],
  controllers: [OffersController, TradesController, OnHoldController],
  providers: [OffersService, TradesService, OnHoldService, PlaygroundCommand]
})
export class AppModule {}
