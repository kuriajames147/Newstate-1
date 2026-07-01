// frontend/js/dashboard.js
// Use the existing API_BASE from HTML - don't redeclare with const/let
// API_BASE is already defined in the HTML

// ============================================
// SETTINGS
// ============================================

async function loadSettings() {
  try {
    const response = await fetch(`${API_BASE}/settings/public`);
    const data = await response.json();
    
    if (data.success) {
      window.appSettings = data.settings;
      
      const commissionEl = document.querySelector('.referral-commission');
      if (commissionEl) {
        commissionEl.textContent = `Ksh ${data.settings.referral_commission}`;
      }
      
      const activationFeeEl = document.querySelector('.activation-fee');
      if (activationFeeEl) {
        activationFeeEl.textContent = `Ksh ${data.settings.activation_fee}`;
      }
      
      return data.settings;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    return {
      activation_fee: '300',
      referral_commission: '120',
      min_withdrawal: '300'
    };
  }
}

loadSettings();

// ============================================
// API BASE
// ============================================

if (typeof API_BASE === 'undefined') {
  var API_BASE = 'http://localhost:5000/api';
}

// ============================================
// AUTH & UTILITY FUNCTIONS
// ============================================

function getToken() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return null;
  }
  return token;
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

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-KE') + ' ' + date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

function formatMoney(amount) {
  return `Ksh ${parseFloat(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ============================================
// WALLET BALANCE
// ============================================

async function loadWalletBalance() {
  try {
    const response = await fetch(`${API_BASE}/wallet/balance`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('walletBalance').innerHTML = formatMoney(data.balance);
      document.getElementById('totalEarnings').innerHTML = formatMoney(data.totalEarnings);
      
      const withdrawnEl = document.getElementById('totalWithdrawn');
      if (withdrawnEl) {
        withdrawnEl.innerHTML = formatMoney(data.totalWithdrawn);
      }
      
      console.log(`Wallet: ${data.balance}, Earnings: ${data.totalEarnings}, Withdrawn: ${data.totalWithdrawn}`);
    }
  } catch (error) {
    console.error('Balance error:', error);
  }
}

// ============================================
// REFERRAL STATS - FIXED VERSION
// ============================================

async function loadReferralStats() {
    console.log('🔄 loadReferralStats() started...');
    
    try {
        const token = getToken();
        if (!token) {
            console.warn('❌ No token found');
            return;
        }

        console.log('📡 Fetching from:', `${API_BASE}/referrals/stats`);
        
        const response = await fetch(`${API_BASE}/referrals/stats`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📊 Full API response:', JSON.stringify(data, null, 2));
        
        // ============================================
        // UPDATE REFERRAL LINK - THE CRITICAL PART
        // ============================================
        
        // FIXED: Get referral code from the stats response
        let referralCode = data.referralCode || null;
        console.log('📌 Referral code from stats:', referralCode);
        
        // If not in stats, try to get from user profile
        if (!referralCode) {
            console.log('🔄 Trying to get referral code from profile...');
            try {
                const profileResponse = await fetch(`${API_BASE}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const profileData = await profileResponse.json();
                console.log('📋 Profile data:', profileData);
                
                if (profileData.user && profileData.user.referral_code) {
                    referralCode = profileData.user.referral_code;
                    console.log('✅ Got referral code from profile:', referralCode);
                }
            } catch (profileError) {
                console.error('Error fetching profile:', profileError);
            }
        }
        
        // ============================================
        // DISPLAY THE REFERRAL LINK
        // ============================================
        
        const referralLinkInput = document.getElementById('referralLink');
        const referralCodeDisplay = document.getElementById('referralCodeDisplay');
        
        console.log('🔍 Looking for elements:');
        console.log('  - #referralLink exists?', !!referralLinkInput);
        console.log('  - #referralCodeDisplay exists?', !!referralCodeDisplay);
        
        if (referralLinkInput) {
            if (referralCode) {
                const baseUrl = window.location.origin;
                const referralLink = `${baseUrl}/index.html?ref=${referralCode}`;
                referralLinkInput.value = referralLink;
                referralLinkInput.style.borderColor = '#22c55e';
                console.log('✅ REFERRAL LINK SET TO:', referralLink);
                
                if (referralCodeDisplay) {
                    referralCodeDisplay.textContent = referralCode;
                }
                
                window.currentReferralCode = referralCode;
                window.currentReferralLink = referralLink;
            } else {
                referralLinkInput.value = '⚠️ No referral code found - Contact support';
                referralLinkInput.style.borderColor = '#ef4444';
                console.error('❌ Could not find referral code anywhere');
            }
        } else {
            console.error('❌ Element #referralLink not found in the DOM!');
        }
        
        // ============================================
        // UPDATE OTHER STATS
        // ============================================
        
        if (data.success) {
            const pendingCount = document.getElementById('pendingCount');
            const completedCount = document.getElementById('completedCount');
            const totalReferrals = document.getElementById('totalReferrals');
            const totalEarnings = document.getElementById('totalEarnings');
            
            if (pendingCount) pendingCount.textContent = data.totalPending || 0;
            if (completedCount) completedCount.textContent = data.totalCompleted || 0;
            if (totalReferrals) totalReferrals.textContent = (data.totalPending || 0) + (data.totalCompleted || 0);
            if (totalEarnings) totalEarnings.innerHTML = `Ksh ${data.totalEarned || 0}`;
            
            const tbody = document.getElementById('referralsTable');
            if (tbody) {
                tbody.innerHTML = '';
                
                const pending = data.pending || [];
                const completed = data.completed || [];
                
                if (pending.length === 0 && completed.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center py-8 text-gray-500">
                                <i class="fas fa-users text-2xl mb-2 block"></i>
                                No referrals yet. Share your link to start earning!
                            </td>
                        </tr>
                    `;
                } else {
                    pending.forEach(ref => {
                        tbody.innerHTML += `
                            <tr class="border-b hover:bg-gray-50">
                                <td class="px-4 py-3">${ref.username || 'Unknown'}</td>
                                <td class="px-4 py-3">${ref.email || '-'}</td>
                                <td class="px-4 py-3">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                        ⏳ Pending
                                    </span>
                                </td>
                                <td class="px-4 py-3">-</td>
                                <td class="px-4 py-3 text-sm">${formatDate(ref.created_at)}</td>
                            </tr>
                        `;
                    });
                    
                    completed.forEach(ref => {
                        tbody.innerHTML += `
                            <tr class="border-b hover:bg-gray-50">
                                <td class="px-4 py-3">${ref.username || 'Unknown'}</td>
                                <td class="px-4 py-3">${ref.email || '-'}</td>
                                <td class="px-4 py-3">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        ✅ Completed
                                    </span>
                                </td>
                                <td class="px-4 py-3 font-semibold text-green-600">Ksh ${ref.commission || 0}</td>
                                <td class="px-4 py-3 text-sm">${formatDate(ref.created_at)}</td>
                            </tr>
                        `;
                    });
                }
            }
        }
        
        console.log('✅ loadReferralStats() completed successfully');
        
    } catch (error) {
        console.error('❌ Error in loadReferralStats:', error);
        showToast('Failed to load referral stats. Please refresh.', 'error');
        
        const referralLinkInput = document.getElementById('referralLink');
        if (referralLinkInput) {
            referralLinkInput.value = '⚠️ Error: ' + error.message;
            referralLinkInput.style.borderColor = '#ef4444';
        }
    }
}

// ============================================
// TRANSACTIONS
// ============================================

async function loadTransactions() {
  try {
    const response = await fetch(`${API_BASE}/wallet/transactions`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (data.success) {
      const tbody = document.getElementById('transactionsTable');
      if (!tbody) {
        console.warn('transactionsTable element not found');
        return;
      }
      
      tbody.innerHTML = '';
      
      if (data.transactions && data.transactions.length > 0) {
        data.transactions.slice(0, 10).forEach(tx => {
          const statusColor = tx.status === 'completed' ? 'text-green-600' : 
                             tx.status === 'pending' ? 'text-yellow-600' : 'text-red-600';
          tbody.innerHTML += `
            <tr class="border-b">
              <td class="px-4 py-2">${formatDate(tx.created_at)}</td>
              <td class="px-4 py-2 capitalize">${tx.type}</td>
              <td class="px-4 py-2 font-semibold">${formatMoney(tx.amount)}</td>
              <td class="px-4 py-2 ${statusColor} capitalize">${tx.status}</td>
            </tr>
          `;
        });
      } else {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center py-8 text-gray-500">No transactions yet</td>
          </tr>
        `;
      }
    }
  } catch (error) {
    console.error('Transactions error:', error);
  }
}
// ============================================
// EARNINGS - COMPLETE DYNAMIC VERSION
// ============================================

async function loadEarnings() {
    console.log('📊 Loading earnings from database...');
    
    try {
        const token = getToken();
        if (!token) {
            console.warn('⚠️ No token for earnings');
            return;
        }
        
        const response = await fetch(`${API_BASE}/wallet/earnings`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Earnings API response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('📊 Earnings data from database:', data);

        // Get table body
        const tbody = document.getElementById('earningsTable');
        if (!tbody) {
            console.warn('⚠️ earningsTable element not found');
            return;
        }

        // Initialize totals
        let totalReferral = 0;
        let totalSpin = 0;
        let totalVideo = 0;
        let totalBlog = 0;
        let grandTotal = 0;

        // Check if we have earnings data
        if (data.success && data.earnings && data.earnings.length > 0) {
            console.log(`📊 Processing ${data.earnings.length} earnings records from database`);
            
            // Build table rows dynamically
            let rowsHTML = '';
            
            data.earnings.forEach(earning => {
                // Determine source type and styling from database
                const sourceType = earning.source_type || earning.type || 'unknown';
                const amount = parseFloat(earning.amount || 0);
                
                let icon = '💰';
                let badgeClass = 'bg-gray-100 text-gray-700';
                let sourceLabel = 'Other';
                
                // Map source type to display values
                switch(sourceType) {
                    case 'referral':
                    case 'commission':
                        icon = '👥';
                        badgeClass = 'bg-green-100 text-green-700';
                        sourceLabel = 'Referral';
                        totalReferral += amount;
                        break;
                    case 'spin':
                    case 'spin_earning':
                        icon = '🎡';
                        badgeClass = 'bg-yellow-100 text-yellow-700';
                        sourceLabel = 'Spin & Win';
                        totalSpin += amount;
                        break;
                    case 'video':
                    case 'video_earning':
                        icon = '🎬';
                        badgeClass = 'bg-blue-100 text-blue-700';
                        sourceLabel = 'Watch & Earn';
                        totalVideo += amount;
                        break;
                    case 'blog':
                    case 'blog_earning':
                        icon = '📝';
                        badgeClass = 'bg-purple-100 text-purple-700';
                        sourceLabel = 'Read & Earn';
                        totalBlog += amount;
                        break;
                    default:
                        icon = '💰';
                        badgeClass = 'bg-gray-100 text-gray-700';
                        sourceLabel = 'Other';
                }
                
                grandTotal += amount;

                // Get description from database or generate one
                let description = earning.description || earning.source_label || '';
                if (!description) {
                    switch(sourceType) {
                        case 'spin':
                        case 'spin_earning':
                            description = 'Spin & Win reward';
                            break;
                        case 'video':
                        case 'video_earning':
                            description = 'Video watching reward';
                            break;
                        case 'blog':
                        case 'blog_earning':
                            description = 'Blog reading reward';
                            break;
                        case 'referral':
                        case 'commission':
                            description = `Commission for ${earning.referred_user || 'referral'}`;
                            break;
                        default:
                            description = 'Earning';
                    }
                }

                // Build row
                rowsHTML += `
                    <tr class="border-b hover:bg-gray-50 transition">
                        <td class="px-3 md:px-4 py-3 text-sm">${formatDate(earning.created_at)}</td>
                        <td class="px-3 md:px-4 py-3">
                            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badgeClass}">
                                ${icon} ${sourceLabel}
                            </span>
                        </td>
                        <td class="px-3 md:px-4 py-3 text-sm text-gray-600">${description}</td>
                        <td class="px-3 md:px-4 py-3 text-right font-semibold text-green-600">${formatMoney(amount)}</td>
                    </tr>
                `;
            });

            tbody.innerHTML = rowsHTML;

        } else {
            // No earnings found - show empty state
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-8 text-gray-500">
                        <i class="fas fa-chart-line text-2xl mb-2 block"></i>
                        <p>No earnings yet.</p>
                        <p class="text-sm mt-1">Start referring friends to earn!</p>
                    </td>
                </tr>
            `;
        }

        // Update summary cards dynamically
        const totalReferralEl = document.getElementById('totalReferralEarnings');
        const totalSpinEl = document.getElementById('totalSpinEarnings');
        const totalVideoEl = document.getElementById('totalVideoEarnings');
        const totalBlogEl = document.getElementById('totalBlogEarnings');
        const totalEarningsDisplay = document.getElementById('totalEarningsDisplay');

        if (totalReferralEl) totalReferralEl.innerHTML = formatMoney(totalReferral);
        if (totalSpinEl) totalSpinEl.innerHTML = formatMoney(totalSpin);
        if (totalVideoEl) totalVideoEl.innerHTML = formatMoney(totalVideo);
        if (totalBlogEl) totalBlogEl.innerHTML = formatMoney(totalBlog);
        if (totalEarningsDisplay) totalEarningsDisplay.innerHTML = formatMoney(grandTotal);

        console.log(`📊 Earnings Summary - Referrals: ${totalReferral}, Spin: ${totalSpin}, Video: ${totalVideo}, Blog: ${totalBlog}, Total: ${grandTotal}`);
        
    } catch (error) {
        console.error('❌ Earnings error:', error);
        showToast('Error loading earnings', 'error');
        
        // Show error in table
        const tbody = document.getElementById('earningsTable');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-8 text-red-500">
                        <i class="fas fa-exclamation-circle text-2xl mb-2 block"></i>
                        <p>Error loading earnings</p>
                        <p class="text-sm mt-1">Please refresh the page</p>
                    </td>
                </tr>
            `;
        }
    }
}

// ============================================
// WITHDRAWALS
// ============================================

async function loadWithdrawals() {
  try {
    const response = await fetch(`${API_BASE}/wallet/withdrawals`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const tbody = document.getElementById('withdrawalHistoryTable');
      if (tbody) {
        tbody.innerHTML = '';
        
        if (data.withdrawals && data.withdrawals.length > 0) {
          data.withdrawals.forEach(wd => {
            let statusColor = '';
            let statusText = '';
            
            switch(wd.status) {
              case 'pending':
                statusColor = 'text-yellow-600';
                statusText = 'Pending Approval';
                break;
              case 'processing':
                statusColor = 'text-blue-600';
                statusText = 'Processing...';
                break;
              case 'completed':
                statusColor = 'text-green-600';
                statusText = 'Completed';
                break;
              case 'failed':
                statusColor = 'text-red-600';
                statusText = 'Failed';
                break;
              case 'cancelled':
                statusColor = 'text-gray-600';
                statusText = 'Cancelled';
                break;
              default:
                statusColor = 'text-gray-600';
                statusText = wd.status;
            }
            
            tbody.innerHTML += `
              <tr class="border-b">
                <td class="px-4 py-2">${formatDate(wd.created_at)}</td>
                <td class="px-4 py-2 font-semibold">${formatMoney(wd.amount)}</td>
                <td class="px-4 py-2 ${statusColor} capitalize">${statusText}</td>
                ${wd.transaction_id ? `<td class="px-4 py-2 text-xs text-gray-500">${wd.transaction_id}</td>` : ''}
              </tr>
            `;
          });
        } else {
          tbody.innerHTML = '<tr><td colspan="3" class="text-center py-8 text-gray-500">No withdrawal requests yet</td></tr>';
        }
      }
    }
  } catch (error) {
    console.error('Withdrawals error:', error);
  }
}

// ============================================
// LEADERBOARD
// ============================================

async function loadLeaderboard() {
  try {
    const response = await fetch(`${API_BASE}/referrals/leaderboard`);
    
    if (!response.ok) {
      console.warn('⚠️ Leaderboard API not available');
      // Show a message instead of error
      const container = document.getElementById('leaderboardList');
      if (container) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">Leaderboard coming soon!</p>';
      }
      return;
    }
    
    const data = await response.json();
    
    if (data.success) {
      const container = document.getElementById('leaderboardList');
      if (!container) {
        console.warn('leaderboardList element not found');
        return;
      }
      
      container.innerHTML = '';
      
      if (data.leaderboard && data.leaderboard.length > 0) {
        data.leaderboard.forEach((user, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          container.innerHTML += `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-2">
              <div class="flex items-center gap-3">
                <span class="text-2xl">${medal}</span>
                <div>
                  <p class="font-semibold">${user.username}</p>
                  <p class="text-sm text-gray-500">${user.referral_count || 0} referrals</p>
                </div>
              </div>
              <p class="font-bold text-green-600">${formatMoney(user.total_earnings)}</p>
            </div>
          `;
        });
      } else {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">No leaders yet. Be the first!</p>';
      }
    }
  } catch (error) {
    console.error('Leaderboard error:', error);
    const container = document.getElementById('leaderboardList');
    if (container) {
      container.innerHTML = '<p class="text-center text-gray-500 py-8">Leaderboard coming soon!</p>';
    }
  }
}

async function loadUserProfile() {
    console.log('👤 Loading user profile...');
    try {
        const token = getToken();
        if (!token) {
            console.warn('⚠️ No token found');
            return null;
        }

        const url = `${API_BASE}/auth/me`;
        console.log('📡 Fetching from:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Profile response status:', response.status);

        if (!response.ok) {
            if (response.status === 401) {
                console.warn('⚠️ Token expired or invalid');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
                return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Parse JSON directly
        const data = await response.json();
        console.log('👤 User profile data:', data);

        if (data && data.user) {
            // Update username
            const userNameEl = document.getElementById('userName');
            if (userNameEl) {
                userNameEl.textContent = data.user.username || 'User';
            }
            
            // Store user in localStorage
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Update referral link
            const referralLinkInput = document.getElementById('referralLink');
            if (referralLinkInput && data.user.referral_code) {
                const baseUrl = window.location.origin;
                referralLinkInput.value = `${baseUrl}/index.html?ref=${data.user.referral_code}`;
            }
            
            // Update referral code display
            const referralCodeDisplay = document.getElementById('referralCodeDisplay');
            if (referralCodeDisplay && data.user.referral_code) {
                referralCodeDisplay.textContent = data.user.referral_code;
            }
            
            return data.user;
        } else {
            console.error('❌ No user data in response');
            showToast('Error loading profile - no user data', 'error');
            return null;
        }
    } catch (error) {
        console.error('❌ Error loading user profile:', error);
        showToast(`Error loading profile: ${error.message}`, 'error');
        return null;
    }
}

// ============================================
// WITHDRAWAL REQUEST
// ============================================

// ============================================
// WITHDRAWAL FUNCTIONS - COMPLETE WORKING
// ============================================

async function requestWithdrawal() {
    console.log('💰 Withdrawal requested...');
    
    const amountInput = document.getElementById('withdrawAmount');
    const amount = amountInput ? parseFloat(amountInput.value) : 0;
    
    // Validate amount
    if (!amount || isNaN(amount)) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    if (amount < 300) {
        showToast('Minimum withdrawal amount is Ksh 300', 'error');
        return;
    }
    
    if (amount > 50000) {
        showToast('Maximum withdrawal amount is Ksh 50,000 per request', 'error');
        return;
    }
    
    // Check token
    const token = getToken();
    if (!token) {
        showToast('Please login first', 'error');
        window.location.href = 'index.html';
        return;
    }
    
    // Get button and disable it
    const button = document.getElementById('withdrawBtn');
    if (!button) {
        console.error('❌ Withdraw button not found');
        showToast('Error: Withdraw button not found', 'error');
        return;
    }
    
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
    
    try {
        console.log('📡 Sending withdrawal request...');
        
        const response = await fetch(`${API_BASE}/wallet/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                amount: parseFloat(amount) 
            })
        });
        
        const data = await response.json();
        console.log('📡 Withdrawal response:', data);
        
        if (data.success) {
            showToast(`✅ ${data.message}`, 'success');
            if (amountInput) amountInput.value = '';
            
            // Refresh dashboard data
            setTimeout(() => {
                loadWalletBalance();
                loadWithdrawals();
                loadDashboard();
            }, 1500);
            
        } else {
            showToast(`❌ ${data.error || 'Withdrawal failed'}`, 'error');
        }
        
    } catch (error) {
        console.error('❌ Withdrawal error:', error);
        showToast('Withdrawal failed. Please try again.', 'error');
    } finally {
        // Re-enable button
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// Load withdrawals history
async function loadWithdrawals() {
    console.log('📋 Loading withdrawals...');
    
    try {
        const token = getToken();
        if (!token) return;
        
        const response = await fetch(`${API_BASE}/wallet/withdrawals`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📋 Withdrawals data:', data);
        
        const tbody = document.getElementById('withdrawalHistoryTable');
        if (!tbody) {
            console.warn('⚠️ withdrawalHistoryTable not found');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (data.success && data.withdrawals && data.withdrawals.length > 0) {
            data.withdrawals.forEach(wd => {
                let statusColor = '';
                let statusText = '';
                
                switch(wd.status) {
                    case 'pending':
                        statusColor = 'text-yellow-600';
                        statusText = '⏳ Pending Approval';
                        break;
                    case 'processing':
                        statusColor = 'text-blue-600';
                        statusText = '🔄 Processing...';
                        break;
                    case 'approved':
                    case 'completed':
                        statusColor = 'text-green-600';
                        statusText = '✅ Completed';
                        break;
                    case 'failed':
                    case 'rejected':
                        statusColor = 'text-red-600';
                        statusText = '❌ Failed';
                        break;
                    case 'cancelled':
                        statusColor = 'text-gray-600';
                        statusText = '❌ Cancelled';
                        break;
                    default:
                        statusColor = 'text-gray-600';
                        statusText = wd.status || 'Unknown';
                }
                
                tbody.innerHTML += `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm">${formatDate(wd.created_at)}</td>
                        <td class="px-4 py-3 font-semibold">${formatMoney(wd.amount)}</td>
                        <td class="px-4 py-3 ${statusColor} text-sm font-medium">${statusText}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center py-8 text-gray-500">
                        <i class="fas fa-arrow-up text-2xl mb-2 block"></i>
                        <p>No withdrawal requests yet</p>
                        <p class="text-sm mt-1">Withdraw your earnings when you reach Ksh 300</p>
                    </td>
                </tr>
            `;
        }
        
    } catch (error) {
        console.error('❌ Error loading withdrawals:', error);
        const tbody = document.getElementById('withdrawalHistoryTable');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center py-8 text-red-500">
                        <i class="fas fa-exclamation-circle text-2xl mb-2 block"></i>
                        <p>Error loading withdrawals</p>
                        <p class="text-sm mt-1">Please refresh the page</p>
                    </td>
                </tr>
            `;
        }
    }
}


// ============================================
// COPY & SHARE REFERRAL LINK
// ============================================

function copyReferralLink() {
  const linkInput = document.getElementById('referralLink');
  if (linkInput && linkInput.value) {
    navigator.clipboard.writeText(linkInput.value);
    showToast('Referral link copied to clipboard!');
  } else {
    showToast('No referral link to copy', 'error');
  }
}

function shareReferral() {
  const linkInput = document.getElementById('referralLink');
  if (linkInput && linkInput.value && navigator.share) {
    navigator.share({
      title: 'Join Refer & Earn',
      text: 'Join me on this amazing referral program and start earning!',
      url: linkInput.value
    });
  } else if (linkInput && linkInput.value) {
    copyReferralLink();
  } else {
    showToast('No referral link to share', 'error');
  }
}

// ============================================
// SECTION NAVIGATION - COMPLETE FIX
// ============================================

function showSection(section) {
    console.log(`📂 Showing section: ${section}`);
    
    const sections = ['overview', 'referrals', 'earnings', 'withdrawals', 'leaderboard', 'spinwin', 'videos', 'blogs'];
    
    // Hide all sections
    sections.forEach(s => {
        const el = document.getElementById(`${s}Section`);
        if (el) {
            el.classList.add('hidden');
        }
    });
    
    // Show selected section
    const sectionEl = document.getElementById(`${section}Section`);
    if (sectionEl) {
        sectionEl.classList.remove('hidden');
        sectionEl.style.display = 'block';
        sectionEl.style.visibility = 'visible';
        sectionEl.style.opacity = '1';
        console.log(`✅ Section "${section}" is now visible`);
    } else {
        console.warn(`⚠️ Section element "#${section}Section" not found`);
    }
    
    // Update title
    const titles = {
        overview: 'Dashboard Overview',
        referrals: 'My Referrals',
        earnings: 'Earnings History',
        withdrawals: 'Withdrawals',
        leaderboard: 'Leaderboard',
        spinwin: 'Spin & Win',
        videos: 'Watch & Earn',
        blogs: 'Read & Earn'
    };
    
    const titleEl = document.getElementById('sectionTitle');
    if (titleEl) titleEl.textContent = titles[section] || 'Dashboard';
    
    // Section-specific initialization
    if (section === 'spinwin') {
        setTimeout(function() {
            console.log('🎡 Initializing spin wheel...');
            if (typeof initWheel === 'function') initWheel();
            if (typeof loadSpinData === 'function') loadSpinData();
        }, 300);
    }
    
    if (section === 'videos') {
        console.log('🎬 Loading videos section...');
        
        // Make sure section is visible
        const videoSection = document.getElementById('videosSection');
        if (videoSection) {
            videoSection.classList.remove('hidden');
            videoSection.style.display = 'block';
            videoSection.style.visibility = 'visible';
            videoSection.style.opacity = '1';
        }
        
        // Make sure grid is visible
    const grid = document.getElementById('videoGrid');
    if (grid) {
        grid.style.display = 'grid';
        grid.style.visibility = 'visible';
        grid.style.opacity = '1';
    }
        
        // Load videos
        setTimeout(function() {
            if (typeof loadVideos === 'function') {
                loadVideos();
                console.log('✅ Videos loaded successfully');
            } else {
                console.warn('⚠️ loadVideos function not found');
                // Show error in grid
                const gridEl = document.getElementById('videoGrid');
                if (gridEl) {
                    gridEl.innerHTML = `
                        <div class="col-span-full text-center py-12 text-red-500">
                            <i class="fas fa-exclamation-circle text-4xl mb-4 block"></i>
                            <p>Video function not available. Please refresh.</p>
                        </div>
                    `;
                }
            }
        }, 400);
    }
    
    if (section === 'blogs') {
    console.log('📚 Loading blogs section...');
    
    // Make sure section is visible
    const blogSection = document.getElementById('blogsSection');
    if (blogSection) {
        blogSection.classList.remove('hidden');
        blogSection.style.display = 'block';
        blogSection.style.visibility = 'visible';
    }
    
    setTimeout(function() {
        // Always load blogs, even if completed
        if (typeof loadBlogData === 'function') {
            loadBlogData();
            console.log('✅ Blogs loaded/refreshed');
        } else {
            console.warn('⚠️ loadBlogData function not found');
        }
    }, 300);
}
}
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.toggle('active');
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}


// ============================================
// DASHBOARD INITIALIZATION
// ============================================

async function loadDashboard() {
    console.log('🔄 Loading dashboard...');
    
    try {
        // 1. Check token
        const token = getToken();
        if (!token) {
            console.warn('⚠️ No token, redirecting to login');
            window.location.href = 'index.html';
            return;
        }
        
        // 2. Load user profile
        const user = await loadUserProfile();
        if (!user) {
            console.warn('⚠️ No user data');
            return;
        }
        console.log('✅ User loaded:', user.username);
        
        // 3. Load wallet balance
        await loadWalletBalance();
        
        // 4. Load referral stats
        await loadReferralStats();
        
        // 5. Load spin data
        try {
            await loadSpinData();
        } catch (spinError) {
            console.warn('Spin data not available:', spinError);
        }
        
        // 6. Load videos - FIXED: Don't let this fail the whole dashboard
        try {
            console.log('🎬 Loading videos from dashboard...');
            await loadVideos();
        } catch (videoError) {
            console.warn('Video error:', videoError);
        }
        
        // 7. Load blog data
        try {
            await loadBlogData();
            await loadBlogProgress();
            await loadRewardHistory();
        } catch (blogError) {
            console.warn('Blog data error:', blogError);
        }
        
        // 8. Load remaining data
        await loadTransactions();
        await loadEarnings();
        await loadWithdrawals();
        await loadLeaderboard();
        
        console.log('✅ Dashboard loaded successfully');
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        showToast('Some data failed to load. Please refresh.', 'error');
    }
}


// ============================================
// BLOG FUNCTIONS - CARD VERSION
// ============================================

let blogData = {
    allBlogs: [],
    progress: {
        days_read: 0,
        total_days: 7,
        completed: false
    },
    currentDay: 1
};

 // FALLBACK BLOG DATA - PUT IT HERE
// ============================================



// Load all blog data
async function loadBlogData() {
    console.log('📚 Loading blog data...');
    
    try {
        const token = getToken();
        if (!token) return;

        // Get all blogs from API
        const allResponse = await fetch(`${API_BASE}/blogs/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (allResponse.ok) {
            const allData = await allResponse.json();
            if (allData.success && allData.blogs && allData.blogs.length > 0) {
                blogData.allBlogs = allData.blogs.sort((a, b) => a.day - b.day);
                console.log('📚 All blogs loaded from API:', blogData.allBlogs.length);
            } else {
                // If API returns empty, use fallback
                console.warn('⚠️ API returned no blogs, using fallback');
                loadFallbackBlogs();
            }
        } else {
            console.warn('⚠️ Could not load blogs from API, using fallback');
            loadFallbackBlogs();
        }

        // Get progress
        const progressResponse = await fetch(`${API_BASE}/blogs/progress`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            if (progressData.success) {
                blogData.progress = progressData.progress;
                console.log('📊 Progress:', blogData.progress);
            }
        }

        // Render cards - ALWAYS RENDER
        renderBlogCards();
        updateProgressBar();
        checkBlogCompletion();

    } catch (error) {
        console.error('❌ Error loading blog data:', error);
        // Use fallback on error
        loadFallbackBlogs();
        renderBlogCards();
        updateProgressBar();
        checkBlogCompletion();
    }
}

// Render blog cards
function renderBlogCards() {
    const container = document.getElementById('blogCardsContainer');
    if (!container) {
        console.warn('❌ Blog cards container not found');
        // Try to create it
        const section = document.getElementById('blogsSection');
        if (section) {
            const newContainer = document.createElement('div');
            newContainer.id = 'blogCardsContainer';
            newContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
            section.appendChild(newContainer);
            console.log('✅ Created blog cards container');
            // Retry after creating
            setTimeout(() => renderBlogCards(), 100);
        }
        return;
    }

    // If no blogs, load fallback
    if (!blogData.allBlogs || blogData.allBlogs.length === 0) {
        console.warn('⚠️ No blogs available, loading fallback...');
        loadFallbackBlogs();
        setTimeout(() => renderBlogCards(), 100);
        return;
    }

    const daysRead = blogData.progress.days_read || 0;
    const isCompleted = blogData.progress.completed || false;

    // Build cards HTML - ALL BLOGS REMAIN VISIBLE
    let cardsHTML = '';
    
    blogData.allBlogs.forEach(blog => {
        const day = blog.day;
        const isRead = blog.is_read || false;
        
        // When completed, all blogs show as "Read"
        const isComplete = isRead || (isCompleted && day <= 7);
        const isLocked = !isComplete && day > daysRead + 1;
        const isActive = !isComplete && day === daysRead + 1;
        
        let badgeClass = 'locked';
        let cardClass = 'locked';
        let statusText = '🔒 Locked';
        
        if (isComplete) {
            badgeClass = 'completed';
            cardClass = 'completed';
            statusText = '✅ Read';
        } else if (isActive) {
            badgeClass = 'active';
            cardClass = 'active';
            statusText = '📖 Read Now';
        }

        // Preview content (always visible)
        const previewContent = blog.content ? blog.content.replace(/<[^>]*>/g, '').substring(0, 120) + '...' : 'Read this blog to learn more about the platform.';

        cardsHTML += `
            <div class="blog-card ${cardClass}" data-day="${day}" onclick="openBlogModal(${day})">
                ${isLocked ? '<div class="lock-icon">🔒</div>' : ''}
                ${isComplete ? '<div class="check-icon">✅</div>' : ''}
                
                <div class="card-header">
                    <span class="day-badge ${badgeClass}">Day ${day}</span>
                    <span class="text-xs text-gray-400">${blog.readTime || 5} min read</span>
                </div>
                
                <div class="card-title ${isLocked ? 'locked-title' : ''}">
                    ${blog.title || 'Untitled'}
                </div>
                
                <div class="card-meta">
                    <span>📂 ${blog.category || 'General'}</span>
                </div>
                
                <div class="card-content ${isLocked ? 'locked-content' : ''}">
                    ${isLocked ? '<p>📖 Complete the previous day to unlock this educational content.</p>' : `<p>${previewContent}</p>`}
                </div>
                
                <div class="progress-indicator">
                    <div class="progress-fill" style="width: ${isComplete ? 100 : isActive ? 0 : 0}%"></div>
                </div>
                
                <div class="card-actions">
                    ${isComplete ? `
                        <button class="btn-mark-done completed-btn" disabled>
                            ✅ Completed
                        </button>
                    ` : isActive ? `
                        <button class="btn-mark-done active-btn" onclick="event.stopPropagation(); openBlogModal(${day})">
                            📖 Read & Mark Done
                        </button>
                    ` : `
                        <button class="btn-mark-done locked-btn" disabled>
                            🔒 Locked
                        </button>
                    `}
                </div>
            </div>
        `;
    });

    container.innerHTML = cardsHTML;
    console.log('✅ Blog cards rendered:', blogData.allBlogs.length);
}

// Open blog modal
function openBlogModal(day) {
    const blog = blogData.allBlogs.find(b => b.day === day);
    if (!blog) {
        showToast('Blog not found', 'error');
        return;
    }

    const daysRead = blogData.progress.days_read || 0;
    const isLocked = day > daysRead + 1 && !blog.is_read;
    const isCompleted = blog.is_read || blogData.progress.completed;

    if (isLocked) {
        showToast('🔒 Complete the previous day first!', 'error');
        return;
    }

    const modal = document.getElementById('blogModal');
    if (!modal) return;

    // Populate modal
    document.getElementById('modalDay').textContent = `Day ${day} of 7`;
    document.getElementById('modalTitle').textContent = blog.title;
    document.getElementById('modalCategory').textContent = blog.category || 'General';
    document.getElementById('modalReadTime').textContent = `${blog.readTime || 5} min read`;
    document.getElementById('modalBody').innerHTML = blog.content;

    const markDoneBtn = document.getElementById('modalMarkDone');
    const closeModalBtn = document.getElementById('modalClose');

    if (isCompleted) {
        markDoneBtn.textContent = '✅ Completed';
        markDoneBtn.className = 'btn-modal-mark-done completed';
        markDoneBtn.disabled = true;
    } else {
        markDoneBtn.textContent = '📖 Mark as Done';
        markDoneBtn.className = 'btn-modal-mark-done';
        markDoneBtn.disabled = false;
        markDoneBtn.onclick = () => markBlogAsRead(day);
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Close modal handlers
    closeModalBtn.onclick = closeBlogModal;
    modal.onclick = (e) => {
        if (e.target === modal) closeBlogModal();
    };
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeBlogModal();
    });
}

// Close blog modal
function closeBlogModal() {
    const modal = document.getElementById('blogModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Mark blog as read
async function markBlogAsRead(blogId) {
    try {
        const token = getToken();
        if (!token) {
            showToast('Please login first', 'error');
            return;
        }

        showToast('📖 Marking blog as read...', 'info');

        const response = await fetch(`${API_BASE}/blogs/${blogId}/read`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            if (data.reward_claimed) {
                showToast(`🎉 ${data.message}`, 'success');
                loadWalletBalance();
                loadEarnings();
            } else {
                showToast(`✅ ${data.message}`, 'success');
            }

            // Close modal
            closeBlogModal();

            // Reload data
            await loadBlogData();
            await loadBlogProgress();
            await loadRewardHistory();

        } else {
            showToast(data.error || 'Error marking blog as read', 'error');
        }
    } catch (error) {
        console.error('❌ Error marking blog as read:', error);
        showToast('Error marking blog as read', 'error');
    }
}

// Update progress bar
function updateProgressBar() {
    const daysRead = blogData.progress.days_read || 0;
    const totalDays = 7;
    const percentage = (daysRead / totalDays) * 100;
    const remaining = totalDays - daysRead;
    const isCompleted = blogData.progress.completed || false;

    const progressDisplay = document.getElementById('progressDisplay');
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    const remainingDays = document.getElementById('remainingDays');

    if (progressDisplay) progressDisplay.textContent = `${daysRead} / ${totalDays} days`;
    if (progressBar) progressBar.style.width = `${Math.min(percentage, 100)}%`;
    if (progressPercent) progressPercent.textContent = `${Math.min(Math.round(percentage), 100)}%`;
    if (remainingDays) remainingDays.textContent = `${remaining} days remaining`;
}

// Load blog progress
async function loadBlogProgress() {
    try {
        const token = getToken();
        if (!token) return;

        const response = await fetch(`${API_BASE}/blogs/progress`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                blogData.progress = data.progress;
                updateProgressBar();
            }
        }
    } catch (error) {
        console.error('❌ Error loading progress:', error);
    }
}

// Load reward history
async function loadRewardHistory() {
    try {
        const token = getToken();
        if (!token) return;

        const response = await fetch(`${API_BASE}/blogs/rewards`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        const container = document.getElementById('rewardHistoryList');

        if (!container) return;

        if (data.success && data.history && data.history.length > 0) {
            container.innerHTML = data.history.map(reward => `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-2">
                    <div>
                        <span class="font-medium text-gray-800">Week ${reward.week_number}, ${reward.year}</span>
                        <span class="text-sm text-gray-500 ml-2">${reward.days_read} days read</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-green-600 font-semibold">+Ksh ${reward.reward_amount}</span>
                        <span class="text-xs ${reward.is_claimed ? 'text-green-600' : 'text-yellow-600'}">
                            ${reward.is_claimed ? '✅ Claimed' : '⏳ Pending'}
                        </span>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="text-center text-gray-400 text-sm py-4">
                    <i class="fas fa-history text-2xl mb-2 block"></i>
                    No rewards yet. Complete the 7-day challenge!
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Error loading reward history:', error);
    }
}
// ============================================
// VIDEO SECTION FUNCTIONS - COMPLETE WORKING
// ============================================

let videoData = [];
let watchedVideos = [];
let currentVideo = null;
let currentCategory = 'all';
let videoTotalEarnings = 0;

// Load videos from backend
async function loadVideos() {
    console.log('🎬 loadVideos() STARTED');
    
    try {
        const token = getToken();
        if (!token) {
            console.warn('⚠️ No token found');
            return;
        }

        const response = await fetch(`${API_BASE}/videos/all`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Video API response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('🎬 Video API data:', data);

        if (data.success && data.videos && data.videos.length > 0) {
            videoData = data.videos;
            console.log('✅ Videos loaded:', videoData.length);
            
            // Update watched list
            watchedVideos = videoData.filter(v => v.is_watched === true);
            videoTotalEarnings = watchedVideos.reduce((sum, v) => sum + v.reward, 0);
            
            // Save to localStorage
            localStorage.setItem('videoData', JSON.stringify(videoData));
            localStorage.setItem('watchedVideos', JSON.stringify(watchedVideos));
            localStorage.setItem('videoEarnings', videoTotalEarnings.toString());

            // Update UI
            updateVideoStats();
            renderVideos(currentCategory);
        } else {
            console.warn('⚠️ No videos from API, using fallback');
            // Use fallback data if API returns empty
            videoData = getFallbackVideos();
            renderVideos(currentCategory);
        }
    } catch (error) {
        console.error('❌ Error loading videos:', error);
        // Try to load from localStorage
        const saved = localStorage.getItem('videoData');
        if (saved) {
            try {
                videoData = JSON.parse(saved);
                console.log('📦 Videos loaded from localStorage:', videoData.length);
                renderVideos(currentCategory);
            } catch (e) {
                // Use fallback
                videoData = getFallbackVideos();
                renderVideos(currentCategory);
            }
        } else {
            // Use fallback
            videoData = getFallbackVideos();
            renderVideos(currentCategory);
        }
    }
}

// Fallback video data
function getFallbackVideos() {
    console.log('📚 Using fallback video data');
    return [
        {
            id: 1,
            title: 'How to Share Your Referral Link',
            category: 'tutorial',
            thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            youtubeId: 'dQw4w9WgXcQ',
            description: 'Learn how to share your referral link and start earning!',
            reward: 5,
            duration: '2:30',
            is_watched: false
        },
        {
            id: 2,
            title: 'Success Story: How I Earned Ksh 10,000',
            category: 'success',
            thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            youtubeId: 'dQw4w9WgXcQ',
            description: 'Watch how one of our users earned Ksh 10,000!',
            reward: 5,
            duration: '3:45',
            is_watched: false
        },
        {
            id: 3,
            title: '5 Tips to Get More Referrals',
            category: 'tips',
            thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            youtubeId: 'dQw4w9WgXcQ',
            description: 'Proven strategies to increase your referrals.',
            reward: 5,
            duration: '4:20',
            is_watched: false
        },
        {
            id: 4,
            title: 'Understanding Your Dashboard',
            category: 'tutorial',
            thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            youtubeId: 'dQw4w9WgXcQ',
            description: 'Complete walkthrough of your dashboard.',
            reward: 5,
            duration: '5:00',
            is_watched: false
        },
        {
            id: 5,
            title: 'From Zero to Hero: Referral Journey',
            category: 'success',
            thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            youtubeId: 'dQw4w9WgXcQ',
            description: 'Follow a user\'s journey to earning Ksh 1,000.',
            reward: 5,
            duration: '6:15',
            is_watched: false
        },
        {
            id: 6,
            title: 'Maximize Your Earnings Every Day',
            category: 'tips',
            thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            youtubeId: 'dQw4w9WgXcQ',
            description: 'Daily habits to maximize your earnings.',
            reward: 5,
            duration: '3:30',
            is_watched: false
        }
    ];
}

// Update video stats
function updateVideoStats() {
    const videosWatchedEl = document.getElementById('videosWatched');
    const videoEarningsEl = document.getElementById('videoEarnings');
    
    if (videosWatchedEl) {
        videosWatchedEl.textContent = watchedVideos.length;
    }
    if (videoEarningsEl) {
        videoEarningsEl.textContent = `Ksh ${videoTotalEarnings}`;
    }
}

// Render videos - FIXED with inline styles to ensure visibility
function renderVideos(category) {
    console.log(`🎬 Rendering videos for category: ${category}`);
    console.log('📚 videoData length:', videoData.length);
    
    const grid = document.getElementById('videoGrid');
    if (!grid) {
        console.error('❌ videoGrid element not found! Creating it...');
        const section = document.getElementById('videosSection');
        if (section) {
            const newGrid = document.createElement('div');
            newGrid.id = 'videoGrid';
            newGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
            section.appendChild(newGrid);
            console.log('✅ Created videoGrid');
            // Retry after creating
            setTimeout(() => renderVideos(category), 200);
        } else {
            console.error('❌ videosSection not found!');
            return;
        }
        return;
    }

    // Filter videos
    let filteredVideos = videoData;
    if (category !== 'all') {
        filteredVideos = videoData.filter(v => v.category === category);
    }

    console.log('📚 Filtered videos count:', filteredVideos.length);

    if (!filteredVideos || filteredVideos.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <i class="fas fa-video text-4xl mb-4 block text-gray-300"></i>
                <p class="text-lg font-medium">No videos available</p>
                <p class="text-sm mt-1">Check back soon for new content!</p>
                <button onclick="loadVideos()" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg">
                    🔄 Refresh Videos
                </button>
            </div>
        `;
        return;
    }

    const watchedIds = watchedVideos.map(v => v.id);

    // Build cards with CLEAR inline styles
    let cardsHTML = '';
    
    filteredVideos.forEach(video => {
        const isWatched = watchedIds.includes(video.id);
        cardsHTML += `
            <div onclick="openVideo(${video.id})" style="
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                border: 1px solid #e5e7eb;
                cursor: pointer;
                transition: all 0.3s ease;
                display: block;
            ">
                <div style="position: relative; width: 100%; height: 180px; background: #f3f4f6;">
                    <img src="${video.thumbnail}" alt="${video.title}" 
                         style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.src='https://via.placeholder.com/400x225/3b82f6/ffffff?text=Watch+Video'">
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 3.5rem; color: white; text-shadow: 0 2px 10px rgba(0,0,0,0.7);">
                        <i class="fas fa-play-circle"></i>
                    </div>
                    <span style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px;">
                        ${video.duration}
                    </span>
                    ${isWatched ? '<span style="position: absolute; top: 8px; right: 8px; background: #22c55e; color: white; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px;">✅ Watched</span>' : ''}
                </div>
                <div style="padding: 1rem;">
                    <h4 style="font-weight: 600; color: #1f2937; margin-bottom: 0.25rem; font-size: 1rem;">${video.title}</h4>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: #6b7280;">
                        <span style="color: #16a34a; font-weight: 600;">💰 +Ksh ${video.reward}</span>
                        <span style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; ${isWatched ? 'background: #dcfce7; color: #166534;' : 'background: #fef3c7; color: #92400e;'}">
                            ${isWatched ? '✅ Watched' : '📺 Watch'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    });

    grid.innerHTML = cardsHTML;
    console.log('✅ Videos rendered:', filteredVideos.length);
}

// Filter videos
function filterVideos(category) {
    console.log(`🔍 Filtering videos: ${category}`);
    currentCategory = category;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
    
    renderVideos(category);
}

// Open video modal
function openVideo(videoId) {
    console.log(`🎬 Opening video: ${videoId}`);
    
    const video = videoData.find(v => v.id === videoId);
    if (!video) {
        showToast('Video not found', 'error');
        return;
    }

    currentVideo = video;

    const modal = document.getElementById('videoModal');
    if (!modal) {
        console.error('❌ videoModal not found');
        showToast('Video modal not found', 'error');
        return;
    }

    // Populate modal
    const titleEl = document.getElementById('videoModalTitle');
    const descEl = document.getElementById('videoModalDescription');
    const rewardEl = document.getElementById('videoModalReward');
    const playerEl = document.getElementById('videoPlayer');
    
    if (titleEl) titleEl.textContent = video.title;
    if (descEl) descEl.textContent = video.description;
    if (rewardEl) rewardEl.textContent = `Ksh ${video.reward}`;
    
    if (playerEl) {
        playerEl.src = `https://www.youtube.com/embed/${video.youtubeId}?autoplay=0&rel=0`;
    }

    const isWatched = watchedVideos.some(v => v.id === videoId);
    const watchBtn = document.getElementById('videoWatchBtn');
    
    if (watchBtn) {
        if (isWatched) {
            watchBtn.textContent = '✅ Already Watched';
            watchBtn.disabled = true;
            watchBtn.className = 'bg-gray-400 text-white px-6 py-2.5 rounded-lg cursor-not-allowed';
        } else {
            watchBtn.textContent = '✅ Mark as Watched';
            watchBtn.disabled = false;
            watchBtn.className = 'bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition';
            watchBtn.onclick = () => markVideoWatched();
        }
    }

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Close video modal
function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
    
    const player = document.getElementById('videoPlayer');
    if (player) {
        player.src = '';
    }
    
    document.body.style.overflow = '';
}

// Mark video as watched
async function markVideoWatched() {
    if (!currentVideo) {
        showToast('No video selected', 'error');
        return;
    }

    if (watchedVideos.some(v => v.id === currentVideo.id)) {
        showToast('You already watched this video!', 'info');
        return;
    }

    const token = getToken();
    if (!token) {
        showToast('Please login first', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/videos/${currentVideo.id}/watch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const rewardAmount = data.reward || currentVideo.reward;
            
            // Update local data
            currentVideo.is_watched = true;
            watchedVideos.push(currentVideo);
            videoTotalEarnings += rewardAmount;
            
            // Save to localStorage
            localStorage.setItem('watchedVideos', JSON.stringify(watchedVideos));
            localStorage.setItem('videoEarnings', videoTotalEarnings.toString());
            
            // Update UI
            updateVideoStats();
            renderVideos(currentCategory);
            
            // Update modal button
            const watchBtn = document.getElementById('videoWatchBtn');
            if (watchBtn) {
                watchBtn.textContent = '✅ Already Watched';
                watchBtn.disabled = true;
                watchBtn.className = 'bg-gray-400 text-white px-6 py-2.5 rounded-lg cursor-not-allowed';
            }

            // Refresh wallet and earnings
            loadWalletBalance();
            loadEarnings();

            showToast(`🎉 You earned Ksh ${rewardAmount}!`, 'success');
            
            setTimeout(() => {
                closeVideoModal();
            }, 2000);
        } else {
            showToast(data.error || 'Error marking video as watched', 'error');
        }
    } catch (error) {
        console.error('❌ Error marking video as watched:', error);
        showToast('Error processing video. Please try again.', 'error');
    }
}

// ============================================
// WITHDRAWAL FUNCTIONS - COMPLETE WORKING
// ============================================

function setWithdrawAmount(amount) {
    const input = document.getElementById('withdrawAmount');
    if (input) input.value = amount;
}

function formatWithdrawPhone(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return null;
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
        // Already formatted
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
        cleaned = '254' + cleaned;
    }
    if (!cleaned.startsWith('254') || cleaned.length !== 12) {
        return null;
    }
    return cleaned;
}

function isValidWithdrawPhone(phone) {
    if (!phone) return false;
    const cleaned = phone.replace(/\D/g, '');
    const withoutPrefix = cleaned.replace(/^(254|0)/, '');
    return withoutPrefix.length === 9 && /^[17]\d{8}$/.test(withoutPrefix);
}

async function requestWithdrawal() {
    console.log('💰 Withdrawal button clicked!');
    showToast('Processing withdrawal request...', 'info');
    
    // Get phone number
    const phoneInput = document.getElementById('withdrawPhone');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    
    // Get amount
    const amountInput = document.getElementById('withdrawAmount');
    const amount = parseFloat(amountInput ? amountInput.value : 0);
    
    console.log('📱 Phone:', phone);
    console.log('💰 Amount:', amount);
    
    // ✅ VALIDATE PHONE
    if (!phone || phone.length < 7) {
        showToast('Please enter your M-PESA phone number', 'error');
        if (phoneInput) phoneInput.focus();
        return;
    }
    
    const formattedPhone = formatWithdrawPhone(phone);
    if (!formattedPhone || !isValidWithdrawPhone(phone)) {
        showToast('Please enter a valid Safaricom phone number (e.g., 712345678)', 'error');
        if (phoneInput) phoneInput.focus();
        return;
    }
    
    // ✅ VALIDATE AMOUNT
    if (!amount || isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        if (amountInput) amountInput.focus();
        return;
    }
    
    if (amount < 300) {
        showToast('❌ Minimum withdrawal is Ksh 300', 'error');
        if (amountInput) amountInput.focus();
        return;
    }
    
    if (amount > 50000) {
        showToast('❌ Maximum withdrawal is Ksh 50,000 per request', 'error');
        if (amountInput) amountInput.focus();
        return;
    }
    
    // ✅ CHECK TOKEN
    const token = getToken();
    if (!token) {
        showToast('Please login first', 'error');
        window.location.href = 'index.html';
        return;
    }
    
    // ✅ DISABLE BUTTON
    const button = document.getElementById('withdrawBtn');
    if (!button) {
        console.error('❌ Withdraw button not found!');
        showToast('Error: Withdraw button not found', 'error');
        return;
    }
    
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
    button.className = 'w-full bg-gray-400 text-white py-3 rounded-lg font-semibold cursor-not-allowed flex items-center justify-center gap-2';
    
    try {
        console.log('📡 Sending withdrawal request...');
        
        const response = await fetch(`${API_BASE}/wallet/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                amount: amount,
                phone: formattedPhone
            })
        });
        
        const data = await response.json();
        console.log('📡 Withdrawal response:', data);
        
        // ✅ SHOW RESPONSE
        if (data.success) {
            showToast(`✅ ${data.message}`, 'success');
            if (amountInput) amountInput.value = '';
            if (phoneInput) phoneInput.value = '7';
            
            // Refresh data
            setTimeout(() => {
                loadWalletBalance();
                loadWithdrawals();
            }, 1500);
        } else {
            showToast(`❌ ${data.error || 'Withdrawal failed'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Withdrawal error:', error);
        showToast('❌ Withdrawal failed. Please try again.', 'error');
    } finally {
        // ✅ RE-ENABLE BUTTON
        button.disabled = false;
        button.innerHTML = originalText;
        button.className = 'w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2';
    }
}
// Load withdrawals history
async function loadWithdrawals() {
    console.log('📋 Loading withdrawals...');
    
    try {
        const token = getToken();
        if (!token) return;
        
        const response = await fetch(`${API_BASE}/wallet/withdrawals`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📋 Withdrawals data:', data);
        
        const tbody = document.getElementById('withdrawalHistoryTable');
        if (!tbody) {
            console.warn('⚠️ withdrawalHistoryTable not found');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (data.success && data.withdrawals && data.withdrawals.length > 0) {
            data.withdrawals.forEach(wd => {
                let statusColor = '';
                let statusText = '';
                
                switch(wd.status) {
                    case 'pending':
                        statusColor = 'text-yellow-600';
                        statusText = '⏳ Pending Approval';
                        break;
                    case 'processing':
                        statusColor = 'text-blue-600';
                        statusText = '🔄 Processing...';
                        break;
                    case 'approved':
                    case 'completed':
                        statusColor = 'text-green-600';
                        statusText = '✅ Completed';
                        break;
                    case 'failed':
                    case 'rejected':
                        statusColor = 'text-red-600';
                        statusText = '❌ Failed';
                        break;
                    case 'cancelled':
                        statusColor = 'text-gray-600';
                        statusText = '❌ Cancelled';
                        break;
                    default:
                        statusColor = 'text-gray-600';
                        statusText = wd.status || 'Unknown';
                }
                
                // Format phone number for display
                const displayPhone = wd.phone ? wd.phone.replace(/^254/, '0') : 'N/A';
                
                tbody.innerHTML += `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm">${formatDate(wd.created_at)}</td>
                        <td class="px-4 py-3 text-sm">${displayPhone}</td>
                        <td class="px-4 py-3 font-semibold">${formatMoney(wd.amount)}</td>
                        <td class="px-4 py-3 ${statusColor} text-sm font-medium">${statusText}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-8 text-gray-500">
                        <i class="fas fa-arrow-up text-2xl mb-2 block"></i>
                        <p>No withdrawal requests yet</p>
                        <p class="text-sm mt-1">Withdraw your earnings when you reach Ksh 300</p>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('❌ Error loading withdrawals:', error);
        const tbody = document.getElementById('withdrawalHistoryTable');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-8 text-red-500">
                        <i class="fas fa-exclamation-circle text-2xl mb-2 block"></i>
                        <p>Error loading withdrawals</p>
                        <p class="text-sm mt-1">Please refresh the page</p>
                    </td>
                </tr>
            `;
        }
    }
}



// ============================================
// DEPOSIT FUNCTIONS - USER ENTERS PHONE
// ============================================

// Open deposit modal
function openDepositModal() {
    console.log('💰 Opening deposit modal...');
    const modal = document.getElementById('depositModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.getElementById('depositAmount').value = '';
        document.getElementById('depositPhone').value = '7';
        document.getElementById('depositPhone').focus();
    } else {
        console.error('❌ Deposit modal not found!');
        showToast('Error: Deposit modal not found', 'error');
    }
}

// Close deposit modal
function closeDepositModal() {
    console.log('💰 Closing deposit modal...');
    const modal = document.getElementById('depositModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// Set quick deposit amount
function setDepositAmount(amount) {
    document.getElementById('depositAmount').value = amount;
}

// Format phone number for M-PESA
function formatPhoneForMpesa(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, remove it and add 254
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
    }
    // If starts with 254, keep as is
    else if (cleaned.startsWith('254')) {
        // Already formatted
    }
    // If starts with 7 or 1 (Safaricom prefix), add 254
    else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
        cleaned = '254' + cleaned;
    }
    // If less than 9 digits, it's invalid
    else if (cleaned.length < 9) {
        return null;
    }
    
    console.log(`📱 Phone formatted: ${phone} -> ${cleaned}`);
    return cleaned;
}

// Validate phone number
function isValidPhone(phone) {
    if (!phone) return false;
    const cleaned = phone.replace(/\D/g, '');
    // Must be 9 digits (after removing 0 or 254)
    const withoutPrefix = cleaned.replace(/^(254|0)/, '');
    // Safaricom numbers start with 7 or 1
    return withoutPrefix.length === 9 && /^[17]\d{8}$/.test(withoutPrefix);
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');

    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }

    const player = document.getElementById('videoPlayer');

    if (player) {
        player.src = '';
    }

    document.body.style.overflow = 'auto';
}

// Process deposit
async function processDeposit() {
    console.log('💰 Processing deposit...');
    
    // Get amount
    const amountInput = document.getElementById('depositAmount');
    const amount = parseInt(amountInput ? amountInput.value : 0);
    
    // Get phone number from user input
    const phoneInput = document.getElementById('depositPhone');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    
    console.log('📱 Phone entered:', phone);
    console.log('💰 Amount entered:', amount);
    
    // Validate amount
    if (!amount || amount < 10) {
        showToast('Please enter a valid amount (minimum Ksh 10)', 'error');
        return;
    }
    
    if (amount > 150000) {
        showToast('Maximum deposit is Ksh 150,000', 'error');
        return;
    }
    
    // Validate phone
    if (!phone || phone.length < 7) {
        showToast('Please enter a valid phone number', 'error');
        return;
    }
    
    // Format phone number
    const formattedPhone = formatPhoneForMpesa(phone);
    if (!formattedPhone || !isValidPhone(phone)) {
        showToast('Please enter a valid Safaricom phone number (e.g., 712345678)', 'error');
        return;
    }
    
    console.log('📱 Formatted phone for M-PESA:', formattedPhone);
    
    // Check token
    const token = getToken();
    if (!token) {
        showToast('Please login first', 'error');
        return;
    }
    
    // Disable button
    const btn = document.getElementById('depositBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
    
    try {
        const response = await fetch(`${API_BASE}/wallet/deposit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                amount: amount,
                phone: formattedPhone 
            })
        });
        
        const data = await response.json();
        console.log('Deposit response:', data);
        
        if (data.success) {
            showToast(`📱 STK Push sent to ${formattedPhone}! Check your phone.`, 'success');
            closeDepositModal();
            
            // Refresh balance after a few seconds
            setTimeout(() => {
                loadWalletBalance();
                loadSpinData();
            }, 5000);
        } else {
            showToast(data.error || 'Deposit failed', 'error');
        }
    } catch (error) {
        console.error('Deposit error:', error);
        showToast('Error processing deposit', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Close modal on outside click
document.addEventListener('click', function(e) {
    const modal = document.getElementById('depositModal');
    if (e.target === modal) {
        closeDepositModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeDepositModal();
    }
});

// Make functions globally available
window.openDepositModal = openDepositModal;
window.closeDepositModal = closeDepositModal;
window.setDepositAmount = setDepositAmount;
window.processDeposit = processDeposit;

// Make functions globally available
window.requestWithdrawal = requestWithdrawal;
window.loadWithdrawals = loadWithdrawals;
window.setWithdrawAmount = setWithdrawAmount;

// Make functions globally available
window.loadVideos = loadVideos;
window.renderVideos = renderVideos;
window.filterVideos = filterVideos;
window.openVideo = openVideo;
window.closeVideoModal = closeVideoModal;
window.markVideoWatched = markVideoWatched;
window.updateVideoStats = updateVideoStats;
window.getFallbackVideos = getFallbackVideos;

// Make functions globally available
window.openBlogModal = openBlogModal;
window.closeBlogModal = closeBlogModal;
window.markBlogAsRead = markBlogAsRead;
window.loadBlogData = loadBlogData;
window.loadBlogProgress = loadBlogProgress;
window.loadRewardHistory = loadRewardHistory;

window.loadVideos = loadVideos;
window.renderVideos = renderVideos;
window.filterVideos = filterVideos;
window.openVideo = openVideo;
window.closeVideoModal = closeVideoModal;
window.markVideoWatched = markVideoWatched;
window.updateVideoStats = updateVideoStats;
window.checkVideoElements = checkVideoElements;
window.forceRenderVideos = forceRenderVideos;
window.renderVideosManually = renderVideosManually;


// Make functions globally available
window.requestWithdrawal = requestWithdrawal;
window.loadWithdrawals = loadWithdrawals;

// ============================================
// MAKE FUNCTIONS GLOBALLY AVAILABLE
// ============================================


window.copyReferralLink = copyReferralLink;
window.shareReferral = shareReferral;
window.requestWithdrawal = requestWithdrawal;
window.showSection = showSection;
window.toggleSidebar = toggleSidebar;
window.logout = logout;


document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Dashboard DOM loaded');
    
    const token = getToken();
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    loadDashboard();
    
    // ✅ ATTACH WITHDRAW BUTTON EVENT
    const withdrawBtn = document.getElementById('withdrawBtn');
    console.log('🔍 Withdraw button found:', !!withdrawBtn);
    
    if (withdrawBtn) {
        // Remove any existing listeners by cloning
        const newBtn = withdrawBtn.cloneNode(true);
        withdrawBtn.parentNode.replaceChild(newBtn, withdrawBtn);
        
        // Add click listener
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('💰 Withdraw button clicked!');
            requestWithdrawal();
        });
        console.log('✅ Withdrawal button event attached');
    } else {
        console.warn('⚠️ Withdrawal button not found');
    }
});