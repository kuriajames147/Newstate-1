const API_BASE = 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token');

const setToken = (token) => localStorage.setItem('token', token);

const removeToken = () => localStorage.removeItem('token');

const showToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  toast.className = `fixed top-20 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  } text-white`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-KE') + ' ' + date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
};

const formatMoney = (amount) => {
  return `Ksh ${parseFloat(amount).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  } catch (err) {
    showToast('Failed to copy', 'error');
  }
};

// Helper to clean referral code
const cleanReferralCode = (code) => {
  if (!code) return null;
  if (code === 'null' || code === 'undefined') return null;
  const trimmed = code.trim();
  return trimmed === '' ? null : trimmed;
};