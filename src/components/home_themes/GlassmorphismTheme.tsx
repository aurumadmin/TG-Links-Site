import React from "react";
import { ArrowRight, Link2, Sparkles, DollarSign, Activity, ShieldAlert, Mail, ArrowUpRight, HelpCircle, Copy, Check, Zap, Layers, Compass } from "lucide-react";
import { motion } from "motion/react";
import SiteLogo from "../SiteLogo";

interface HomeThemeProps {
  siteSettings: any;
  stats: {
    totalLinks: number;
    totalClicks: number;
    totalUsers: number;
    totalWithdrawn?: number;
    globalCpm: number;
    minWithdrawal?: number;
  };
  currentCpm: number;
  formattedMinPayout: string;
  url: string;
  setUrl: (v: string) => void;
  shortenedLink: any;
  loading: boolean;
  copied: boolean;
  handleShorten: (e: React.FormEvent) => Promise<void>;
  copyToClipboard: () => void;
  user: any;
  onNavigate: (page: string) => void;
  onOpenAuth: () => void;
  changeTab: (tab: string, path: string) => void;
  getBaseShortUrl: () => string;
  isSettingsLoaded?: boolean;
}

export default function GlassmorphismTheme({
  siteSettings,
  stats,
  currentCpm,
  formattedMinPayout,
  url,
  setUrl,
  shortenedLink,
  loading,
  copied,
  handleShorten,
  copyToClipboard,
  user,
  onNavigate,
  onOpenAuth,
  changeTab,
  getBaseShortUrl,
  isSettingsLoaded = true
}: HomeThemeProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* Ambient Gradient Orbs for Frosted Glass Effect */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[20%] right-[-100px] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-emerald-600/15 rounded-full blur-[150px] pointer-events-none -z-10" />

      {/* FLOATING FROSTED GLASS HEADER */}
      <div className="sticky top-4 z-50 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="backdrop-blur-2xl bg-slate-900/60 border border-white/10 rounded-full px-6 py-3 shadow-2xl shadow-purple-950/20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => changeTab("home", "/")}>
            <SiteLogo logoUrl={siteSettings?.logoUrl} isLoaded={isSettingsLoaded} className="w-9 h-9 object-contain rounded-full border border-white/20" />
            <div className="flex items-center gap-1 font-extrabold text-lg text-white">
              <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">
                {siteSettings?.siteName || "TG LINKS"}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-300">
            <button
              onClick={() => changeTab("home", "/")}
              className="text-purple-300 hover:text-white transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => changeTab("plans", "/plans")}
              className="hover:text-purple-300 transition-colors"
            >
              Rates & Plans
            </button>
            <button
              onClick={() => {
                if (user) onNavigate("dashboard");
                else onOpenAuth();
              }}
              className="hover:text-purple-300 transition-colors"
            >
              Dashboard
            </button>
          </nav>

          {/* Action Button */}
          <button
            onClick={() => {
              if (user) onNavigate("dashboard");
              else onOpenAuth();
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-full shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>{user ? "Console" : "Get Started"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </header>
      </div>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Floating Badge */}
        <div className="inline-flex mb-6">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs font-semibold text-slate-200 flex items-center gap-2 shadow-lg">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">100% LEGIT</span>
            <span>⚡ Daily Payments • ${currentCpm.toFixed(2)} CPM Rate • {formattedMinPayout} Min Payout</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-8 space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Transform Your Links Into <br />
              <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                ${currentCpm.toFixed(2)} CPM Revenue
              </span>
            </h1>

            <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
              Monetize audience traffic across Telegram, YouTube, social networks, blogs, and crypto faucets with guaranteed high CPM payout rates, instant daily cashouts, and real-time live click statistics.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => {
                  if (user) onNavigate("dashboard");
                  else onOpenAuth();
                }}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 hover:opacity-90 text-white font-extrabold text-sm rounded-full shadow-xl shadow-purple-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                Start Earning Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Glass Card Glassmorphic Preview */}
          <div className="lg:col-span-4">
            <div className="backdrop-blur-2xl bg-slate-900/40 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Live Platform Rate</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              </div>

              <div className="space-y-3">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-3.5 rounded-2xl flex justify-between items-center">
                  <span className="text-xs text-slate-300">Global CPM Rate</span>
                  <span className="text-xl font-extrabold text-emerald-400">${currentCpm.toFixed(2)}</span>
                </div>
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-3.5 rounded-2xl flex justify-between items-center">
                  <span className="text-xs text-slate-300">Minimum Cashout</span>
                  <span className="text-sm font-bold text-white">{formattedMinPayout}</span>
                </div>
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-3.5 rounded-2xl flex justify-between items-center">
                  <span className="text-xs text-slate-300">Payment Frequency</span>
                  <span className="text-sm font-bold text-purple-300">Daily 24H Dispatch</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SHORTENER COMPONENT */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="backdrop-blur-2xl bg-slate-900/50 border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400 animate-spin" />
            Shorten Link & Estimate Earnings
          </h3>

          <form onSubmit={handleShorten} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Link2 className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="url"
                required
                placeholder="Paste destination URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-slate-950/80 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-2xl transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? "Processing..." : "Shorten URL"}
            </button>
          </form>

          {/* Shortened Output */}
          {shortenedLink && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-5 backdrop-blur-xl bg-purple-950/30 border border-purple-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider block">Shortened URL</span>
                <span className="font-mono font-bold text-white text-base break-all mt-1 block">
                  {getBaseShortUrl()}/go/{shortenedLink.code}
                </span>
                <p className="text-xs text-slate-300 mt-1">
                  Estimated CPM: <span className="font-bold text-emerald-400">${shortenedLink.cpm.toFixed(2)}</span> per 1,000 views.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2.5 backdrop-blur-xl bg-white/10 border border-white/20 text-white font-bold text-xs rounded-xl hover:bg-white/20 transition flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={() => window.open(`${getBaseShortUrl()}/go/${shortenedLink.code}`, "_blank")}
                  className="px-4 py-2.5 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-500 transition flex items-center gap-1"
                >
                  Test Link
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* THREE STEPS */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-white tracking-tight">How It Works</h2>
            <p className="text-slate-400 text-sm mt-1">Start earning in three simple steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="backdrop-blur-xl bg-slate-900/40 border border-white/10 rounded-2xl p-6 space-y-3 shadow-xl">
              <span className="text-2xl font-black text-purple-400">01</span>
              <h3 className="text-base font-bold text-white">Create an Account</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sign up for a free publisher account in seconds with zero configuration required.
              </p>
            </div>

            <div className="backdrop-blur-xl bg-slate-900/40 border border-white/10 rounded-2xl p-6 space-y-3 shadow-xl">
              <span className="text-2xl font-black text-indigo-400">02</span>
              <h3 className="text-base font-bold text-white">Shorten & Share</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Shorten long destination URLs and post them across YouTube, Telegram, or social media.
              </p>
            </div>

            <div className="backdrop-blur-xl bg-slate-900/40 border border-white/10 rounded-2xl p-6 space-y-3 shadow-xl">
              <span className="text-2xl font-black text-emerald-400">03</span>
              <h3 className="text-base font-bold text-white">Withdraw Earnings</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Earn daily payout rewards and cash out instantly once balance reaches {formattedMinPayout}!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* STATS OVERVIEW */}
      <section className="py-16 border-t border-b border-white/10 backdrop-blur-md bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-black text-emerald-400 font-mono tabular-nums">{stats.totalClicks.toLocaleString()}</div>
            <p className="text-xs text-slate-300 mt-1 uppercase font-semibold">Total Click Views</p>
          </div>
          <div>
            <div className="text-3xl font-black text-purple-300 font-mono tabular-nums">${(stats.totalWithdrawn || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-slate-300 mt-1 uppercase font-semibold">Total Amount Withdrawn</p>
          </div>
          <div>
            <div className="text-3xl font-black text-indigo-400 font-mono tabular-nums">{stats.totalLinks.toLocaleString()}</div>
            <p className="text-xs text-slate-300 mt-1 uppercase font-semibold">Shortened URLs Created</p>
          </div>
          <div>
            <div className="text-3xl font-black text-pink-400 font-mono tabular-nums">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-slate-300 mt-1 uppercase font-semibold">Active Publishers</p>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-white tracking-tight">Why Choose {siteSettings?.siteName || "TG Links"}</h2>
          <p className="text-slate-400 text-sm mt-1">Full-featured adlink monetization platform.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="backdrop-blur-xl bg-slate-900/40 border border-white/10 rounded-2xl p-6 space-y-3">
            <DollarSign className="w-6 h-6 text-purple-400" />
            <h3 className="font-bold text-white text-base">Highest CPM Rates</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Earn top CPM rates for every single valid view across mobile and desktop devices.
            </p>
          </div>

          <div className="backdrop-blur-xl bg-slate-900/40 border border-white/10 rounded-2xl p-6 space-y-3">
            <Activity className="w-6 h-6 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Live Click Telemetry</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Inspect real-time click logs, referral traffic breakdowns, and CPM earnings live.
            </p>
          </div>

          <div className="backdrop-blur-xl bg-slate-900/40 border border-white/10 rounded-2xl p-6 space-y-3">
            <ShieldAlert className="w-6 h-6 text-pink-400" />
            <h3 className="font-bold text-white text-base">Multi-API Syndication</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Chain external APIs and Faucet Mode for maximum revenue optimization.
            </p>
          </div>

          <div className="backdrop-blur-xl bg-slate-900/40 border border-white/10 rounded-2xl p-6 space-y-3">
            <Zap className="w-6 h-6 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Daily Cashouts</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Low <strong>{formattedMinPayout} minimum payout</strong> processed daily across UPI, PayTM, FaucetPay, USDT, and PayPal.
            </p>
          </div>
        </div>
      </section>

      {/* SEO & FAQ */}
      <section className="py-16 backdrop-blur-md bg-slate-900/30 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">
              {siteSettings?.siteName || "TG Links"} — Universal URL Shortener
            </h2>
            <p className="text-slate-300 text-xs">
              Guaranteed worldwide payout rates, daily cashouts, and transparent real-time analytics.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <details className="backdrop-blur-xl bg-slate-900/50 border border-white/10 rounded-2xl p-4">
              <summary className="font-semibold text-white cursor-pointer hover:text-purple-300 transition flex justify-between">
                <span>What is {siteSettings?.siteName || "TG Links"} and how does it pay?</span>
                <span className="text-purple-400">+</span>
              </summary>
              <p className="mt-3 text-slate-300 leading-relaxed border-t border-white/10 pt-3">
                It is a free URL shortener platform that pays you whenever visitors complete shortener steps. Simply shorten links, share them, and get paid for every view.
              </p>
            </details>

            <details className="backdrop-blur-xl bg-slate-900/50 border border-white/10 rounded-2xl p-4">
              <summary className="font-semibold text-white cursor-pointer hover:text-purple-300 transition flex justify-between">
                <span>What are the minimum withdrawal limits?</span>
                <span className="text-purple-400">+</span>
              </summary>
              <p className="mt-3 text-slate-300 leading-relaxed border-t border-white/10 pt-3">
                Low flat <strong>{formattedMinPayout} minimum payout</strong> for all supported payment methods including UPI, PayTM, FaucetPay, PayPal, and USDT. Processed <strong>DAILY within 24 hours</strong>!
              </p>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
