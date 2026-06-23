import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
};

// User endpoints
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-password', data),
  deleteAccount: () => api.delete('/users/profile'),
  getUserHistory: () => api.get('/users/history'),
  getAllUsers: () => api.get('/users'),
  toggleUserStatus: (id) => api.put(`/users/${id}/toggle-status`),
};

// Asset endpoints
export const assetAPI = {
  getAssets: () => api.get('/assets'),
  getAsset: (id) => api.get(`/assets/${id}`),
  createAsset: (data) => api.post('/assets', data),
  updateAsset: (id, data) => api.put(`/assets/${id}`, data),
  deleteAsset: (id) => api.delete(`/assets/${id}`),
};

// Borrow endpoints
export const borrowAPI = {
  getBorrowRequests: () => api.get('/borrow'),
  getBorrowRequest: (id) => api.get(`/borrow/${id}`),
  createBorrowRequest: (data) => api.post('/borrow', data),
  approveBorrow: (id) => api.post(`/borrow/${id}/approve`),
  declineBorrow: (id) => api.post(`/borrow/${id}/decline`),
  rejectBorrow: (id) => api.post(`/borrow/${id}/decline`),
  returnAsset: (id, data) => api.post(`/borrow/${id}/return`, data),
  getBorrowHistory: () => api.get('/borrow/history'),
};

// Penalty endpoints
export const penaltyAPI = {
  getPenalties: () => api.get('/penalties'),
  calculatePenalty: (borrowId) => api.get(`/penalties/${borrowId}`),
  payPenalty: (penaltyId) => api.post(`/penalties/${penaltyId}/pay`),
};

// Transaction endpoints
export const transactionAPI = {
  getNetworkInfo: () => api.get('/blockchain/network-info'),
  getContractInfo: () => api.get('/blockchain/contract-info'),
  getTransactions: (borrowId = null) =>
    api.get('/blockchain/transactions', {
      params: borrowId ? { borrow_id: borrowId } : {},
    }),
  recordTransaction: (data) => api.post('/blockchain/transactions', data),
  getTransactionReceipt: (txHash) => api.post('/blockchain/transaction-receipt', { tx_hash: txHash }),
};

export default api;
