import { useEffect, useState } from "react";
import { Store, Mail, Lock, Eye, EyeOff, Loader2, WifiOff, Wifi } from "lucide-react";
import { AuthService } from "../services/AuthService";
import useStore from "../store/useStore";

const withTimeout = (promise, milliseconds = 15000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Connection timeout')), milliseconds);
  promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
});

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState("");
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const { setCurrentStore, setView } = useStore();

  useEffect(() => {
    const online = () => { setIsOnline(true); if (errorType === 'network') { setError('Connection restored. You can sign in now.'); setErrorType('restored'); } };
    const offline = () => { setIsOnline(false); setError('No internet connection. Check your Wi-Fi or mobile data, then try again.'); setErrorType('network'); };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, [errorType]);

  const friendlyLoginError = (err) => {
    const message = String(err?.message || '').toLowerCase();
    if (!navigator.onLine || message.includes('fetch') || message.includes('network') || message.includes('timeout') || message.includes('failed to connect')) {
      return { type: 'network', message: 'CreditBook could not reach the internet. Check your connection and try again—your password may still be correct.' };
    }
    if (message.includes('invalid login credentials')) return { type: 'credentials', message: 'The email or password is incorrect. Please check them and try again.' };
    if (message.includes('email not confirmed')) return { type: 'account', message: 'Please confirm your email address before signing in.' };
    return { type: 'account', message: err?.message || 'Could not sign in. Please try again.' };
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setErrorType("");
    if (!navigator.onLine) {
      setIsOnline(false);
      setErrorType('network');
      setError('No internet connection. Check your Wi-Fi or mobile data, then try again.');
      setIsLoading(false);
      return;
    }
    try {
      sessionStorage.setItem('creditbook_password_login', '1');
      const { user } = await withTimeout(AuthService.signIn(email, password));
      const store = await AuthService.getStore(user.id);
      setCurrentStore(store);
      setView("home"); // Navigate to home using Zustand
    } catch (err) {
      sessionStorage.removeItem('creditbook_password_login');
      const friendly = friendlyLoginError(err);
      setErrorType(friendly.type);
      setError(friendly.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Sign in to manage your business</p>
        </div>

        {!isOnline && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <WifiOff size={19} className="shrink-0"/><div><p className="text-sm font-bold">You’re offline</p><p className="text-xs">Connect to Wi-Fi or mobile data to sign in.</p></div>
          </div>
        )}

        {error && (
          <div role="alert" className={`mb-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${errorType === 'restored' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300' : errorType === 'network' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : 'border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
            {errorType === 'restored' ? <Wifi size={18} className="mt-0.5 shrink-0"/> : errorType === 'network' ? <WifiOff size={18} className="mt-0.5 shrink-0"/> : null}<span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* 👇 NEW: Forgot Password Link */}
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => setView("forgotPassword")}
                className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
          disabled={isLoading || !isOnline}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg mt-6"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : !isOnline ? "Waiting for internet…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Don't have an account?{" "}
          <button onClick={() => setView("register")} className="text-green-600 dark:text-green-400 font-bold hover:underline">
            Create one
          </button>
        </p>
      </div>
    </div>
  );
};
