'use client';

import { useState, useEffect, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { supabase } from '@/lib/supabase';
import { usersApi } from '@/lib/api';
import { User, Save, Camera } from 'lucide-react';

export default function SettingsPage() {
const { authenticated } = usePrivy();
const { wallets } = useWallets();
const walletAddress = wallets[0]?.address ?? '';
const fileInputRef = useRef<HTMLInputElement>(null);

const [username, setUsername] = useState('');
const [bio, setBio] = useState('');
const [avatarUrl, setAvatarUrl] = useState('');
const [saving, setSaving] = useState(false);
const [saved, setSaved] = useState(false);
const [uploading, setUploading] = useState(false);
const [error, setError] = useState('');

useEffect(() => {
if (!walletAddress) return;
usersApi.getProfileByAddress(walletAddress).then((res) => {
setUsername(res.data?.username || '');
setBio(res.data?.bio || '');
setAvatarUrl(res.data?.avatar_url || '');
}).catch(() => {});
}, [walletAddress]);

const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
const file = e.target.files?.[0];
if (!file) return;

if (file.size > 2 * 1024 * 1024) {
setError('File terlalu besar. Maksimal 2MB.');
return;
}

setUploading(true);
setError('');

try {
const ext = file.name.split('.').pop();
const path = `${walletAddress.toLowerCase()}.${ext}`;

const { error: uploadError } = await supabase.storage
.from('avatars')
.upload(path, file, { upsert: true });

if (uploadError) throw uploadError;

const { data } = supabase.storage.from('avatars').getPublicUrl(path);
setAvatarUrl(data.publicUrl);
} catch {
setError('Upload gagal. Coba lagi.');
} finally {
setUploading(false);
}
};

const handleSave = async () => {
setSaving(true);
setError('');
setSaved(false);
try {
await usersApi.updateProfile({ username: username.trim(), bio: bio.trim(), avatarUrl });
setSaved(true);
setTimeout(() => setSaved(false), 3000);
} catch {
setError('Failed to save. Please try again.');
} finally {
setSaving(false);
}
};

if (!authenticated) return null;
return (
<div className="max-w-xl mx-auto space-y-6">
<div>
<h1 className="text-2xl font-bold text-gray-900">Settings</h1>
<p className="text-gray-500 mt-1">Manage your profile and preferences</p>
</div>

<div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
<div className="flex items-center gap-3 mb-2">
<div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
<User className="w-4 h-4 text-blue-600" />
</div>
<h2 className="font-semibold text-gray-900">Profile</h2>
</div>

{/* Avatar */}
<div className="flex items-center gap-4">
<div className="relative">
<div className="w-16 h-16 rounded-2xl bg-blue-100 overflow-hidden flex items-center justify-center">
{avatarUrl ? (
<img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
) : (
<User className="w-8 h-8 text-blue-600" />
)}
</div>
<button
onClick={() => fileInputRef.current?.click()}
disabled={uploading}
className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
>
<Camera className="w-3 h-3 text-white" />
</button>
</div>
<div>
<p className="text-sm font-medium text-gray-700">Profile Photo</p>
<p className="text-xs text-gray-400">{uploading ? 'Uploading...' : 'JPG or PNG, max 2MB'}</p>
</div>
<input
ref={fileInputRef}
type="file"
accept="image/jpeg,image/png,image/webp"
onChange={handleAvatarUpload}
className="hidden"
/>
</div>

{/* Wallet address */}
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Wallet Address</label>
<div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 font-mono break-all">
{walletAddress || '—'}
</div>
</div>

{/* Username */}
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
<input
type="text"
value={username}
onChange={(e) => setUsername(e.target.value)}
maxLength={50}
placeholder="Enter username"
className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
<p className="text-xs text-gray-400 mt-1">{username.length}/50 characters</p>
</div>

{/* Bio */}
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
<textarea
value={bio}
onChange={(e) => setBio(e.target.value)}
maxLength={200}
placeholder="Tell people about yourself"
rows={3}
className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
/>
<p className="text-xs text-gray-400 mt-1">{bio.length}/200 characters</p>
</div>

{error && <p className="text-sm text-red-500">{error}</p>}

<button
onClick={handleSave}
disabled={saving || uploading}
className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
>
<Save className="w-4 h-4" />
{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
</button>
</div>
</div>
);
}
