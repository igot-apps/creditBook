import { useEffect, useMemo, useState } from 'react';
import { Check, Crown, ExternalLink, KeyRound, Loader2, RefreshCw, Save, Search, ShieldCheck, X } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import useStore from '../store/useStore';
import { AdminService } from '../services/AdminService';
import { SubscriptionService } from '../services/SubscriptionService';
import { formatCurrency } from '../utils/helpers';

const dateInput = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';

export const AdminSubscriptionPage = () => {
  const { setView, isSuperAdmin, showToast } = useStore();
  const [plans, setPlans] = useState([]);
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [editing, setEditing] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [planRows, storeRows, config] = await Promise.all([
        SubscriptionService.getPlans({ includeInactive: true }), AdminService.listSubscriptions(),
        AdminService.getPaymentConfiguration(),
      ]);
      setPlans(planRows);
      setStores(storeRows);
      setPaymentConfig(config);
    } catch (error) {
      showToast(`❌ ${error.message}`);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  const filtered = useMemo(() => stores.filter((item) =>
    `${item.store_name} ${item.owner_email}`.toLowerCase().includes(search.toLowerCase())), [stores, search]);

  const savePlan = async (plan) => {
    setBusy(`plan-${plan.id}`);
    try { await AdminService.savePlan(plan); showToast('✅ Plan updated'); await load(); }
    catch (error) { showToast(`❌ ${error.message}`); }
    finally { setBusy(''); }
  };

  const openStore = (store) => {
    const plan = plans.find((item) => item.id === store.subscription_plan) || plans[0];
    const expiry = store.subscription_expires_at && new Date(store.subscription_expires_at) > new Date()
      ? dateInput(store.subscription_expires_at)
      : dateInput(Date.now() + Number(plan?.duration_days || 30) * 86400000);
    setEditing({ ...store, plan: plan?.id || 'monthly', expiresAt: expiry, note: '' });
  };

  const applyAccess = async (active) => {
    setBusy(`store-${editing.store_id}`);
    try {
      await AdminService.setStoreSubscription({
        storeId: editing.store_id, plan: editing.plan,
        expiresAt: active ? new Date(`${editing.expiresAt}T23:59:59`).toISOString() : new Date().toISOString(),
        active, note: editing.note,
      });
      showToast(active ? '✅ Subscription access updated' : '✅ Subscription access revoked');
      setEditing(null); await load();
    } catch (error) { showToast(`❌ ${error.message}`); }
    finally { setBusy(''); }
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-24">
      <TopBar title="Subscription Admin" showBack onBack={() => setView('settings')} />
      <main style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-5xl mx-auto space-y-6">
        <section className="rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 p-6 text-white shadow-xl">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-white/15"><ShieldCheck size={28} /></div>
            <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Superadmin</p>
              <h1 className="text-2xl font-black mt-1">Subscriptions control centre</h1>
              <p className="text-sm text-indigo-100 mt-2 max-w-2xl">Change prices and durations, review every store, and grant or revoke access with a clear audit note.</p>
            </div>
          </div>
        </section>

        <section className={`rounded-2xl border p-5 shadow-sm ${paymentConfig?.configured ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900' : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900'}`}>
          <div className="flex items-start gap-3">
            <span className={`p-2.5 rounded-xl ${paymentConfig?.configured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}><KeyRound size={21}/></span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-gray-900 dark:text-white">Paystack payment setup</h2><span className={`text-[11px] font-black px-2 py-1 rounded-full ${paymentConfig?.configured ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>{paymentConfig?.configured ? 'READY' : 'ACTION NEEDED'}</span></div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{paymentConfig?.configured ? 'Your secret key is securely installed. Customers can make subscription payments.' : paymentConfig?.unavailable ? 'Deploy the subscription-payment function first, then add the secret key.' : 'Add PAYSTACK_SECRET_KEY once in Supabase. The key will never be shown inside CreditBook.'}</p>
              <ol className="text-xs text-gray-600 dark:text-gray-400 mt-3 space-y-1 list-decimal ml-4"><li>Open Edge Function Secrets.</li><li>Add the name <b>PAYSTACK_SECRET_KEY</b>.</li><li>Paste your Paystack secret and save.</li></ol>
              <a href="https://supabase.com/dashboard/project/rxnkswlourhewdvqakqn/settings/functions" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 bg-gray-950 dark:bg-white dark:text-gray-950 text-white px-4 py-3 rounded-xl text-sm font-bold">Open secure secret settings <ExternalLink size={16}/></a>
              <p className="text-[11px] text-gray-500 mt-3">Updating the secret takes effect immediately; you do not need to redeploy the app.</p>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3"><div><h2 className="font-black text-gray-900 dark:text-white">Plans and pricing</h2><p className="text-xs text-gray-500">Changes apply to new payments only.</p></div>
            <button onClick={load} className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700"><RefreshCw size={17} /></button></div>
          <div className="grid md:grid-cols-2 gap-4">
            {plans.map((plan, index) => <div key={plan.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex justify-between"><div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl"><Crown size={20}/></div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300"><input type="checkbox" checked={plan.is_active} onChange={e => setPlans(p => p.map((x,i) => i === index ? {...x,is_active:e.target.checked}:x))}/> Available</label></div>
              <div className="grid grid-cols-2 gap-3"><label className="col-span-2 text-xs font-bold text-gray-500">PLAN NAME<input value={plan.name} onChange={e => setPlans(p => p.map((x,i) => i === index ? {...x,name:e.target.value}:x))} className="mt-1 w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 text-base text-gray-900 dark:text-white"/></label>
                <label className="text-xs font-bold text-gray-500">PRICE (GH₵)<input type="number" min="0" step="0.01" value={plan.amount} onChange={e => setPlans(p => p.map((x,i) => i === index ? {...x,amount:e.target.value}:x))} className="mt-1 w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 text-gray-900 dark:text-white"/></label>
                <label className="text-xs font-bold text-gray-500">DAYS<input type="number" min="1" value={plan.duration_days} onChange={e => setPlans(p => p.map((x,i) => i === index ? {...x,duration_days:e.target.value}:x))} className="mt-1 w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 text-gray-900 dark:text-white"/></label></div>
              <button onClick={() => savePlan(plan)} disabled={busy === `plan-${plan.id}`} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50">{busy === `plan-${plan.id}` ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Save plan</button>
            </div>)}
          </div>
        </section>

        <section className="space-y-3"><div><h2 className="font-black text-gray-900 dark:text-white">Store subscriptions</h2><p className="text-xs text-gray-500">{stores.length} registered store{stores.length === 1 ? '' : 's'}</p></div>
          <div className="relative"><Search size={18} className="absolute left-4 top-3.5 text-gray-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search store or owner email" className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 dark:text-white"/></div>
          {loading ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600"/></div> : filtered.map(store => {
            const active = store.subscription_status === 'active' && new Date(store.subscription_expires_at) > new Date();
            return <button key={store.store_id} onClick={() => openStore(store)} className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-11 h-11 rounded-xl grid place-items-center font-black ${active ? 'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{store.store_name?.[0] || 'S'}</div>
              <div className="min-w-0 flex-1"><p className="font-bold text-gray-900 dark:text-white truncate">{store.store_name}</p><p className="text-xs text-gray-500 truncate">{store.owner_email || 'No owner email'}</p></div>
              <div className="text-right"><span className={`text-[11px] font-bold px-2 py-1 rounded-full ${active ? 'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{active ? 'ACTIVE' : String(store.subscription_status || 'TRIAL').toUpperCase()}</span><p className="text-xs text-gray-500 mt-1 capitalize">{store.subscription_plan || 'trial'}</p></div>
            </button>;
          })}
        </section>
      </main>

      {editing && <div className="fixed inset-0 z-[80] bg-black/55 flex items-end sm:items-center justify-center p-0 sm:p-4"><div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between"><div><p className="font-black text-xl dark:text-white">Manage {editing.store_name}</p><p className="text-sm text-gray-500">{editing.owner_email}</p></div><button onClick={() => setEditing(null)} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700"><X/></button></div>
        <label className="block text-xs font-bold text-gray-500">PLAN<select value={editing.plan} onChange={e => { const plan=plans.find(p=>p.id===e.target.value); setEditing(x=>({...x,plan:e.target.value,expiresAt:dateInput(Date.now()+Number(plan.duration_days)*86400000)})); }} className="mt-1 w-full p-3 rounded-xl border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white">{plans.map(p=><option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.amount,'GH₵')}</option>)}</select></label>
        <label className="block text-xs font-bold text-gray-500">ACCESS EXPIRES<input type="date" value={editing.expiresAt} onChange={e=>setEditing(x=>({...x,expiresAt:e.target.value}))} className="mt-1 w-full p-3 rounded-xl border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white"/></label>
        <label className="block text-xs font-bold text-gray-500">ADMIN NOTE<textarea value={editing.note} onChange={e=>setEditing(x=>({...x,note:e.target.value}))} placeholder="Example: Manual bank payment confirmed" className="mt-1 w-full p-3 rounded-xl border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white"/></label>
        <div className="grid grid-cols-2 gap-3"><button onClick={()=>applyAccess(false)} className="py-3 rounded-xl border border-red-200 text-red-600 font-bold flex items-center justify-center gap-2"><X size={17}/> Revoke</button><button onClick={()=>applyAccess(true)} disabled={!editing.expiresAt || busy.startsWith('store-')} className="py-3 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">{busy.startsWith('store-')?<Loader2 className="animate-spin" size={17}/>:<Check size={17}/>} Save access</button></div>
      </div></div>}
    </div>
  );
};
