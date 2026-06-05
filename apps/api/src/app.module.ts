import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { MarketsModule } from './modules/markets/markets.module';
import { PredictionsModule } from './modules/predictions/predictions.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JackpotModule } from './modules/jackpot/jackpot.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { XpModule } from './modules/xp/xp.module';
import { ChatModule } from './modules/chat/chat.module';
import { SeasonsModule } from './modules/seasons/seasons.module';

@Module({
imports: [
ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
ScheduleModule.forRoot(),
AuthModule,
UsersModule,
MarketsModule,
PredictionsModule,
JackpotModule,
SettlementModule,
XpModule,
ChatModule,
SeasonsModule,
],
})
export class AppModule {}