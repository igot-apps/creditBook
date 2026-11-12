import { useEffect, useRef, useState } from 'react';
import { Delete, KeyRound, Loader2, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { QuickUnlockService } from '../services/QuickUnlockService';

const PinDots = ({ value, length = 6 }) => (
  <div className="flex justify-center gap-2" aria-label={`${value.length} digits entered`}>
    {Array.from({ length }).map((_, index) => <span key={index} className={`size-3 rounded-full border-2 ${index < value.length ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}/>) }
  </div>
);

const Keypad = ({ onDigit, onDelete, disabled }) => (
  <div className="grid grid-cols-3 gap-2.5">
    {[1,2,3,4,5,6,7,8,9].map(number => <button key={number} disabled={disabled} onClick={() => onDigit(String(number))} className="min-h-14 rounded-2xl bg-gray-100 text-xl font-black text-gray-900 active:scale-95 disabled:opacity-50 dark:bg-gray-800 dark:text-white">{number}</button>)}
    <span/>
    <button disabled={disabled} onClick={() => onDigit('0')} className="min-h-14 rounded-2xl bg-gray-100 text-xl font-black text-gray-900 active:scale-95 disabled:opacity-50 dark:bg-gray-800 dark:text-white">0</button>
    <button disabled={disabled} onClick={onDelete} aria-label="Delete digit" className="grid min-h-14 place-items-center rounded-2xl text-gray-600 active:scale-95 disabled:opacity-50 dark:text-gray-300"><Delete size={22}/></button>
  </div>
);

export const QuickUnlockScreen = ({ userId, onUnlocked, onUsePassword }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const verifying = useRef(false);
  const pinLength = QuickUnlockService.getPinLength(userId);

  useEffect(() => {
    if (pin.length !== pinLength || verifying.current) return;
    const timer = setTimeout(async () => {
      verifying.current = true; setBusy(true); setError('');
      const result = await QuickUnlockService.verifyPin(userId, pin);
      if (result.ok) onUnlocked();
      else {
        setPin('');
        if (result.lockedUntil) setError(`Too many attempts. Try again at ${new Date(result.lockedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
        else setError(`Incorrect PIN. ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? '' : 's'} remaining.`);
      }
      setBusy(false); verifying.current = false;
    }, 180);
    return () => clearTimeout(timer);
  }, [pin, pinLength, userId, onUnlocked]);

  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-50 p-5 dark:bg-gray-950"><div className="w-full max-w-sm space-y-6">
    <div className="text-center"><div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"><LockKeyhole size={31}/></div><h1 className="text-2xl font-black text-gray-900 dark:text-white">Quick unlock</h1><p className="mt-1 text-sm text-gray-500">Enter your device PIN to open CreditBook.</p></div>
    <PinDots value={pin} length={pinLength}/>{error && <p className="rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
    {busy ? <div className="flex h-48 items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div> : <Keypad disabled={busy} onDigit={digit => pin.length < pinLength && setPin(value => value + digit)} onDelete={() => setPin(value => value.slice(0,-1))}/>} 
    <button onClick={onUsePassword} className="w-full py-3 text-sm font-bold text-indigo-700 dark:text-indigo-300">Use account password instead</button>
  </div></div>;
};

export const PinSetupModal = ({ userId, onClose, onSaved }) => {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [step, setStep] = useState('create');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const current = step === 'create' ? pin : confirm;
  const next = async () => {
    if (!/^\d{4,6}$/.test(pin)) { setError('Choose a 4–6 digit PIN. Six digits is safer.'); return; }
    if (step === 'create') { setStep('confirm'); setError(''); return; }
    if (pin !== confirm) { setConfirm(''); setError('PINs did not match. Try again.'); return; }
    setBusy(true);
    try { await QuickUnlockService.createPin(userId, pin); onSaved?.(); onClose(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/55 sm:items-center sm:p-4"><div className="w-full max-w-sm rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl dark:bg-gray-900">
    <div className="flex items-start justify-between"><div><div className="mb-3 grid size-11 place-items-center rounded-xl bg-indigo-100 text-indigo-700"><KeyRound size={22}/></div><h2 className="text-xl font-black text-gray-900 dark:text-white">{step === 'create' ? 'Create quick-unlock PIN' : 'Confirm your PIN'}</h2><p className="mt-1 text-sm text-gray-500">{step === 'create' ? 'Use 4–6 digits. Six digits is recommended.' : 'Enter the same PIN again.'}</p></div><button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-gray-100 dark:bg-gray-800"><X size={18}/></button></div>
    <div className="my-6"><PinDots value={current}/></div>{error && <p className="mb-3 rounded-xl bg-red-50 p-2.5 text-center text-sm text-red-700">{error}</p>}
    <Keypad disabled={busy} onDigit={digit => current.length < 6 && (step === 'create' ? setPin(v=>v+digit) : setConfirm(v=>v+digit))} onDelete={() => step === 'create' ? setPin(v=>v.slice(0,-1)) : setConfirm(v=>v.slice(0,-1))}/>
    <button onClick={next} disabled={busy || current.length < 4} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={18}/> : <ShieldCheck size={18}/>} {step === 'create' ? 'Continue' : 'Save PIN'}</button>
  </div></div>;
};

export const QuickUnlockRecommendationModal = ({ onSetUp, onClose }) => (
  <div className="fixed inset-0 z-[205] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
    <div role="dialog" aria-modal="true" aria-labelledby="quick-unlock-recommendation" className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl dark:bg-gray-900">
      <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"><KeyRound size={30}/></div>
      <div className="text-center"><p className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Recommended</p><h2 id="quick-unlock-recommendation" className="mt-1 text-xl font-black text-gray-900 dark:text-white">Open CreditBook faster</h2><p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">Set a 4–6 digit PIN for quick access on this device. Your account password remains available as a backup.</p></div>
      <div className="mt-6 space-y-2.5"><button onClick={onSetUp} className="w-full rounded-xl bg-indigo-600 py-3.5 font-bold text-white active:scale-[.99]">Set up PIN</button><button onClick={onClose} className="w-full rounded-xl border border-gray-200 py-3.5 font-bold text-gray-700 active:scale-[.99] dark:border-gray-700 dark:text-gray-200">Not now</button></div>
      <p className="mt-3 text-center text-[11px] text-gray-400">You can enable Quick Unlock later from Settings.</p>
    </div>
  </div>
);
