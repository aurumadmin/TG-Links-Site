import React from "react";
import { ArrowRight, Link2, Sparkles, DollarSign, Activity, ShieldAlert, Mail, ArrowUpRight, HelpCircle, Copy, Check, TrendingUp, ShieldCheck, Zap } from "lucide-react";
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

export default function EmeraldTheme({
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Executive Emerald Ambient Background Mesh */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-950/30 via-slate-950 to-slate-950 pointer-events-none -z-10" />

      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => changeTab("home", "/")}>
            <SiteLogo logoUrl={siteSettings?.logoUrl} isLoaded={isSettingsLoaded} className="w-9 h-9 object-contain rounded-lg" />
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-xl text-white">
              <span>{siteSettings?.siteName || "TG Links"}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
          </div>

          {/* Navigation Links - Unboxed Clean Typography */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <button
              onClick={() => changeTab("home", "/")}
              className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
            >
              Overview
            </button>
            <button
              onClick={() => changeTab("plans", "/plans")}
              className="hover:text-white transition-colors"
            >
              Publisher Rates
            </button>
            <button
              onClick={() => {
                if (user) onNavigate("dashboard");
                else onOpenAuth();
              }}
              className="hover:text-white transition-colors"
            >
              Console
            </button>
          </nav>

          {/* CTA Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (user) onNavigate("dashboard");
                else onOpenAuth();
              }}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
            >
              {user ? "Open Dashboard" : "Start Monetizing"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Unboxed Metadata Header Bar */}
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-6">
          <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            100% Verified Platform
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>Daily Payments</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-emerald-300 font-bold">${currentCpm.toFixed(2)} CPM Rate</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>{formattedMinPayout} Min Cashout</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-8 space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Institutional Grade URL Monetization. <br />
              <span className="text-emerald-400">Earn ${currentCpm.toFixed(2)} CPM</span> Daily.
            </h1>

            <p className="text-base text-slate-400 leading-relaxed max-w-2xl">
              Engineered for high-performing publishers, creators, micro-task platforms, and developers. Monetize social traffic with guaranteed CPM payout rates, daily automated cashouts, and real-time analytics.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => {
                  if (user) onNavigate("dashboard");
                  else onOpenAuth();
                }}
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Create Publisher Account
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => changeTab("plans", "/plans")}
                className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                View Payout Rates
              </button>
            </div>
          </div>

          {/* Key Metrics Executive Box */}
          <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Yield Breakdown</span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Live Network
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-500 block">Standard Global CPM</span>
                <span className="text-3xl font-black text-emerald-400 tabular-nums">${currentCpm.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800/60">
                <span className="text-xs text-slate-500 block">Minimum Withdrawal Threshold</span>
                <span className="text-xl font-bold text-white tabular-nums">{formattedMinPayout}</span>
              </div>
              <div className="pt-2 border-t border-slate-800/60">
                <span className="text-xs text-slate-500 block">Payment Dispatch Schedule</span>
                <span className="text-sm font-semibold text-slate-300">24-Hour Daily Dispatches</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SHORTENER FORM */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Instant URL Shortener & Yield Estimator
          </h3>

          <form onSubmit={handleShorten} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Link2 className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="url"
                required
                placeholder="Paste destination URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 text-slate-950 font-bold text-sm rounded-xl transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? "Shortening..." : "Shorten URL"}
            </button>
          </form>

          {/* Shortened Output */}
          {shortenedLink && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Shortened Link Created</span>
                <span className="font-mono font-bold text-white text-base break-all mt-1 block">
                  {getBaseShortUrl()}/go/{shortenedLink.code}
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Rate: <span className="font-bold text-emerald-400">${shortenedLink.cpm.toFixed(2)} CPM</span> per 1,000 views.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2.5 bg-slate-950 border border-slate-800 text-emerald-400 font-bold text-xs rounded-lg hover:bg-slate-900 transition flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={() => window.open(`${getBaseShortUrl()}/go/${shortenedLink.code}`, "_blank")}
                  className="px-4 py-2.5 bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg hover:bg-emerald-500 transition flex items-center gap-1"
                >
                  Test
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* THREE STEPS */}
      <section className="py-16 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-white tracking-tight">How Publisher Monetization Works</h2>
            <p className="text-slate-400 text-sm mt-1">Three clean steps to establish your passive revenue stream.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">01. Account Creation</span>
              <h3 className="text-base font-bold text-white">Register Free Account</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Sign up in under 30 seconds with immediate API access and default $10.00 CPM rate configuration.
              </p>
            </div>

            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">02. Link Distribution</span>
              <h3 className="text-base font-bold text-white">Shorten & Share</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Shorten long target URLs and distribute across Telegram, YouTube, social channels, or micro-task platforms.
              </p>
            </div>

            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">03. Daily Settlement</span>
              <h3 className="text-base font-bold text-white">Withdraw Daily</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Receive instant daily payouts directly to your preferred wallet once balance reaches {formattedMinPayout}.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* STATS OVERVIEW */}
      <section className="py-16 bg-slate-900/40 border-t border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-black text-white font-mono tabular-nums">{stats.totalClicks.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Total Verified Views</p>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-400 font-mono tabular-nums">${(stats.totalWithdrawn || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Total Dispatched Cashouts</p>
          </div>
          <div>
            <div className="text-3xl font-black text-white font-mono tabular-nums">{stats.totalLinks.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Active Short Links</p>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-400 font-mono tabular-nums">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Registered Publishers</p>
          </div>
        </div>
      </section>

      {/* KEY FEATURES */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-white tracking-tight">Platform Capabilities</h2>
          <p className="text-slate-400 text-sm mt-1">Built with precision for maximum publisher profitability.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Guaranteed $10 CPM</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Earn top-tier payout rates for worldwide traffic across desktop and mobile browsers.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
            <Activity className="w-6 h-6 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Live Click Telemetry</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Inspect real-time click logs, referral traffic breakdowns, and CPM earnings live.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
            <ShieldAlert className="w-6 h-6 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Developer & Faucet API</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automate link creation with API keys or enable Faucet Mode for micro-task networks.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
            <Zap className="w-6 h-6 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Daily Cashouts</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ultra-low <strong>{formattedMinPayout} minimum payout</strong> processed daily across UPI, PayTM, FaucetPay, USDT, and PayPal.
            </p>
          </div>
        </div>
      </section>

      {/* SEO ARTICLE & FAQ */}
      <section className="py-16 bg-slate-900/30 border-t border-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">
              {siteSettings?.siteName || "TG Links"} — Professional Link Monetization
            </h2>
            <p className="text-slate-400 text-xs">
              Worldwide guaranteed payout rates, daily cashouts, and transparent real-time analytics.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <details className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <summary className="font-semibold text-white cursor-pointer hover:text-emerald-400 transition flex justify-between">
                <span>How does {siteSettings?.siteName || "TG Links"} process daily payouts?</span>
                <span className="text-emerald-400">+</span>
              </summary>
              <p className="mt-3 text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
                All valid withdrawal requests above the low {formattedMinPayout} threshold are processed daily within 24 hours to your designated payout account (UPI, FaucetPay, PayTM, PayPal, USDT, or Bank Transfer).
              </p>
            </details>

            <details className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <summary className="font-semibold text-white cursor-pointer hover:text-emerald-400 transition flex justify-between">
                <span>Are custom traffic sources like Telegram or Youtube allowed?</span>
                <span className="text-emerald-400">+</span>
              </summary>
              <p className="mt-3 text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
                Yes! All legitimate traffic from Telegram channels, YouTube video descriptions, websites, social media, and crypto faucets is fully supported and monetized at full CPM rates.
              </p>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
