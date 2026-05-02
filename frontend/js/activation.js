// Check if user is logged in
const token = getToken();
if (!token) {
  window.location.href = 'index.html';
}

// Load user info
async function loadUserInfo() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    if (data.user) {
      document.getElementById('userName').textContent = data.user.username;
      
      // Check if already activated
      if (data.user.registration_paid) {
        window.location.href = 'dashboard.html';
      }
    }
  } catch (error) {
    console.error('Error loading user info:', error);
  }
}

// Activate account via M-PESA
async function activateAccount() {
  const btn = document.getElementById('activateBtn');
  const statusDiv = document.getElementById('statusMessage');
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending STK Push...';
  statusDiv.className = 'mt-4 text-center p-3 rounded-lg bg-blue-100 text-blue-700';
  statusDiv.innerHTML = '<i class="fas fa-info-circle mr-2"></i>Please check your phone for M-PESA prompt...';
  statusDiv.classList.remove('hidden');
  
  try {
    const response = await fetch(`${API_BASE}/payments/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      statusDiv.className = 'mt-4 text-center p-3 rounded-lg bg-green-100 text-green-700';
      statusDiv.innerHTML = '<i class="fas fa-check-circle mr-2"></i>STK Push sent! Complete payment on your phone.';
      
      // Poll for payment status
      pollPaymentStatus(data.checkoutRequestId);
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Activation error:', error);
    statusDiv.className = 'mt-4 text-center p-3 rounded-lg bg-red-100 text-red-700';
    statusDiv.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${error.message}`;
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-money-bill-wave mr-2"></i>Pay Ksh 200 via M-PESA';
  }
}

// Poll for payment completion
async function pollPaymentStatus(checkoutRequestId) {
  let attempts = 0;
  const maxAttempts = 30; // 30 * 5 seconds = 2.5 minutes
  
  const interval = setInterval(async () => {
    attempts++;
    
    try {
      const response = await fetch(`${API_BASE}/payments/status/${checkoutRequestId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.transaction?.status === 'completed') {
        clearInterval(interval);
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.className = 'mt-4 text-center p-3 rounded-lg bg-green-100 text-green-700';
        statusDiv.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Payment successful! Redirecting to dashboard...';
        
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 2000);
      } else if (attempts >= maxAttempts || data.transaction?.status === 'failed') {
        clearInterval(interval);
        const btn = document.getElementById('activateBtn');
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.className = 'mt-4 text-center p-3 rounded-lg bg-red-100 text-red-700';
        statusDiv.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i>Payment timeout or failed. Please try again.';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-money-bill-wave mr-2"></i>Pay Ksh 200 via M-PESA';
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 5000);
}

// Logout function
function logout() {
  removeToken();
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Load user info on page load
loadUserInfo();