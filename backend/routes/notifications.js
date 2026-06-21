// backend/routes/notifications.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();

// Create a notification (NOT an async IIFE - just a function declaration)
async function createNotification(userId, type, title, message, data = null) {
    try {
        const result = await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, data, created_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
             RETURNING id`,
            [userId, type, title, message, data ? JSON.stringify(data) : null]
        );
        
        console.log(`🔔 Notification created for user ${userId}: ${title}`);
        return result.rows[0].id;
    } catch (err) {
        console.error('Error creating notification:', err);
        return null;
    }
}

// Get user's notifications
router.get('/', authenticate, async (req, res) => {
    const userId = req.user.id;
    const { limit = 50, offset = 0, unread_only = false } = req.query;
    
    try {
        let query = `
            SELECT id, type, title, message, data, is_read, created_at
            FROM notifications
            WHERE user_id = $1
        `;
        const params = [userId];
        
        if (unread_only === 'true') {
            query += ` AND is_read = false`;
        }
        
        query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        // Get unread count
        const unreadResult = await pool.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
            [userId]
        );
        
        res.json({
            success: true,
            notifications: result.rows,
            unreadCount: parseInt(unreadResult.rows[0].count),
            total: result.rows.length
        });
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: err.message });
    }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
        await pool.query(
            'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark all notifications as read
router.put('/read-all', authenticate, async (req, res) => {
    const userId = req.user.id;
    
    try {
        await pool.query(
            'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
            [userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
        await pool.query(
            'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get unread count (for badge)
router.get('/unread-count', authenticate, async (req, res) => {
    const userId = req.user.id;
    
    try {
        const result = await pool.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
            [userId]
        );
        res.json({ success: true, unreadCount: parseInt(result.rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export both the router and the createNotification function
module.exports = { createNotification, router };