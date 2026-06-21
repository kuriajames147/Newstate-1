// backend/routes/videos.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const pool = require('../config/db');
const { VIDEO_DATA, VIDEOS_ARRAY } = require('../data/videos');
const router = express.Router();

// ============================================
// VIDEO SYSTEM - USING STATIC DATA
// ============================================

// Get all videos
// backend/routes/videos.js - Updated with error handling

// Get all videos
router.get('/all', authenticate, async (req, res) => {
    try {
        console.log('🎬 Sending videos from data file:', VIDEOS_ARRAY.length);
        
        let watchedIds = [];
        
        try {
            // Try to get watched videos
            const watchedResult = await pool.query(
                'SELECT video_id FROM video_watches WHERE user_id = $1',
                [req.user.id]
            );
            watchedIds = watchedResult.rows.map(row => row.video_id);
        } catch (dbError) {
            // If table doesn't exist, just use empty array
            console.log('⚠️ video_watches table not found, using empty watched list');
            watchedIds = [];
        }
        
        // Add is_watched status
        const videos = VIDEOS_ARRAY.map(video => ({
            ...video,
            is_watched: watchedIds.includes(video.id)
        }));

        res.json({
            success: true,
            videos: videos
        });
    } catch (error) {
        console.error('❌ Error getting all videos:', error);
        res.status(500).json({ 
            error: 'Failed to load videos',
            details: error.message 
        });
    }
});
module.exports = router;