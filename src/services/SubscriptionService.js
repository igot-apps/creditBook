import { supabase } from '../lib/supabaseClient';

const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

const invokePayment = async (body) => {
  const { data, error } = await supabase.functions.invoke('subscription-payment', { body });
  if (error) throw new Error(error.message || 'Subscription service is unavailable.');
  if (data?.error) throw new Error(data.error);
  return data;
};

export const SubscriptionService = {
  getPlans: async ({ includeInactive = false } = {}) => {
    let query = supabase.from('subscription_plans').select('*').order('sort_order');
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  initializeSubscription: ({ storeId, plan, email, phone }) => invokePayment({
    action: 'initialize', storeId, plan, email, phone,
    callbackUrl: `${window.location.origin}${window.location.pathname}`,
  }),

  verifySubscription: ({ reference, subscriptionId }) => invokePayment({
    action: 'verify', reference, subscriptionId,
  }),

  getSubscriptionStatus: async (storeId) => {
    const { data: store } = await supabase.from('stores').select('created_at').eq('id', storeId).single();
    const { data: allSubs, error } = await supabase
      .from('subscriptions')
      .select('id, status, created_at, expires_at, plan, amount, paid_at, paystack_reference')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    if (!allSubs?.length) {
      const trialStart = store?.created_at ? new Date(store.created_at) : new Date();
      const trialEnd = new Date(trialStart.getTime() + 30 * 86400000);
      const daysRemaining = Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000));
      return { status: daysRemaining ? 'trial' : 'expired', plan: 'trial', amount: 0,
        days_remaining: daysRemaining, expires_at: trialEnd.toISOString(), access: daysRemaining > 0 };
    }

    const latest = allSubs[0];
    if (latest.status === 'pending' && Date.now() - new Date(latest.created_at).getTime() > PENDING_TTL_MS) {
      return { ...latest, status: 'cancelled', access: false };
    }
    if (latest.status === 'pending') {
      const activeSubscription = allSubs.find((item) => item.status === 'active' && item.expires_at && new Date(item.expires_at) > new Date());
      const trialEnd = store?.created_at ? new Date(new Date(store.created_at).getTime() + 30 * 86400000) : null;
      const trialActive = trialEnd && trialEnd > new Date();
      return {
        ...latest,
        access: Boolean(activeSubscription || trialActive),
        current_access_expires_at: activeSubscription?.expires_at || trialEnd?.toISOString() || null,
      };
    }
    const isExpired = latest.expires_at && new Date(latest.expires_at) < new Date();
    return {
      ...latest,
      status: isExpired ? 'expired' : latest.status,
      days_remaining: latest.expires_at && !isExpired
        ? Math.ceil((new Date(latest.expires_at) - new Date()) / 86400000) : 0,
    };
  },

  checkAccess: async (store) => {
    const status = await SubscriptionService.getSubscriptionStatus(store.id);
    if (status.access === true) return status;
    if (status.status === 'active' || status.status === 'trial') return { ...status, access: true };
    if (status.status === 'expired' && status.expires_at) {
      const daysSinceExpiry = Math.floor((Date.now() - new Date(status.expires_at)) / 86400000);
      if (daysSinceExpiry < 3) return { ...status, access: true, grace: true, grace_days_left: 3 - daysSinceExpiry };
    }
    return { ...status, access: false };
  },
};
