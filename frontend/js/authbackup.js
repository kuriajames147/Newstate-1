const API_BASE = 'http://localhost:5000/api';

// Check if user needs activation
async function checkActivationStatus() {
  const token = getToken();
  if (!token) return false;
  
  try {
    const response = await fetch(`${API_BASE}/auth/check-activation`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return !data.is_activated;
  } catch (error) {
    return false;
  }
}

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
      
      if (data.requires_activation) {
        showToast('Please activate your account by paying Ksh 200');
        window.location.href = 'activation.html';
      } else {
        showToast('Login successful!');
        if (data.user.role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      }
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Login failed. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Login';
  }
}

async function handleRegister() {
  const username = document.getElementById('regUsername').value;
  const email = document.getElementById('regEmail').value;
  const phone = document.getElementById('regPhone').value;
  const password = document.getElementById('regPassword').value;
  
  let referral_code = sessionStorage.getItem('referral_code');
  
  if (!referral_code || referral_code === 'null' || referral_code === 'undefined' || referral_code.trim() === '') {
    referral_code = null;
  }
  
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
    if (referral_code) requestBody.referral_code = referral_code;
    
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
      showToast(data.error, 'error');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showToast('Registration failed. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Register';
  }
} 