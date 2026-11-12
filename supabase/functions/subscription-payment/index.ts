import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return json({ error: 'Please sign in again.' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'Your session has expired. Please sign in again.' }, 401);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    const body = await req.json();

    if (body.action === 'configuration-status') {
      if (user.email?.toLowerCase() !== 'aagortey@gmail.com') return json({ error: 'Superadmin access required.' }, 403);
      return json({ configured: Boolean(paystackKey), secretName: 'PAYSTACK_SECRET_KEY' });
    }

    if (!paystackKey) return json({ error: 'Payments are not configured yet. Contact the administrator.' }, 503);

    if (body.action === 'initialize') {
      const { data: store } = await admin.from('stores').select('id, user_id').eq('id', body.storeId).single();
      if (!store || store.user_id !== user.id) return json({ error: 'Store access denied.' }, 403);
      const { data: plan } = await admin.from('subscription_plans').select('*').eq('id', body.plan).eq('is_active', true).single();
      if (!plan) return json({ error: 'That subscription plan is no longer available.' }, 400);
      const email = String(body.email || user.email || '').trim();
      const phone = String(body.phone || '').trim();
      if (!email || !phone) return json({ error: 'Email and phone number are required.' }, 400);

      const { data: subscription, error: insertError } = await admin.from('subscriptions').insert({
        store_id: store.id, plan: plan.id, amount: plan.amount, status: 'pending',
        email, phone, plan_duration_days: plan.duration_days,
      }).select().single();
      if (insertError) throw insertError;

      const callback = new URL(body.callbackUrl);
      callback.searchParams.set('subscription_id', subscription.id);
      const paymentResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${paystackKey}` },
        body: JSON.stringify({
          email, amount: Math.round(Number(plan.amount) * 100), currency: 'GHS',
          channels: ['mobile_money', 'card'], callback_url: callback.toString(),
          metadata: { store_id: store.id, subscription_id: subscription.id, plan: plan.id },
        }),
      });
      const payment = await paymentResponse.json();
      if (!payment.status) {
        await admin.from('subscriptions').update({ status: 'cancelled' }).eq('id', subscription.id);
        return json({ error: payment.message || 'Could not start payment.' }, 400);
      }
      await admin.from('subscriptions').update({ paystack_reference: payment.data.reference }).eq('id', subscription.id);
      return json({ ...payment.data, subscription_id: subscription.id });
    }

    if (body.action === 'verify') {
      const { data: subscription } = await admin.from('subscriptions').select('*, stores!inner(user_id, subscription_expires_at)').eq('id', body.subscriptionId).single();
      if (!subscription || subscription.stores.user_id !== user.id) return json({ error: 'Subscription access denied.' }, 403);
      if (subscription.status === 'active') return json(subscription);
      if (subscription.paystack_reference !== body.reference) return json({ error: 'Payment reference does not match.' }, 400);

      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(body.reference)}`, {
        headers: { Authorization: `Bearer ${paystackKey}` },
      });
      const verified = await response.json();
      if (!verified.status || verified.data?.status !== 'success') {
        return json({ error: 'Payment is not confirmed yet. If you paid, wait a moment and try again.' }, 400);
      }
      if (Number(verified.data.amount) !== Math.round(Number(subscription.amount) * 100)) {
        return json({ error: 'The paid amount does not match this subscription.' }, 400);
      }

      const duration = Number(subscription.plan_duration_days || 30);
      const currentExpiry = subscription.stores.subscription_expires_at
        ? new Date(subscription.stores.subscription_expires_at).getTime() : 0;
      const renewalStartsAt = Math.max(Date.now(), currentExpiry);
      const expiresAt = new Date(renewalStartsAt + duration * 86400000).toISOString();
      const paidAt = verified.data.paid_at || new Date().toISOString();
      const { data: activated, error: updateError } = await admin.from('subscriptions').update({
        status: 'active', paid_at: paidAt, expires_at: expiresAt,
      }).eq('id', subscription.id).select().single();
      if (updateError) throw updateError;
      await admin.from('stores').update({
        subscription_status: 'active', subscription_plan: subscription.plan, subscription_expires_at: expiresAt,
      }).eq('id', subscription.store_id);
      return json(activated);
    }

    return json({ error: 'Unknown payment action.' }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Unexpected subscription error.' }, 500);
  }
});
