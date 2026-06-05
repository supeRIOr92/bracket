import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class NotificationsService {
constructor(private supabase: SupabaseService) {}

async getNotifications(userId: string, limit = 20) {
const db = this.supabase.getClient();

const { data, error } = await db
.from('notifications')
.select('*')
.eq('user_id', userId)
.order('created_at', { ascending: false })
.limit(limit);

if (error) throw new Error(error.message);
return data || [];
}

async markAllRead(userId: string) {
const db = this.supabase.getClient();

const { error } = await db
.from('notifications')
.update({ read: true })
.eq('user_id', userId)
.eq('read', false);

if (error) throw new Error(error.message);
return { success: true };
}

async markOneRead(userId: string, notificationId: string) {
const db = this.supabase.getClient();

const { error } = await db
.from('notifications')
.update({ read: true })
.eq('id', notificationId)
.eq('user_id', userId);

if (error) throw new Error(error.message);
return { success: true };
}

async createNotification(userId: string, type: string, message: string) {
const db = this.supabase.getClient();

const { data, error } = await db
.from('notifications')
.insert({ user_id: userId, type, message })
.select()
.single();

if (error) throw new Error(error.message);
return data;
}
}
