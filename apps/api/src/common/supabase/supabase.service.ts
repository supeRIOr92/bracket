import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

@Injectable()
export class SupabaseService {
private client: SupabaseClient;

constructor(private config: ConfigService) {
this.client = createClient(
this.config.get('supabase.url')!,
this.config.get('supabase.serviceRoleKey')!,
{
auth: { persistSession: false },
realtime: { transport: ws },
},
);
}

getClient(): SupabaseClient {
return this.client;
}
}
