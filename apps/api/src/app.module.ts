import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';

// Common
import { SupabaseModule } from './common/supabase/supabase.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { MarketsModule } from './modules/markets/markets.module';
import { PredictionsModule } from './modules/predictions/predictions.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { UsersModule } from './modules/users/users.module';
import { XpModule } from './modules/xp/xp.module';
import { JackpotModule } from './modules/jackpot/jackpot.module';

@Module({
  imports: [
    // Config — load .env
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Scheduler — untuk cron jobs
    ScheduleModule.forRoot(),

    // Database
    SupabaseModule,

    // Feature modules
    AuthModule,
    MarketsModule,
    PredictionsModule,
    SettlementModule,
    UsersModule,
    XpModule,
    JackpotModule,
  ],
})
export class AppModule {}