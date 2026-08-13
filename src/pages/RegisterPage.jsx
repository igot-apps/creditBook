import { useState } from "react";
import { Store, Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthService } from "../services/AuthService";
import useStore from "../store/useStore";

export const RegisterPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { setView, setCurrentStore } = useStore();

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { user, store } = await AuthService.signUp(email, password, storeName, ownerName);
      setCurrentStore(store);
      setView("home");
    } catch (err) {
      if (err.message.includes("User already registered")) {
        setError("An account with this email already exists.");
      } else if (err.message.includes("password should be at least")) {
        setError("Password must be at least 6 characters.");
      } else {
        setError(err.message || "Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Your Store</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Start managing your business in the cloud</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Business Name</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                placeholder="e.g., Shalom Cold Store"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Your Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                placeholder="e.g., John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
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
                minLength={6}
                className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                placeholder="Min. 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg mt-6"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Create Account & Store"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Already have an account?{" "}
          <button onClick={() => setView("login")} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};