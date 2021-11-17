import { Module } from '@nestjs/common';
import { databaseProviders } from './providers';
import { ConfigModule } from '../config/module';

@Module({
  imports: [ConfigModule],
  providers: [...databaseProviders],
  exports: [...databaseProviders]
})
export class DatabaseModule {}