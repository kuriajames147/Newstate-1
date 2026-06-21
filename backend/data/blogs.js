// backend/data/blogs.js
// Static blog data for 7-Day Reading Challenge

const BLOG_CONTENT = {
    1: {
        day: 1,
        title: 'Welcome to Newstatehela Community! ',
        readTime: 5,
        category: 'Getting Started',
        content: `
            <h2>Welcome to the Community!</h2>
            <p>Congratulations on joining <strong>Newstatehela</strong>! This is the start of your earning journey.</p>
            
            <h3>What is Newstatehela?</h3>
            <p>We are a platform that rewards you for sharing opportunities with your network. Every time you refer someone who joins and pays the registration fee, you earn <strong>Ksh 120</strong>.</p>
            
            <h3>How It Works</h3>
            <ul>
                <li> Share your unique referral link</li>
                <li> Friends register using your link</li>
                <li> They pay Ksh 300 activation fee</li>
                <li> You earn Ksh 120 commission instantly</li>
            </ul>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
                <p class="font-semibold"> Tip:</p>
                <p>Share your link on social media, WhatsApp groups, and with friends and family!</p>
            </div>
            
            <h3>What You'll Learn This Week</h3>
            <ul>
                <li>Day 1: Welcome & Getting Started (Today!)</li>
                <li>Day 2: How to Maximize Your Referrals</li>
                <li>Day 3: Understanding Your Wallet & Earnings</li>
                <li>Day 4: Spin & Win - Your Daily Rewards</li>
                <li>Day 5: Building a Referral Network</li>
                <li>Day 6: Tips for Successful Withdrawals</li>
                <li>Day 7: Congratulations! You Completed the Challenge</li>
            </ul>
            
            <p class="mt-4"><strong>Ready to start earning?</strong> Complete all 7 days and earn <strong>Ksh 30 bonus</strong>! 🚀</p>
        `
    },
    2: {
        day: 2,
        title: 'How to Maximize Your Referrals ',
        readTime: 6,
        category: 'Referral Tips',
        content: `
            <h2>Referral Strategies That Work</h2>
            <p>Here are proven strategies to get more referrals and increase your earnings.</p>
            
            <h3>1️⃣ Share on Social Media</h3>
            <p>Post your referral link on Facebook, Twitter, Instagram, and LinkedIn. Share your success story and how much you've earned.</p>
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
                <p class="font-semibold">📱 Social Media Tips:</p>
                <ul>
                    <li>Post at peak hours (7-9 PM)</li>
                    <li>Use eye-catching images</li>
                    <li>Share your earnings screenshots</li>
                    <li>Tag friends who might be interested</li>
                </ul>
            </div>
            
            <h3>2️⃣ WhatsApp Groups</h3>
            <p>Share in WhatsApp groups where people are looking for earning opportunities. Be helpful and genuine.</p>
            
            <h3>3️⃣ Personal Network</h3>
            <p>Reach out to friends and family directly. A personal recommendation is the most powerful referral.</p>
            
            <h3>4️⃣ Create Content</h3>
            <p>Write about your experience or create a short video explaining how the platform works.</p>
            
            <div class="bg-green-50 border-l-4 border-green-400 p-4 my-4">
                <p class="font-semibold"> Quick Tip:</p>
                <p>Share your referral link with at least 5 people today!</p>
            </div>
            
            <p class="mt-4"><strong>Remember:</strong> The more you share, the more you earn. Keep going! </p>
        `
    },
    3: {
        day: 3,
        title: 'Understanding Your Wallet & Earnings ',
        readTime: 5,
        category: 'Wallet Guide',
        content: `
            <h2>Your Wallet Explained</h2>
            <p>Your wallet is where all your earnings are stored. Here's how to manage it effectively.</p>
            
            <h3>What You'll See</h3>
            <ul>
                <li><strong> Balance:</strong> Your available funds for withdrawal</li>
                <li><strong> Total Earnings:</strong> All money you've earned over time</li>
                <li><strong> Withdrawal History:</strong> All past withdrawals</li>
                <li><strong> Earnings Breakdown:</strong> See earnings by source</li>
            </ul>
            
            <h3>How Earnings Are Added</h3>
            <ul>
                <li> <strong>Referrals:</strong> Ksh 120 per successful referral</li>
                <li> <strong>Blog Challenge:</strong> Ksh 30 for completing 7-day challenge</li>
                <li> <strong>Spin & Win:</strong> 0, 20, 30, 50, or 100 Ksh</li>
            </ul>
            
            <div class="bg-purple-50 border-l-4 border-purple-400 p-4 my-4">
                <p class="font-semibold"> Did You Know?</p>
                <p>You can view your earnings breakdown by source in the Earnings section!</p>
            </div>
            
            <h3>Withdrawing Your Money</h3>
            <ul>
                <li>✅ Minimum withdrawal: <strong>Ksh 300</strong></li>
                <li>✅ Maximum withdrawal: <strong>Ksh 50,000</strong> per request</li>
                <li>✅ Funds sent via <strong>M-PESA</strong></li>
                <li>✅ Processed within <strong>24-48 hours</strong></li>
            </ul>
            
            <p class="mt-4"><strong>Pro Tip:</strong> Keep building your balance for bigger withdrawals!</p>
        `
    },
    4: {
        day: 4,
        title: 'Spin & Win - Your Daily Rewards ',
        readTime: 5,
        category: 'Spin & Win',
        content: `
            <h2>Spin & Win: Fun Rewards</h2>
            <p>Every Monday, you get a <strong>free spin</strong>! Plus, you can use your wallet balance for extra spins.</p>
            
            <h3>How to Spin</h3>
            <ol>
                <li>1️⃣ Go to the <strong>Spin & Win</strong> section</li>
                <li>2️⃣ Click "Spin" or use your free spin</li>
                <li>3️⃣ Watch the wheel spin!</li>
                <li>4️⃣ Win instant cash rewards</li>
            </ol>
            
            <h3>Prize Breakdown</h3>
            <ul>
                <li><span class="text-red-500">🔴 Ksh 0:</span> Better luck next time!</li>
                <li><span class="text-yellow-500">🟡 Ksh 20:</span> Small win</li>
                <li><span class="text-orange-400">🟠 Ksh 30:</span> Medium win</li>
                <li><span class="text-green-500">🟢 Ksh 50:</span> Big win </li>
                <li><span class="text-purple-500">🟣 Ksh 100:</span> Jackpot! </li>
            </ul>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
                <p class="font-semibold">⚠️ Important Notice:</p>
                <p>Ksh 50 and Ksh 100 are locked for the first 4 months after registration. This is to ensure fair play for all new users.</p>
            </div>
            
            <h3>Free Spin Schedule</h3>
            <ul>
                <li> <strong>First Spin:</strong> Free when you activate your account</li>
                <li><strong>Weekly Spin:</strong> Free spin every Monday</li>
                <li> <strong>Extra Spins:</strong> Buy more spins for Ksh 20 each</li>
            </ul>
            
            <p class="mt-4"><strong>Don't forget:</strong> Check back every Monday for your free spin! </p>
        `
    },
    5: {
        day: 5,
        title: 'Building a Referral Network ',
        readTime: 6,
        category: 'Networking',
        content: `
            <h2>Build Your Referral Network</h2>
            <p>A strong network = consistent earnings. Here's how to build yours.</p>
            
            <h3>1️⃣ Start with Friends & Family</h3>
            <p>Your inner circle is the easiest place to start. They already trust you and are more likely to join.</p>
            
            <h3>2️⃣ Expand to Social Groups</h3>
            <p>Join Facebook groups, WhatsApp groups, and Telegram channels focused on side income and opportunities.</p>
            
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
                <p class="font-semibold">🌐 Best Platforms to Share:</p>
                <ul>
                    <li>📱 WhatsApp Status & Groups</li>
                    <li>📘 Facebook Groups</li>
                    <li>📸 Instagram Stories</li>
                    <li>💼 LinkedIn Network</li>
                    <li>🐦 Twitter/X</li>
                </ul>
            </div>
            
            <h3>3️⃣ Become a Leader</h3>
            <p>Help your referrals succeed. The more they earn, the more they'll refer others, creating a chain of earnings.</p>
            
            <h3>4️⃣ Track Your Progress</h3>
            <p>Use the leaderboard to see how you rank. Compete with others and aim for the top!</p>
            
            <div class="bg-green-50 border-l-4 border-green-400 p-4 my-4">
                <p class="font-semibold">Challenge:</p>
                <p>Try to get 3 new referrals this week. You can do it!</p>
            </div>
            
            <p class="mt-4"><strong>Remember:</strong> Every referral brings you closer to your financial goals! 🌟</p>
        `
    },
    6: {
        day: 6,
        title: 'Tips for Successful Withdrawals ',
        readTime: 5,
        category: 'Withdrawals',
        content: `
            <h2>Withdrawal Tips & Best Practices</h2>
            <p>Get your money smoothly with these withdrawal tips.</p>
            
            <h3>Before You Withdraw</h3>
            <ul>
                <li>✅ Ensure your phone number is correct</li>
                <li>✅ Check that you have at least <strong>Ksh 300</strong></li>
                <li>✅ Verify your M-PESA account is active</li>
                <li>✅ Double-check the withdrawal amount</li>
            </ul>
            
            <h3>During Withdrawal</h3>
            <ul>
                <li>💰 Enter the amount you want to withdraw</li>
                <li>⏳ Wait for admin approval (usually within 24 hours)</li>
                <li>📱 Check your M-PESA messages for confirmation</li>
            </ul>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
                <p class="font-semibold"> Withdrawal Timeline:</p>
                <ul>
                    <li> Request submitted: Instant</li>
                    <li> Admin review: 0-24 hours</li>
                    <li> Funds sent: 24-48 hours</li>
                    <li> M-PESA confirmation: Instant</li>
                </ul>
            </div>
            
            <h3>After Withdrawal</h3>
            <ul>
                <li> Check your wallet balance updates</li>
                <li> View your withdrawal history</li>
                <li> Continue earning for your next withdrawal</li>
            </ul>
            
            <div class="bg-green-50 border-l-4 border-green-400 p-4 my-4">
                <p class="font-semibold">💡 Pro Tip:</p>
                <p>Build up to Ksh 500 or more before withdrawing to maximize your earnings!</p>
            </div>
            
            <p class="mt-4"><strong>Note:</strong> Withdrawals are processed within 24-48 hours. Be patient! </p>
        `
    },
    7: {
        day: 7,
        title: ' Congratulations! You Completed the Challenge!',
        readTime: 5,
        category: 'Congratulations',
        content: `
            <h2> You Did It! </h2>
            <p>Congratulations on completing all 7 days of the blog reading challenge!</p>
            
            <div class="bg-green-50 border-2 border-green-400 rounded-lg p-6 my-6 text-center">
                <p class="text-4xl mb-2">🏆</p>
                <h3 class="text-xl font-bold text-green-700">You've Earned Ksh 30 Bonus!</h3>
                <p class="text-gray-600">This reward has been added to your wallet automatically.</p>
            </div>
            
            <h3>What You've Achieved</h3>
            <ul>
                <li>✅ Read 7 informative blogs</li>
                <li>✅ Learned about referrals, earnings, and withdrawals</li>
                <li>✅ Earned <strong>Ksh 30</strong> bonus</li>
                <li>✅ Built knowledge to maximize your earnings</li>
            </ul>
            
            <h3>What's Next?</h3>
            <p>Keep sharing your referral link and earning commissions. The more people you refer, the more you earn!</p>
            
            <div class="bg-purple-50 border-l-4 border-purple-400 p-4 my-4">
                <p class="font-semibold"> Quick Actions:</p>
                <ul>
                    <li> Share your referral link now</li>
                    <li> Try your luck with Spin & Win</li>
                    <li> Check your wallet balance</li>
                    <li> View your earnings report</li>
                </ul>
            </div>
            
            <h3>Weekly Challenge Continues!</h3>
            <p>You can complete this challenge every week to earn <strong>Ksh 30</strong> each time!</p>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
                <p class="font-semibold"> Did You Know?</p>
                <p>You can earn Ksh 30 every single week by completing this challenge. That's Ksh 120 per month just for reading!</p>
            </div>
            
            <p class="mt-4 text-center text-lg"><strong> Keep going, keep earning, and keep growing! </strong></p>
        `
    }
};

// Export the content - FIXED EXPORT
module.exports = { BLOG_CONTENT };