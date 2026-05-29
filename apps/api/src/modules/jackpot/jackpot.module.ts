import { Module } from '@nestjs/common';
import { JackpotController } from './jackpot.controller';
import { JackpotService } from './jackpot.service';

@Module({
controllers: [JackpotController],
providers: [JackpotService],
exports: [JackpotService],
})
export class JackpotModule {}
