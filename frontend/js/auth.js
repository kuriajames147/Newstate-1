// frontend/js/auth.js
const API_BASE = 'http://localhost:5000/api';

// ============================================
// HELPER FUNCTIONS
// ============================================

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `fixed top-20 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  } text-white`;
  toast.innerHTML = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============================================
// REFERRAL CODE MANAGEMENT
// ============================================

// Get referral code from sessionStorage (set by index.html)
function getReferralCode() {
  const code = sessionStorage.getItem('referral_code');
  console.log('📤 Retrieved referral code from sessionStorage:', code);
  return code;
}

// Clear referral code after use
function clearReferralCode() {
  sessionStorage.removeItem('referral_code');
  console.log('🗑️ Referral code cleared from sessionStorage');
}

// Store referral code (called from index.html)
function storeReferralCode(code) {
  if (code && code !== 'null' && code !== 'undefined' && code.trim() !== '') {
    sessionStorage.setItem('referral_code', code.trim());
    console.log('✅ Referral code stored:', code.trim());
    return true;
  }
  console.log('ℹ️ No valid referral code to store');
  return false;
}

// Check if there's a referral code in the URL (for debugging)
function checkUrlForReferral() {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref');
  if (ref) {
    console.log('🔍 Referral code found in URL:', ref);
    storeReferralCode(ref);
    return ref;
  }
  console.log('ℹ️ No referral code in URL');
  return null;
}

// ============================================
// TAB SWITCHING
// ============================================

function switchTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  
  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginTab.classList.add('bg-green-600', 'text-white');
    loginTab.classList.remove('text-gray-600');
    registerTab.classList.remove('bg-green-600', 'text-white');
    registerTab.classList.add('text-gray-600');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    registerTab.classList.add('bg-green-600', 'text-white');
    registerTab.classList.remove('text-gray-600');
    loginTab.classList.remove('bg-green-600', 'text-white');
    loginTab.classList.add('text-gray-600');
    
    // Show referral message if user was referred
    const refCode = sessionStorage.getItem('referral_code');
    if (refCode) {
      setTimeout(() => {
        showToast('🎉 You were referred by a friend! Complete registration to join.', 'success');
      }, 500);
    }
  }
}
   // ============================================
// REGISTER HANDLER - WITH REFERRAL CODE
// ============================================

async function handleRegister() {
  const referral_code = sessionStorage.getItem('referral_code');
  
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    
    
    
    const btn = document.getElementById('registerBtn');
    
    if (!username || !email || !phone || !password) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    const phoneRegex = /^(?:254|0)(7|1)\d{8}$/;
    if (!phoneRegex.test(phone)) {
        showToast('Please enter a valid Kenyan phone number', 'error');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating account...';
    
    try {
        const requestBody = { username, email, phone, password };
        if (referral_code && referral_code !== 'null') {
            requestBody.referral_code = referral_code;
        }
        
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.success) {
            setToken(data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            sessionStorage.removeItem('referral_code');
            showToast(data.message);
            window.location.href = 'activation.html';
        } else {
            // Show the specific error from backend
            showToast(data.error, 'error');
            console.error('Registration error:', data.error);
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Registration failed. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Register';
    }
}
// ============================================
// LOGIN HANDLER
// ============================================

async function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  
  if (!email || !password) {
    showToast('Please fill all fields', 'error');
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Logging in...';
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      showToast('Login successful!');
      
      if (data.user.registration_paid === false) {
        window.location.href = 'activation.html';
      } else {
        window.location.href = 'dashboard.html';
      }
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast('Login failed. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Login';
  }
}



// ============================================
// TEST FUNCTION - Check if referral system is working
// ============================================

function testReferralSystem() {
  console.log('========================================');
  console.log('🧪 TESTING REFERRAL SYSTEM');
  console.log('========================================');
  console.log('Current URL:', window.location.href);
  console.log('URL params:', window.location.search);
  console.log('sessionStorage referral_code:', sessionStorage.getItem('referral_code'));
  console.log('localStorage token:', localStorage.getItem('token') ? 'Present' : 'Missing');
  console.log('========================================');
}

// ============================================
// INITIALIZATION - Runs when script loads
// ============================================

// Run immediately when script loads
(function init() {
  console.log('🔧 Auth.js initializing...');
  checkUrlForReferral();
  testReferralSystem();
})();

// Also check when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 DOM fully loaded, checking for referral code again...');
  checkUrlForReferral();
});

// ============================================
// EXPOSE FUNCTIONS FOR GLOBAL ACCESS
// ============================================

window.switchTab = switchTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.checkUrlForReferral = checkUrlForReferral;
window.storeReferralCode = storeReferralCode;
window.testReferralSystem = testReferralSystem;