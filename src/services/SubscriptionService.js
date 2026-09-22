import { supabase } from '../lib/supabaseClient';

const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = 'https://api.paystack.co';

// 👇 Pending payments auto-disable after 1 day
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

export const PLANS = {
  monthly: { amount: 30, name: 'Monthly Plan', duration: 30 },
  yearly: { amount: 300, name: 'Yearly Plan', duration: 365 },
};

export const SubscriptionService = {
  // 1️⃣ Create pending subscription + get Paystack payment link
  initializeSubscription: async ({ storeId, plan, email, phone }) => {
    const planConfig = PLANS[plan];
    if (!planConfig) throw new Error('Invalid plan');

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert([{ store_id: storeId, plan, amount: planConfig.amount, status: 'pending', email, phone }])
      .select()
      .single();
    if (subError) throw new Error(subError.message);

    const callbackUrl = `${window.location.origin}${window.location.pathname}?subscription_id=${subscription.id}`;

    const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
      body: JSON.stringify({
        email,
        amount: planConfig.amount * 100,
        currency: 'GHS',
        channels: ['mobile_money', 'card'],
        callback_url: callbackUrl,
        metadata: {
          custom_fields: [
            { display_name: 'Plan', variable_name: 'plan', value: planConfig.name },
            { display_name: 'Subscription ID', variable_name: 'subscription_id', value: subscription.id },
          ],
        },
      }),
    });

    const result = await response.json();
    if (!result.status) throw new Error(result.message || 'Failed to initialize payment');

    await supabase
      .from('subscriptions')
      .update({ paystack_reference: result.data.reference })
      .eq('id', subscription.id);

    return {
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
      subscription_id: subscription.id,
    };
  },

  // 2️⃣ Verify with Paystack + activate in Supabase
  verifySubscription: async ({ reference, subscriptionId }) => {
    const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const result = await response.json();
    if (!result.status) throw new Error(result.message || 'Verification failed');
    if (result.data.status !== 'success') throw new Error('Payment not successful yet — if you paid, try again in a few minutes.');

    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();
    if (fetchError) throw new Error(fetchError.message);

    if (subscription.status === 'active') return subscription;

    const planConfig = PLANS[subscription.plan] || { duration: 30 };
    const expiresAt = new Date(Date.now() + planConfig.duration * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ status: 'active', paid_at: new Date().toISOString(), expires_at: expiresAt, paystack_reference: reference })
      .eq('id', subscriptionId);
    if (updateError) throw new Error(updateError.message);

    await supabase
      .from('stores')
      .update({ subscription_status: 'active', subscription_plan: subscription.plan, subscription_expires_at: expiresAt })
      .eq('id', subscription.store_id);

    return { ...subscription, status: 'active', expires_at: expiresAt };
  },

  // 3️⃣ Current subscription status (with 30-day trial for brand new users)
  getSubscriptionStatus: async (storeId) => {
    // Get store creation date for trial calculation
    const { data: store } = await supabase
      .from('stores')
      .select('created_at')
      .eq('id', storeId)
      .single();

    // Check for ANY subscription history (prevents infinite trial loops)
    const { data: allSubs, error: subsError } = await supabase
      .from('subscriptions')
      .select('status, created_at, expires_at, plan, amount, paid_at, paystack_reference')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (subsError) throw new Error(subsError.message);

    // 🎁 If absolutely no subscription records exist, grant a 30-day trial
    if (!allSubs || allSubs.length === 0) {
      const trialStart = store?.created_at ? new Date(store.created_at) : new Date();
      const trialEnd = new Date(trialStart.getTime() + 30 * 24 * 60 * 60 * 1000);
      const daysRemaining = Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000));

      return {
        status: daysRemaining > 0 ? 'trial' : 'expired',
        plan: 'trial',
        amount: 0,
        days_remaining: daysRemaining,
        expires_at: trialEnd.toISOString(),
        access: daysRemaining > 0
      };
    }

    // If subscriptions exist, evaluate the latest one
    const data = allSubs[0];

    // Auto-disable pending payments older than 1 day
    if (data.status === 'pending' && data.created_at) {
      const age = Date.now() - new Date(data.created_at).getTime();
      if (age > PENDING_TTL_MS) {
        supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', data.id).catch(() => {});
        return { ...data, status: 'cancelled', access: false };
      }
    }

    const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
    
    return {
      id: data.id,
      status: isExpired ? 'expired' : data.status,
      plan: data.plan,
      amount: data.amount,
      paid_at: data.paid_at,
      expires_at: data.expires_at,
      created_at: data.created_at,
      paystack_reference: data.paystack_reference,
      days_remaining: data.expires_at
        ? (isExpired ? 0 : Math.ceil((new Date(data.expires_at) - new Date()) / 86400000))
        : 0,
    };
  },

  // 4️⃣ ACCESS CONTROL: active/trial → grace → locked
  checkAccess: async (store) => {
    const GRACE_DAYS = 3;
    const status = await SubscriptionService.getSubscriptionStatus(store.id);

    // Active paid plans OR active trials get full access
    if (status.status === 'active' || status.status === 'trial') {
      return { ...status, access: true };
    }

    // Expired plans get a 3-day grace period
    if (status.status === 'expired' && status.expires_at) {
      const daysSinceExpiry = Math.floor((Date.now() - new Date(status.expires_at).getTime()) / 86400000);
      if (daysSinceExpiry < GRACE_DAYS) {
        return { ...status, access: true, grace: true, grace_days_left: GRACE_DAYS - daysSinceExpiry };
      }
      return { ...status, access: false };
    }

    return { ...status, access: false };
  },
};