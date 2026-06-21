// backend/services/earningsService.js
const pool = require('../config/db');

class EarningsService {
    
    // Record any type of earning
    async recordEarning(userId, amount, type, description, referralId = null, sourceId = null) {
        try {
            const validTypes = ['commission', 'spin_earning', 'video_earning', 'blog_earning'];
            if (!validTypes.includes(type)) {
                throw new Error(`Invalid earning type: ${type}`);
            }
            
            // Insert into earnings table
            const result = await pool.query(
                `INSERT INTO earnings (user_id, referral_id, amount, type, description, source_id, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                 RETURNING id`,
                [userId, referralId, amount, type, description, sourceId]
            );
            
            // CRITICAL: Update user's total earnings immediately
            await this.updateUserTotalEarnings(userId);
            
            console.log(`✅ Earning recorded: ${type} - Ksh ${amount} for user ${userId}`);
            return result.rows[0].id;
        } catch (error) {
            console.error('Error recording earning:', error);
            throw error;
        }
    }
    
    // Update user's total earnings from the earnings table
    async updateUserTotalEarnings(userId) {
        try {
            const result = await pool.query(
                `SELECT COALESCE(SUM(amount), 0) as total 
                 FROM earnings 
                 WHERE user_id = $1`,
                [userId]
            );
            
            const totalEarnings = parseFloat(result.rows[0].total);
            
            // Update user's total_earnings
            await pool.query(
                'UPDATE users SET total_earnings = $1 WHERE id = $2',
                [totalEarnings, userId]
            );
            
            console.log(`📊 Updated total earnings for user ${userId}: Ksh ${totalEarnings}`);
            return totalEarnings;
        } catch (error) {
            console.error('Error updating total earnings:', error);
            throw error;
        }
    }
    
    // Get all earnings for a user with category breakdown
    async getUserEarnings(userId) {
        try {
            const result = await pool.query(
                `SELECT 
                    id,
                    amount,
                    type,
                    description,
                    created_at,
                    CASE 
                        WHEN type = 'commission' THEN 'Referral Commission'
                        WHEN type = 'spin_earning' THEN 'Spin & Win'
                        WHEN type = 'video_earning' THEN 'Watch & Earn'
                        WHEN type = 'blog_earning' THEN 'Read & Earn'
                        ELSE 'Other'
                    END as category,
                    CASE 
                        WHEN type = 'commission' THEN '👥'
                        WHEN type = 'spin_earning' THEN '🎡'
                        WHEN type = 'video_earning' THEN '🎬'
                        WHEN type = 'blog_earning' THEN '📝'
                        ELSE '💰'
                    END as icon
                 FROM earnings 
                 WHERE user_id = $1 
                 ORDER BY created_at DESC`,
                [userId]
            );
            
            // Get totals by category
            const totals = await pool.query(
                `SELECT 
                    type,
                    SUM(amount) as total
                 FROM earnings 
                 WHERE user_id = $1 
                 GROUP BY type`,
                [userId]
            );
            
            const totalsByType = {};
            totals.rows.forEach(row => {
                totalsByType[row.type] = parseFloat(row.total);
            });
            
            return {
                earnings: result.rows,
                totals: {
                    commission: totalsByType.commission || 0,
                    spin_earning: totalsByType.spin_earning || 0,
                    video_earning: totalsByType.video_earning || 0,
                    blog_earning: totalsByType.blog_earning || 0,
                    total: result.rows.reduce((sum, e) => sum + parseFloat(e.amount), 0)
                }
            };
        } catch (error) {
            console.error('Error getting user earnings:', error);
            throw error;
        }
    }
    
    // Fix all users' total earnings (run once to fix existing data)
    async fixAllUsersTotalEarnings() {
        try {
            const users = await pool.query('SELECT id FROM users');
            
            for (const user of users.rows) {
                await this.updateUserTotalEarnings(user.id);
            }
            
            console.log(`✅ Fixed total earnings for ${users.rows.length} users`);
            return users.rows.length;
        } catch (error) {
            console.error('Error fixing total earnings:', error);
            throw error;
        }
    }
}

module.exports = new EarningsService();