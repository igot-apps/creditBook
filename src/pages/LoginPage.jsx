import { useState } from "react";
import { Store, Lock, Mail, AlertCircle } from "lucide-react";
import { useApp } from "../contexts/AppContext";

export const LoginPage = () => {
  const { setView, showToast, handleLogin: loginAction } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState([]);

  const addDebug = (msg) => {
    setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (isLoading) {
      addDebug("⚠️ Already loading, ignoring click");
      return;
    }
    
    addDebug(`🔵 Starting login for: ${email}`);
    setIsLoading(true);
    
    try {
      addDebug("🔵 Calling loginAction...");
      await loginAction(email, password);
      addDebug("🟢 Login successful!");
    } catch (err) {
      console.error("Login error:", err);
      const errorMsg = err.message || "Login failed";
      setError(errorMsg);
      addDebug(`🔴 Error: ${errorMsg}`);
      showToast(errorMsg);
      setIsLoading(false);
    }
  };

  const testDatabase = async () => {
    addDebug("🔵 Testing database...");
    try {
      const { AuthService } = await import("../services/AuthService");
      const result = await AuthService.testDatabase();
      if (result.success) {
        addDebug("✅ Database is working!");
        alert("✅ Database is working! You can register/login.");
      } else {
        addDebug("❌ Database failed: " + result.message);
        alert("❌ Database Error: " + result.message + "\n\nTry:\n1. Close private/incognito mode\n2. Use a different browser\n3. Clear browser data");
      }
    } catch (err) {
      addDebug("❌ Test failed: " + err.message);
      alert("❌ Test failed: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Store className="text-yellow-400 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Sign in to manage your store</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-800 dark:text-red-300 text-sm">Login Failed</p>
              <p className="text-red-700 dark:text-red-400 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white disabled:opacity-50"
                placeholder="owner@store.com"
                autoComplete="email"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white disabled:opacity-50"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing in...
              </>
            ) : "Sign In"}
          </button>
        </form>

        {/* Debug Panel */}
        {debugInfo.length > 0 && (
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-mono">
            <p className="font-bold text-gray-700 dark:text-gray-300 mb-2">Debug Log:</p>
            {debugInfo.map((log, i) => (
              <p key={i} className="text-gray-600 dark:text-gray-400">{log}</p>
            ))}
          </div>
        )}

        {/* Test Database Button */}
        <button 
          onClick={testDatabase}
          className="w-full mt-4 text-sm text-gray-500 dark:text-gray-400 underline"
        >
          Test if database is working
        </button>

        <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
          Don't have a store yet?{" "}
          <button onClick={() => setView("register")} className="text-green-700 dark:text-green-400 font-bold hover:underline">
            Create one for free
          </button>
        </p>
      </div>
    </div>
  );
};