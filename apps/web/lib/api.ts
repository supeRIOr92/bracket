import axios from 'axios';
import { API_URL } from './constants';

const api = axios.create({
baseURL: API_URL,
headers: { 'Content-Type': 'application/json' },
});

// Inject JWT token kalau ada
api.interceptors.request.use((config) => {
const token = localStorage.getItem('bracket_token');
if (token) {
config.headers.Authorization = `Bearer ${token}`;
}
return config;
});

// Markets
export const marketsApi = {
getActive: () => api.get('/api/markets'),
getById: (id: string) => api.get(`/api/markets/${id}`),
getToday: () => api.get('/api/markets/today'),
getPools: (id: string) => api.get(`/api/markets/${id}/pools`),
getYesterdayWinners: () => api.get('/api/markets/yesterday/winners'),
};

// Predictions
export const predictionsApi = {
record: (data: {
marketId: string;
poolId: number;
stakeAmount: number;
txHash: string;
}) => api.post('/api/predictions', data),
getHistory: () => api.get('/api/predictions/me'),
getClaimStatus: (marketId: string) =>
api.get(`/api/predictions/claim-status/${marketId}`),
recordClaim: (marketId: string, txHash: string) =>
api.post('/api/predictions/claim', { marketId, txHash }),
};

// Users
export const usersApi = {
getProfile: (id: string) => api.get(`/api/users/${id}`),
getProfileByAddress: (address: string) => api.get(`/api/users/address/${address}`),
updateProfile: (data: { username?: string; bio?: string; avatarUrl?: string }) =>
api.put('/api/users/me', data),
follow: (id: string) => api.post(`/api/users/${id}/follow`),
unfollow: (id: string) => api.delete(`/api/users/${id}/follow`),
getLeaderboard: (category = 'pr_score') =>
api.get(`/api/users/leaderboard?category=${category}`),
};

// Auth
export const authApi = {
login: (accessToken: string) =>
api.post('/api/auth/login', { accessToken }),
};

// Jackpot
export const jackpotApi = {
getCurrent: () => api.get('/api/jackpot/current'),
checkEligibility: () => api.get('/api/jackpot/eligibility'),
getHistory: () => api.get('/api/jackpot/history'),
};

// Seasons
export const seasonsApi = {
getCurrent: () => api.get('/api/seasons/current'),
};

// Notifications
export const notificationsApi = {
getAll: () => api.get('/api/notifications'),
markAllRead: () => api.patch('/api/notifications/read-all'),
markRead: (id: string) => api.patch(`/api/notifications/${id}/read`),
};

export default api;
