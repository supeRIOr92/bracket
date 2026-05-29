import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../common/supabase/supabase.service';
import axios from 'axios';

@Injectable()
export class AuthService {
constructor(
private jwt: JwtService,
private config: ConfigService,
private supabase: SupabaseService,
) {}

async login(privyAccessToken: string) {
const privyUser = await this.verifyPrivyToken(privyAccessToken);
if (!privyUser) throw new UnauthorizedException('Invalid Privy token');

const walletAddress = privyUser.wallet?.address?.toLowerCase();
if (!walletAddress) {
throw new UnauthorizedException('No wallet address found in Privy user');
}

const user = await this.upsertUser(walletAddress, privyUser.email?.address);

const payload = { sub: user.id, wallet: walletAddress };
const accessToken = this.jwt.sign(payload);

return {
accessToken,
user: {
id: user.id,
walletAddress: user.wallet_address,
username: user.username,
},
};
}

private async verifyPrivyToken(token: string): Promise<any> {
try {
const appId = this.config.get('privy.appId');
const appSecret = this.config.get('privy.appSecret');

const response = await axios.get('https://auth.privy.io/api/v1/users/me', {
headers: {
Authorization: `Bearer ${token}`,
'privy-app-id': appId,
},
auth: {
username: appId,
password: appSecret,
},
});

return response.data;
} catch {
return null;
}
}

private async upsertUser(walletAddress: string, email?: string) {
const db = this.supabase.getClient();

const { data: existing } = await db
.from('users')
.select('*')
.eq('wallet_address', walletAddress)
.single();

if (existing) return existing;

const { data: newUser, error } = await db
.from('users')
.insert({ wallet_address: walletAddress, email })
.select()
.single();

if (error) throw new Error(`Failed to create user: ${error.message}`);

await db.from('user_stats').insert({ user_id: newUser.id });

return newUser;
}

async validateUser(userId: string) {
const db = this.supabase.getClient();

const { data } = await db
.from('users')
.select('*, user_stats(*)')
.eq('id', userId)
.single();

return data;
}
}
