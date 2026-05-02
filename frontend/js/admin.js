// Check admin authentication
if (!getToken()) {
  window.location.href = 'index.html';
}

// Verify admin role
async function checkAdmin() {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  const data = await response.json();
  if (data.user?.role !== 'admin') {
    window.location.href = 'dashboard.html';
  }
}
checkAdmin();

async function showAdminSection(section) {
  document.getElementById('adminSectionTitle').textContent = section.charAt(0).toUpperCase() + section.slice(1);
  
  const content = document.getElementById('adminContent');
  
  switch(section) {
    case 'dashboard':
      await loadAdminDashboard(content);
      break;
    case 'users':
      await loadUsers(content);
      break;
    case 'withdrawals':
      await loadWithdrawals(content);
      break;
    case 'transactions':
      await loadTransactions(content);
      break;
    case 'referrals':
      await loadReferrals(content);
      break;
  }
}

async function loadAdminDashboard(container) {
  const response = await fetch(`${API_BASE}/admin/stats`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  const data = await response.json();
  
  if (data.success) {
    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-sm p-6">
          <p class="text-gray-500 text-sm">Total Users</p>
          <p class="text-3xl font-bold text-blue-600">${data.stats.totalUsers}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-6">
          <p class="text-gray-500 text-sm">Active Users</p>
          <p class="text-3xl font-bold text-green-600">${data.stats.activeUsers}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-6">
          <p class="text-gray-500 text-sm">Total Referrals</p>
          <p class="text-3xl font-bold text-purple-600">${data.stats.totalReferrals}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-6">
          <p class="text-gray-500 text-sm">Total Earnings</p>
          <p class="text-3xl font-bold text-orange-600">${formatMoney(data.stats.totalEarnings)}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-6">
          <p class="text-gray-500 text-sm">Pending Withdrawals</p>
          <p class="text-3xl font-bold text-red-600">${data.stats.pendingWithdrawals.count}</p>
          <p class="text-sm">Total: ${formatMoney(data.stats.pendingWithdrawals.total)}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-6">
          <p class="text-gray-500 text-sm">Transaction Volume</p>
          <p class="text-3xl font-bold text-indigo-600">${formatMoney(data.stats.totalVolume)}</p>
        </div>
      </div>
    `;
  }
}

async function loadUsers(container) {
  const response = await fetch(`${API_BASE}/admin/users`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  const data = await response.json();
  
  if (data.success) {
    container.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left">ID</th>
                <th class="px-4 py-3 text-left">Username</th>
                <th class="px-4 py-3 text-left">Email</th>
                <th class="px-4 py-3 text-left">Phone</th>
                <th class="px-4 py-3 text-left">Balance</th>
                <th class="px-4 py-3 text-left">Referrals</th>
                <th class="px-4 py-3 text-left">Status</th>
                <th class="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${data.users.map(user => `
                <tr class="border-b">
                  <td class="px-4 py-3">${user.id}</td>
                  <td class="px-4 py-3">${user.username}</td>
                  <td class="px-4 py-3">${user.email}</td>
                  <td class="px-4 py-3">${user.phone}</td>
                  <td class="px-4 py-3">${formatMoney(user.wallet_balance)}</td>
                  <td class="px-4 py-3">${user.referral_count || 0}</td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded-full text-xs ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                      ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <button onclick="toggleUserStatus(${user.id}, ${!user.is_active})" class="text-blue-600 hover:text-blue-800">
                      ${user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

async function loadWithdrawals(container) {
  const response = await fetch(`${API_BASE}/admin/withdrawals/pending`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  const data = await response.json();
  
  if (data.success) {
    container.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <h3 class="text-lg font-bold p-6 border-b">Pending Withdrawals</h3>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left">User</th>
                <th class="px-4 py-3 text-left">Amount</th>
                <th class="px-4 py-3 text-left">Phone</th>
                <th class="px-4 py-3 text-left">Date</th>
                <th class="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${data.withdrawals.map(wd => `
                <tr class="border-b">
                  <td class="px-4 py-3">${wd.username}</td>
                  <td class="px-4 py-3 font-semibold text-green-600">${formatMoney(wd.amount)}</td>
                  <td class="px-4 py-3">${wd.phone}</td>
                  <td class="px-4 py-3">${formatDate(wd.created_at)}</td>
                  <td class="px-4 py-3">
                    <button onclick="approveWithdrawal(${wd.id})" class="bg-green-500 text-white px-3 py-1 rounded mr-2 hover:bg-green-600">Approve</button>
                    <button onclick="rejectWithdrawal(${wd.id})" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Reject</button>
                  </td>
                </tr>
              `).join('')}
              ${data.withdrawals.length === 0 ? '<tr><td colspan="5" class="text-center py-8 text-gray-500">No pending withdrawals</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

async function loadTransactions(container) {
  const response = await fetch(`${API_BASE}/admin/transactions`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  const data = await response.json();
  
  if (data.success) {
    container.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left">ID</th>
                <th class="px-4 py-3 text-left">User</th>
                <th class="px-4 py-3 text-left">Type</th>
                <th class="px-4 py-3 text-left">Amount</th>
                <th class="px-4 py-3 text-left">Status</th>
                <th class="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              ${data.transactions.map(tx => `
                <tr class="border-b">
                  <td class="px-4 py-3">${tx.id}</td>
                  <td class="px-4 py-3">${tx.username}</td>
                  <td class="px-4 py-3 capitalize">${tx.type}</td>
                  <td class="px-4 py-3">${formatMoney(tx.amount)}</td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded-full text-xs ${
                      tx.status === 'completed' ? 'bg-green-100 text-green-700' : 
                      tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }">
                      ${tx.status}
                    </span>
                  </td>
                  <td class="px-4 py-3">${formatDate(tx.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

async function loadReferrals(container) {
  const response = await fetch(`${API_BASE}/admin/referrals`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  const data = await response.json();
  
  if (data.success) {
    container.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left">Referrer</th>
                <th class="px-4 py-3 text-left">Referred</th>
                <th class="px-4 py-3 text-left">Commission</th>
                <th class="px-4 py-3 text-left">Status</th>
                <th class="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              ${data.referrals.map(ref => `
                <tr class="border-b">
                  <td class="px-4 py-3">${ref.referrer_name}</td>
                  <td class="px-4 py-3">${ref.referred_name || 'Pending'}</td>
                  <td class="px-4 py-3">${ref.commission ? formatMoney(ref.commission) : '-'}</td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded-full text-xs ${ref.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                      ${ref.status}
                    </span>
                  </td>
                  <td class="px-4 py-3">${formatDate(ref.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

async function toggleUserStatus(userId, activate) {
  try {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ is_active: activate })
    });
    const data = await response.json();
    
    if (data.success) {
      showToast(`User ${activate ? 'activated' : 'deactivated'} successfully`);
      showAdminSection('users');
    }
  } catch (error) {
    showToast('Action failed', 'error');
  }
}

async function approveWithdrawal(withdrawalId) {
  try {
    const response = await fetch(`${API_BASE}/admin/withdrawals/${withdrawalId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    const data = await response.json();
    
    if (data.success) {
      showToast('Withdrawal approved');
      showAdminSection('withdrawals');
    }
  } catch (error) {
    showToast('Approval failed', 'error');
  }
}

async function rejectWithdrawal(withdrawalId) {
  const reason = prompt('Enter rejection reason:');
  if (reason === null) return;
  
  try {
    const response = await fetch(`${API_BASE}/admin/withdrawals/${withdrawalId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ reason })
    });
    const data = await response.json();
    
    if (data.success) {
      showToast('Withdrawal rejected');
      showAdminSection('withdrawals');
    }
  } catch (error) {
    showToast('Rejection failed', 'error');
  }
}

function logout() {
  removeToken();
  window.location.href = 'index.html';
}

// Load dashboard by default
showAdminSection('dashboard');