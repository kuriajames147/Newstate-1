// backend/data/videos.js
// Static video data for Watch & Earn section

const VIDEO_DATA = {
    1: {
        id: 1,
        title: 'How to Share Your Referral Link',
        category: 'tutorial',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Learn how to share your referral link and start earning commissions!',
        reward: 5,
        duration: '2:30'
    },
    2: {
        id: 2,
        title: 'Success Story: How I Earned Ksh 10,000',
        category: 'success',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Watch how one of our users earned Ksh 10,000 in just one month!',
        reward: 5,
        duration: '3:45'
    },
    3: {
        id: 3,
        title: '5 Tips to Get More Referrals',
        category: 'tips',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Proven strategies to increase your referral count and earnings.',
        reward: 5,
        duration: '4:20'
    },
    4: {
        id: 4,
        title: 'Understanding Your Dashboard',
        category: 'tutorial',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'A complete walkthrough of your dashboard and all its features.',
        reward: 5,
        duration: '5:00'
    },
    5: {
        id: 5,
        title: 'From Zero to Hero: Referral Journey',
        category: 'success',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Follow a user\'s journey from registration to earning their first Ksh 1,000.',
        reward: 5,
        duration: '6:15'
    },
    6: {
        id: 6,
        title: 'Maximize Your Earnings Every Day',
        category: 'tips',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Daily habits that will help you maximize your referral earnings.',
        reward: 5,
        duration: '3:30'
    }
};

// Convert to array for easier use
const VIDEOS_ARRAY = Object.values(VIDEO_DATA);

module.exports = { VIDEO_DATA, VIDEOS_ARRAY };