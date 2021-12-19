import { Module } from '@nestjs/common';
import { EscrowCommand } from './command';

@Module({
  providers: [EscrowCommand],
  exports: [EscrowCommand]
})
export class EscrowModule {}