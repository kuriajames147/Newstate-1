// frontend/js/config.js
// Detect environment
const isProduction = window.location.hostname !== 'localhost';

export const API_BASE = isProduction 
    ? 'https://referral-backend.onrender.com/api'
    : 'http://localhost:5000/api';