import React, { useState } from "react";
import { fetchApi } from "../lib/api";
import { Lock, Mail, ArrowRight, ArrowLeft, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface AuthPageProps {
  onAuthSuccess: (user: any) => void;
  onClose: () => void;
}

export default function AuthPage({ onAuthSuccess, onClose }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const endpoint = isLogin ? "/auth/login" : "/auth/register";

    try {
      const res = await fetchApi(endpoint, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      if (res.user) {
        if (isLogin) {
          localStorage.setItem("tglinks_user", JSON.stringify(res.user));
          onAuthSuccess(res.user);
        } else {
          setSuccess("Registration successful! You can now log in.");
          setIsLogin(true);
          setPassword("");
        }
      }
    } catch (err: any) {
      setError(err.message || "An authentication error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8" id="auth_page_root">
      <div className="w-full max-w-md bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden relative shadow-2xl backdrop-blur-md">
        
        {/* Header decoration */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

        <div className="p-8">
          {/* Back button */}
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 font-semibold text-xs transition mb-6 uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          {/* Site branding */}
          <div className="flex flex-col items-center mb-6">
            <img src="/logo.svg" alt="TG Links Logo" className="w-16 h-16 object-contain rounded-2xl mb-3 shadow-lg shadow-indigo-500/10" referrerPolicy="no-referrer" />
            <div className="flex items-center gap-1 leading-none">
              <span className="text-3xl font-black text-white tracking-tight">TG</span>
              <span className="text-3xl font-black text-emerald-400 tracking-tight">LINKS</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 uppercase font-bold tracking-widest text-center">
              Short links & earn money
            </p>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-extrabold text-white">
              {isLogin ? "Welcome Back, Publisher!" : "Join the Earning Network"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isLogin 
                ? "Sign in to access your clicks dashboard and withdraw payouts." 
                : "Create a free publisher account and start shortening instantly."}
            </p>
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  required
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white placeholder-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Account Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white placeholder-slate-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400/50 disabled:text-slate-500 text-white font-extrabold text-sm rounded-xl shadow-lg transition duration-150 flex items-center justify-center gap-2"
            >
              {loading ? "Authenticating..." : (isLogin ? "Sign In to Member Area" : "Register Free Account")}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle form button */}
          <div className="mt-6 text-center text-xs text-slate-500">
            {isLogin ? "Don't have an account yet?" : "Already registered?"}{" "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setSuccess("");
              }}
              className="text-indigo-400 font-bold hover:underline"
            >
              {isLogin ? "Register now" : "Log in here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
