import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { PrivyClient } from '@privy-io/server-auth';

@Injectable()
export class AuthService {
private privy: PrivyClient;

constructor(
private jwt: JwtService,
private config: ConfigService,
private supabase: SupabaseService,
) {
this.privy = new PrivyClient(
this.config.get('privy.appId')!,
this.config.get('privy.appSecret')!,
);
}

async login(privyAccessToken: string) {
const claims = await this.verifyPrivyToken(privyAccessToken);
if (!claims) throw new UnauthorizedException('Invalid Privy token');

const privyUser = await this.privy.getUser(claims.userId);

// Cek external wallet dulu, fallback ke embedded wallet di linkedAccounts
const externalWallet = privyUser.wallet?.address;
const embeddedWallet = (privyUser.linkedAccounts as any[])?.find(
  (a: any) => a.type === 'wallet' && a.walletClientType === 'privy'
)?.address;
const walletAddress = (externalWallet || embeddedWallet)?.toLowerCase();

if (!walletAddress) {
  throw new UnauthorizedException('No wallet address found. Please connect or create a wallet.');
}

const user = await this.upsertUser(walletAddress);
const payload = { sub: user.id, wallet: walletAddress };
const accessToken = this.jwt.sign(payload);

return {
accessToken,
user: { id: user.id, walletAddress: user.wallet_address, username: user.username },
};
}

private async verifyPrivyToken(token: string): Promise<any> {
try {
const claims = await this.privy.verifyAuthToken(token);
console.log('[PRIVY] Token verified, userId:', claims.userId);
return claims;
} catch (error) {
console.error('[PRIVY] Verification failed:', String(error));
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
