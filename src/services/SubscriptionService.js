import { supabase } from '../lib/supabaseClient';

const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = 'https://api.paystack.co';

export const PLANS = {
  monthly: { amount: 50, name: 'Monthly Plan', duration: 30 },
  yearly: { amount: 500, name: 'Yearly Plan', duration: 365 },
};

export const SubscriptionService = {
  // 1️⃣ Create pending subscription + get Paystack payment link (directly from the app)
  initializeSubscription: async ({ storeId, plan, email, phone }) => {
    const planConfig = PLANS[plan];
    if (!planConfig) throw new Error('Invalid plan');

    // Create the pending subscription record in Supabase
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert([{ store_id: storeId, plan, amount: planConfig.amount, status: 'pending', email, phone }])
      .select()
      .single();
    if (subError) throw new Error(subError.message);

    // 👇 Callback = wherever the app is currently running (works on any device/host)
    const callbackUrl = `${window.location.origin}${window.location.pathname}?subscription_id=${subscription.id}`;

    // Call Paystack directly (no server needed)
    const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
      body: JSON.stringify({
        email,
        amount: planConfig.amount * 100, // pesewas
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

    // Save the reference for later verification
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

  // 2️⃣ Verify with Paystack + activate the subscription in Supabase
  verifySubscription: async ({ reference, subscriptionId }) => {
    const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const result = await response.json();
    if (!result.status) throw new Error(result.message || 'Verification failed');
    if (result.data.status !== 'success') throw new Error('Payment was not successful');

    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();
    if (fetchError) throw new Error(fetchError.message);

    // Already active? Don't double-activate
    if (subscription.status === 'active') return subscription;

    const planConfig = PLANS[subscription.plan] || { duration: 30 };
    const expiresAt = new Date(Date.now() + planConfig.duration * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ status: 'active', paid_at: new Date().toISOString(), expires_at: expiresAt, paystack_reference: reference })
      .eq('id', subscriptionId);
    if (updateError) throw new Error(updateError.message);

    // Update the store's subscription status
    await supabase
      .from('stores')
      .update({ subscription_status: 'active', subscription_plan: subscription.plan, subscription_expires_at: expiresAt })
      .eq('id', subscription.store_id);

    return { ...subscription, status: 'active', expires_at: expiresAt };
  },

  // 3️⃣ Current subscription status
  getSubscriptionStatus: async (storeId) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { status: 'none' };

    const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
    return {
      id: data.id,
      status: isExpired ? 'expired' : data.status,
      plan: data.plan,
      amount: data.amount,
      paid_at: data.paid_at,
      expires_at: data.expires_at,
      days_remaining: isExpired ? 0 : Math.ceil((new Date(data.expires_at) - new Date()) / 86400000),
    };
  },

  // 4️⃣ ACCESS CONTROL: active → grace → locked (NO trial)
  checkAccess: async (store) => {
    const GRACE_DAYS = 3;

    const status = await SubscriptionService.getSubscriptionStatus(store.id);

    // ✅ Active subscription
    if (status.status === 'active') return { ...status, access: true };

    // 🕊️ Expired → 3-day grace period (app still works, with warning)
    if (status.status === 'expired' && status.expires_at) {
      const daysSinceExpiry = Math.floor((Date.now() - new Date(status.expires_at).getTime()) / 86400000);
      if (daysSinceExpiry < GRACE_DAYS) {
        return { ...status, access: true, grace: true, grace_days_left: GRACE_DAYS - daysSinceExpiry };
      }
      return { ...status, access: false };
    }

    // 🔒 No subscription → locked immediately (view-only mode)
    return { ...status, access: false };
  },
};