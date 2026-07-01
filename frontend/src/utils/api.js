import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const BAN_MESSAGE =
  'Your account has been banned after receiving 3 warnings. Please contact an administrator to request reactivation.';

function isBanResponse(status, detail) {
  if (status !== 403 || !detail) return false;
  const message = typeof detail === 'string' ? detail : JSON.stringify(detail);
  return message.toLowerCase().includes('banned') || message.toLowerCase().includes('3 warnings');
}

export function handleAccountBanned(message = BAN_MESSAGE) {
  sessionStorage.setItem('banMessage', message);
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new CustomEvent('auth:force-logout'));
  if (window.location.pathname !== '/') {
    window.location.href = '/';
  }
}

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data?.is_banned) {
      handleAccountBanned(BAN_MESSAGE);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    if (isBanResponse(status, detail)) {
      handleAccountBanned(typeof detail === 'string' ? detail : BAN_MESSAGE);
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  verifyEmail: (token) => api.get('/auth/verify-email', { params: { token } }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
};

// User endpoints
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/users/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  changePassword: (data) => api.put('/users/change-password', data),
  deleteAccount: () => api.delete('/users/profile'),
  getUserHistory: () => api.get('/users/history'),
  getAllUsers: () => api.get('/users'),
  getUser: (id) => api.get(`/users/${id}`),
  toggleUserStatus: (id) => api.put(`/users/${id}/toggle-status`),
  resetUserWarnings: (id) => api.put(`/users/${id}/reset-warnings`),
  verifyUser: (id) => api.put(`/users/${id}/verify`),
  unverifyUser: (id) => api.put(`/users/${id}/unverify`),
  notifyCredentials: (id) => api.post(`/users/${id}/notify-credentials`),
  deleteUser: (id) => api.delete(`/users/${id}`),
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
  confirmReturn: (id, data) => api.post(`/borrow/${id}/confirm-return`, data),
  getBorrowHistory: () => api.get('/borrow/history'),
};

// Notification endpoints
export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// Penalty endpoints
export const penaltyAPI = {
  getPenalties: () => api.get('/penalties'),
};

// Message endpoints
export const messageAPI = {
  getMyMessages: () => api.get('/messages/my'),
  sendMessage: (text) => api.post('/messages/send', { text }),
  sendAdminReply: (userId, text) => api.post('/messages/send', { user_id: userId, text }),
  getConversations: () => api.get('/messages/conversations'),
  getConversation: (userId) => api.get(`/messages/conversation/${userId}`),
  getUnreadCount: () => api.get('/messages/unread-count'),
  deleteConversation: () => api.delete('/messages/my'),
  adminDeleteConversation: (userId) => api.delete(`/messages/conversation/${userId}`),
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
