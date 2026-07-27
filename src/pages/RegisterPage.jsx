import { useState } from "react";
import { Store, User, Mail, Phone, Lock } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { AuthService } from "../services/AuthService";

export const RegisterPage = () => {
  const { setView, showToast } = useApp();
  const [form, setForm] = useState({ storeName: "", ownerName: "", email: "", phone: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await AuthService.register(form.storeName, form.ownerName, form.email, form.phone, form.password);
      showToast("Store created successfully! Please log in.");
      setView("login");
    } catch (err) {
      showToast("Email already exists");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Your Store</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Start managing your sales and debts today</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input required value={form.storeName} onChange={e => setForm({...form, storeName: e.target.value})}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
              placeholder="Store Name (e.g., Shalom Cloth)" />
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input required value={form.ownerName} onChange={e => setForm({...form, ownerName: e.target.value})}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
              placeholder="Your Name" />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
              placeholder="Email Address" />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="tel" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
              placeholder="Business Phone" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
              placeholder="Create Password" />
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-70">
            {isLoading ? "Creating Store..." : "Create Store & Continue"}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
          Already have a store?{" "}
          <button onClick={() => setView("login")} className="text-green-700 dark:text-green-400 font-bold hover:underline">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};