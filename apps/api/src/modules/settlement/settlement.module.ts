import { Module } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { XpModule } from '../xp/xp.module';
import { SupabaseModule } from '../../common/supabase/supabase.module';

@Module({
imports: [XpModule, SupabaseModule],
providers: [SettlementService],
exports: [SettlementService],
})
export class SettlementModule {}