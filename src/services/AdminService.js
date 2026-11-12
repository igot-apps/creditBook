import { supabase } from '../lib/supabaseClient';

const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

export const AdminService = {
  isSuperAdmin: async () => Boolean(unwrap(await supabase.rpc('is_superadmin'))),
  listSubscriptions: async () => unwrap(await supabase.rpc('admin_list_store_subscriptions')) || [],
  getPaymentConfiguration: async () => {
    const { data, error } = await supabase.functions.invoke('subscription-payment', {
      body: { action: 'configuration-status' },
    });
    if (error) return { configured: false, unavailable: true };
    return data;
  },
  savePlan: async (plan) => unwrap(await supabase.rpc('admin_save_subscription_plan', {
    p_id: plan.id, p_name: plan.name, p_amount: Number(plan.amount),
    p_duration_days: Number(plan.duration_days), p_is_active: Boolean(plan.is_active),
  })),
  setStoreSubscription: async ({ storeId, plan, expiresAt, active, note }) => unwrap(
    await supabase.rpc('admin_set_store_subscription', {
      p_store_id: storeId, p_plan: plan, p_expires_at: expiresAt,
      p_active: active, p_note: note || null,
    })
  ),
};
