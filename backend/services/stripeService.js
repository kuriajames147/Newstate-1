// backend/services/stripeService.js
const stripe = require('../config/stripe');
const pool = require('../config/db');

class StripeService {
  
  // Generate unique reference
  generateReference(userId) {
    return `REF_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  // Create a payment intent for activation fee
  async createActivationPaymentIntent(userId, email, amount = 200) {
    try {
      const reference = this.generateReference(userId);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Stripe uses cents (Ksh 200 = 20000 cents)
        currency: 'kes',
        metadata: {
          user_id: userId,
          type: 'activation',
          reference: reference
        },
        receipt_email: email,
        description: 'Account Activation Fee - Referral System'
      });
      
      // Save pending transaction
      await pool.query(
        `INSERT INTO transactions (user_id, type, amount, status, checkout_request_id, description) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, 'activation', amount, 'pending', paymentIntent.id, 'Stripe activation payment pending']
      );
      
      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        reference: reference
      };
      
    } catch (error) {
      console.error('Stripe payment intent error:', error);
      throw new Error(error.message);
    }
  }
  
  // Confirm payment (called by webhook)
  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const userId = paymentIntent.metadata.user_id;
        const amount = paymentIntent.amount / 100; // Convert back from cents
        const reference = paymentIntent.metadata.reference;
        
        // Update transaction
        await pool.query(
          `UPDATE transactions 
           SET status = $1, mpesa_receipt = $2, description = $3 
           WHERE checkout_request_id = $4 AND status = $5`,
          ['completed', paymentIntent.id, 'Payment successful via Stripe', paymentIntentId, 'pending']
        );
        
        // Activate user account
        await pool.query(
          `UPDATE users 
           SET registration_paid = true, 
               is_active = true, 
               payment_date = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [userId]
        );
        
        console.log(`✅ User ${userId} activated successfully via Stripe`);
        
        // Credit referrer if exists
        await this.creditReferrer(userId);
        
        return { success: true, userId, amount };
      }
      
      return { success: false, status: paymentIntent.status };
      
    } catch (error) {
      console.error('Stripe confirm payment error:', error);
      throw error;
    }
  }
  
  // Credit referrer when referred user pays
  async creditReferrer(userId) {
    try {
      const userResult = await pool.query(
        `SELECT u.referred_by, u.username, r.id as referral_id
         FROM users u
         LEFT JOIN referrals r ON r.referred_id = u.id AND r.status = 'pending'
         WHERE u.id = $1`,
        [userId]
      );
      
      const referrerId = userResult.rows[0]?.referred_by;
      const referralId = userResult.rows[0]?.referral_id;
      
      if (referrerId && referralId) {
        const commission = 100; // Ksh 100 commission
        
        // Update referrer's wallet
        await pool.query(
          `UPDATE users 
           SET wallet_balance = wallet_balance + $1, 
               total_earnings = total_earnings + $1 
           WHERE id = $2`,
          [commission, referrerId]
        );
        
        // Update referral record
        await pool.query(
          `UPDATE referrals 
           SET status = 'completed', 
               commission = $1, 
               payment_status = 'completed',
               payment_date = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [commission, referralId]
        );
        
        // Record earnings
        await pool.query(
          `INSERT INTO earnings (user_id, referral_id, amount, type) 
           VALUES ($1, $2, $3, $4)`,
          [referrerId, referralId, commission, 'commission']
        );
        
        console.log(`💰 Commission credited: Ksh ${commission} to referrer ${referrerId}`);
      }
    } catch (error) {
      console.error('Error crediting referrer:', error);
    }
  }
  
  // Check payment status
  async getPaymentStatus(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        metadata: paymentIntent.metadata
      };
    } catch (error) {
      console.error('Error checking payment status:', error);
      return { status: 'error', error: error.message };
    }
  }
}

module.exports = new StripeService();