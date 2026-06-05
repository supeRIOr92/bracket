import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class SeasonsService {
constructor(private supabase: SupabaseService) {}

async getCurrentSeason() {
const db = this.supabase.getClient();
const today = new Date().toISOString().split('T')[0];

const { data: season, error } = await db
.from('seasons')
.select('*')
.eq('status', 'active')
.lte('start_date', today)
.gte('end_date', today)
.single();

if (error || !season) {
// Fallback: generate dari tanggal sekarang
const now = new Date();
const year = now.getFullYear();
const quarter = Math.ceil((now.getMonth() + 1) / 3);
const seasonId = `${year}-Q${quarter}`;
const startMonth = (quarter - 1) * 3;
const startDate = new Date(year, startMonth, 1).toISOString().split('T')[0];
const endDate = new Date(year, startMonth + 3, 0).toISOString().split('T')[0];

return {
id: seasonId,
start_date: startDate,
end_date: endDate,
status: 'active',
daysLeft: Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
};
}

const daysLeft = Math.ceil(
(new Date(season.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
);

return { ...season, daysLeft };
}

async getSeasonRankings(seasonId: string, limit = 20) {
const db = this.supabase.getClient();

const { data, error } = await db
.from('season_rankings')
.select('*, users(username, wallet_address)')
.eq('season', seasonId)
.order('rank', { ascending: true })
.limit(limit);

if (error) throw new Error(error.message);
return data || [];
}
}
