import { Module } from '@nestjs/common';

import { DatabaseModule} from './database/module';
import { ConfigModule} from './config/module';
import { OffersController } from './offers/offers.controller';
import { OffersService } from './offers/offers.service';
import { OnHoldController } from './on-hold/on-hold.controller';
import { OnHoldService } from './on-hold/on-hold.service';
import { TradesController } from './trades/trades.controller';
import { TradesService } from './trades/trades.service';


@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [
    OffersController,
    TradesController,
    OnHoldController
  ],
  providers: [
    OffersService,
    TradesService,
    OnHoldService
  ],
})
export class AppModule {}
