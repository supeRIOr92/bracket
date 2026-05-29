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
};

// Predictions
export const predictionsApi = {
record: (data: {
marketId: string;
poolId: number;
stakeAmount: number;
txHash: string;
}) => api.post('/api/predictions', data),
getHistory: (userId: string) => api.get(`/api/predictions/user/${userId}`),
getClaimStatus: (marketId: string) =>
api.get(`/api/predictions/${marketId}/claim-status`),
recordClaim: (marketId: string, txHash: string) =>
api.post(`/api/predictions/${marketId}/claim`, { txHash }),
};

// Users
export const usersApi = {
getProfile: (id: string) => api.get(`/api/users/${id}`),
updateProfile: (data: { username?: string; bio?: string }) =>
api.patch('/api/users/me', data),
follow: (id: string) => api.post(`/api/users/${id}/follow`),
unfollow: (id: string) => api.delete(`/api/users/${id}/follow`),
getLeaderboard: (category = 'pr_score') =>
api.get(`/api/leaderboard?category=${category}`),
};

// Auth
export const authApi = {
login: (accessToken: string) =>
api.post('/api/auth/login', { accessToken }),
};

// Jackpot
export const jackpotApi = {getCurrent: () => api.get('/api/jackpot/current'),
checkEligibility: () => api.get('/api/jackpot/eligibility'),
getHistory: () => api.get('/api/jackpot/history'),
};

export default api;