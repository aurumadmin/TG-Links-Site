import React from "react";
import { ArrowRight, Link2, Sparkles, DollarSign, Activity, ShieldAlert, Mail, ArrowUpRight, HelpCircle, Copy, Check, Terminal, Cpu, Zap, Radio, Lock } from "lucide-react";
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

export default function CyberpunkTheme({
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
    <div className="min-h-screen bg-black text-slate-100 font-mono relative overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Background Cyber Grid Lines & Glowing Orbs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f0ff0d_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff0d_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[300px] bg-pink-500/10 blur-[150px] rounded-full pointer-events-none" />

      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-cyan-500/30 shadow-[0_4px_20px_rgba(0,240,255,0.15)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => changeTab("home", "/")}>
            <div className="relative">
              <SiteLogo logoUrl={siteSettings?.logoUrl} isLoaded={isSettingsLoaded} className="w-10 h-10 object-contain rounded-lg border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.4)]" />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-2xl font-black text-cyan-400 tracking-tighter drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                  {siteSettings?.siteName ? siteSettings.siteName.split(" ")[0] : "TG"}
                </span>
                <span className="text-2xl font-black text-pink-500 tracking-tighter drop-shadow-[0_0_8px_rgba(255,0,128,0.6)]">
                  {siteSettings?.siteName ? siteSettings.siteName.split(" ").slice(1).join(" ") || "LINKS" : "LINKS"}
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-widest font-bold text-cyan-400/70 mt-1 flex items-center gap-1">
                <Terminal className="w-2.5 h-2.5 text-pink-400" />
                // LINK_MONETIZATION_NETWORK
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-xs uppercase tracking-wider font-bold text-slate-400">
            <button
              onClick={() => changeTab("home", "/")}
              className="text-cyan-400 border-b-2 border-cyan-400 pb-1 flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-cyan-400" />
              [01_HOME]
            </button>
            <button
              onClick={() => changeTab("plans", "/plans")}
              className="hover:text-cyan-400 transition hover:border-b-2 hover:border-cyan-400 pb-1"
            >
              [02_PUBLISHER_RATES]
            </button>
            <button
              onClick={() => {
                if (user) onNavigate("dashboard");
                else onOpenAuth();
              }}
              className="hover:text-cyan-400 transition hover:border-b-2 hover:border-cyan-400 pb-1"
            >
              [03_DASHBOARD]
            </button>
          </nav>

          {/* CTA Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (user) onNavigate("dashboard");
                else onOpenAuth();
              }}
              className="relative group px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase text-xs tracking-widest rounded-none border border-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.5)] transition-all flex items-center gap-2"
            >
              <Cpu className="w-4 h-4 text-black" />
              {user ? "ACCESS_CONSOLE" : "LAUNCH_APP"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Status Ticker Banner */}
        <div className="inline-flex mb-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-black/80 border border-cyan-500/40 rounded-none shadow-[0_0_15px_rgba(0,240,255,0.2)] text-xs font-bold text-cyan-400">
            <Radio className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
            <span className="text-pink-500 font-extrabold">[100% LEGIT]</span>
            <span>⚡ DAILY PAYMENTS • ${currentCpm.toFixed(2)} CPM RATE • {formattedMinPayout} MIN CASHOUT</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Main Copy */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-none">
              SHORTEN URLS & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-400 drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]">
                EARN ${currentCpm.toFixed(2)} CPM
              </span>
            </h1>

            <p className="text-sm md:text-base text-slate-400 font-sans leading-relaxed max-w-2xl border-l-2 border-cyan-500 pl-4">
              Step into the highest paying cyber link shortener platform. Monetize traffic from YouTube, Telegram, WhatsApp, Discord, blogs, social networks, and crypto faucets with guaranteed high CPM payout rates, instant payment withdrawals, and live real-time click tracking.
            </p>

            {/* Quick Slogans Badges */}
            <div className="flex flex-wrap gap-3 pt-2 font-mono text-xs">
              <div className="px-3 py-1.5 bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-cyan-400" />
                DAILY PAYMENTS
              </div>
              <div className="px-3 py-1.5 bg-pink-950/40 border border-pink-500/40 text-pink-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-pink-400" />
                ${currentCpm.toFixed(2)} CPM GUARANTEED
              </div>
              <div className="px-3 py-1.5 bg-amber-950/40 border border-amber-500/40 text-amber-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                {formattedMinPayout} MIN CASHOUT
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => {
                  if (user) onNavigate("dashboard");
                  else onOpenAuth();
                }}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-black font-black uppercase text-sm tracking-widest transition-all shadow-[0_0_25px_rgba(0,240,255,0.5)] flex items-center gap-3 cursor-pointer"
              >
                CREATE_FREE_ACCOUNT
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Hero Cyber HUD Box */}
          <div className="lg:col-span-5">
            <div className="relative bg-black/90 border-2 border-cyan-500/60 p-6 shadow-[0_0_30px_rgba(0,240,255,0.25)] relative group">
              {/* Corner ACCENTS */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-pink-500" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-pink-500" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-pink-500" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-pink-500" />

              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3 mb-4">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-pink-500" />
                  CYBER_HUD_STATISTICS
                </span>
                <span className="text-[10px] text-pink-400 font-bold px-2 py-0.5 bg-pink-950 border border-pink-500/40">
                  LIVE_FEED
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div className="bg-cyan-950/20 border border-cyan-500/30 p-3 flex justify-between items-center">
                  <span className="text-slate-400">PUBLISHER_CPM_RATE</span>
                  <span className="text-cyan-400 font-black text-sm">${currentCpm.toFixed(2)} / 1K VIEWS</span>
                </div>
                <div className="bg-pink-950/20 border border-pink-500/30 p-3 flex justify-between items-center">
                  <span className="text-slate-400">MIN_CASHOUT_GATEWAY</span>
                  <span className="text-pink-400 font-black text-sm">{formattedMinPayout} INSTANT</span>
                </div>
                <div className="bg-amber-950/20 border border-amber-500/30 p-3 flex justify-between items-center">
                  <span className="text-slate-400">PAYOUT_SCHEDULE</span>
                  <span className="text-amber-400 font-black text-sm">24H DAILY AUTOMATED</span>
                </div>
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 flex justify-between items-center">
                  <span className="text-slate-400">VERIFICATION_STATUS</span>
                  <span className="text-emerald-400 font-black text-sm">100% LEGIT & VERIFIED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SHORTENER COMPONENT */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-black/90 border-2 border-cyan-500/60 p-6 md:p-8 shadow-[0_0_30px_rgba(0,240,255,0.2)]">
          <h3 className="text-lg font-black uppercase text-cyan-400 mb-4 flex items-center gap-2 tracking-wider">
            <Sparkles className="w-5 h-5 text-pink-500 animate-spin" />
            &gt;_ EXECUTE_URL_SHORTENER
          </h3>

          <form onSubmit={handleShorten} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Link2 className="h-5 w-5 text-cyan-500" />
              </div>
              <input
                type="url"
                required
                placeholder="https://paste-target-destination-url-here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-black border border-cyan-500/40 text-cyan-300 placeholder:text-slate-600 outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-900 text-black font-black uppercase text-sm tracking-widest transition shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? "PROCESSING..." : "SHORTEN_URL"}
            </button>
          </form>

          {/* RESULTS BOX */}
          {shortenedLink && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-5 bg-cyan-950/30 border border-cyan-500/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-pink-400 tracking-wider">// GENERATED_LINK</span>
                <p className="font-mono font-bold text-cyan-300 text-base break-all mt-1">
                  {getBaseShortUrl()}/go/{shortenedLink.code}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  ESTIMATED_CPM: <span className="font-bold text-pink-400">${shortenedLink.cpm.toFixed(2)}</span> / 1,000 VIEWS
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2.5 bg-black border border-cyan-500/50 text-cyan-400 font-bold text-xs uppercase hover:bg-cyan-950/60 transition flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "COPIED" : "COPY_LINK"}
                </button>
                <button
                  onClick={() => window.open(`${getBaseShortUrl()}/go/${shortenedLink.code}`, "_blank")}
                  className="px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs uppercase transition flex items-center gap-1"
                >
                  TEST_LINK
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* THREE STEPS */}
      <section className="py-16 border-t border-cyan-500/20 bg-black/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">
              // HOW_IT_WORKS [3_STEPS]
            </h2>
            <p className="text-slate-400 text-xs mt-2">Monetize online traffic in 3 easy steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-black border border-cyan-500/30 hover:border-cyan-400 transition shadow-[0_0_15px_rgba(0,240,255,0.1)]">
              <span className="text-xs font-bold text-pink-500">// STEP_01</span>
              <h3 className="text-base font-black text-white mt-2 mb-2">1. CREATE ACCOUNT</h3>
              <p className="text-xs font-sans text-slate-400 leading-relaxed">
                Register a free publisher account in less than 30 seconds. Instant activation with zero verification delays.
              </p>
            </div>

            <div className="p-6 bg-black border border-pink-500/30 hover:border-pink-400 transition shadow-[0_0_15px_rgba(255,0,128,0.1)]">
              <span className="text-xs font-bold text-cyan-400">// STEP_02</span>
              <h3 className="text-base font-black text-white mt-2 mb-2">2. SHORTEN & SHARE</h3>
              <p className="text-xs font-sans text-slate-400 leading-relaxed">
                Paste long links, shorten them, and syndicate across YouTube, Telegram, WhatsApp, blogs, or crypto faucets.
              </p>
            </div>

            <div className="p-6 bg-black border border-amber-500/30 hover:border-amber-400 transition shadow-[0_0_15px_rgba(255,191,0,0.1)]">
              <span className="text-xs font-bold text-amber-400">// STEP_03</span>
              <h3 className="text-base font-black text-white mt-2 mb-2">3. WITHDRAW EARNINGS</h3>
              <p className="text-xs font-sans text-slate-400 leading-relaxed">
                Earn daily payout rewards based on valid impressions. Cash out starting at only {formattedMinPayout}!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE STATS COUNTERS */}
      <section className="py-16 border-t border-b border-cyan-500/20 bg-cyan-950/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="p-6 bg-black/80 border border-cyan-500/40">
            <div className="text-3xl font-black text-cyan-400 tracking-tight">{stats.totalClicks.toLocaleString()}+</div>
            <p className="text-slate-400 mt-2 text-[10px] uppercase font-bold tracking-widest">TOTAL_CLICK_VIEWS</p>
          </div>
          <div className="p-6 bg-black/80 border border-pink-500/40">
            <div className="text-3xl font-black text-pink-500 tracking-tight">${(stats.totalWithdrawn || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}+</div>
            <p className="text-slate-400 mt-2 text-[10px] uppercase font-bold tracking-widest">TOTAL_WITHDRAWN</p>
          </div>
          <div className="p-6 bg-black/80 border border-amber-500/40">
            <div className="text-3xl font-black text-amber-400 tracking-tight">{stats.totalLinks.toLocaleString()}+</div>
            <p className="text-slate-400 mt-2 text-[10px] uppercase font-bold tracking-widest">SHORTENED_URLS</p>
          </div>
          <div className="p-6 bg-black/80 border border-emerald-500/40">
            <div className="text-3xl font-black text-emerald-400 tracking-tight">{stats.totalUsers.toLocaleString()}+</div>
            <p className="text-slate-400 mt-2 text-[10px] uppercase font-bold tracking-widest">ACTIVE_PUBLISHERS</p>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl font-black uppercase text-white tracking-tight">
            WHY_CHOOSE_{siteSettings?.siteName ? siteSettings.siteName.replace(/\s+/g, "_") : "TG_LINKS"}?
          </h2>
          <p className="text-slate-400 text-xs mt-2">The ultimate high-paying URL shortener network.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-black border border-cyan-500/30 hover:border-cyan-400 transition">
            <DollarSign className="w-8 h-8 text-cyan-400 mb-4" />
            <h3 className="font-bold text-white text-sm mb-2 uppercase">HIGHEST_CPM_RATES</h3>
            <p className="text-xs font-sans text-slate-400 leading-relaxed">
              Earn top CPM rates for every single valid view across mobile and desktop devices worldwide.
            </p>
          </div>

          <div className="p-6 bg-black border border-pink-500/30 hover:border-pink-400 transition">
            <Activity className="w-8 h-8 text-pink-500 mb-4" />
            <h3 className="font-bold text-white text-sm mb-2 uppercase">LIVE_ANALYTICS</h3>
            <p className="text-xs font-sans text-slate-400 leading-relaxed">
              Track impressions, referral earnings, and CPM performance in real time via live dashboards.
            </p>
          </div>

          <div className="p-6 bg-black border border-amber-500/30 hover:border-amber-400 transition">
            <ShieldAlert className="w-8 h-8 text-amber-400 mb-4" />
            <h3 className="font-bold text-white text-sm mb-2 uppercase">MULTI_API_CHAINING</h3>
            <p className="text-xs font-sans text-slate-400 leading-relaxed">
              Syndicate traffic with external APIs and Faucet Mode for maximum revenue optimization.
            </p>
          </div>

          <div className="p-6 bg-black border border-emerald-500/30 hover:border-emerald-400 transition">
            <Zap className="w-8 h-8 text-emerald-400 mb-4" />
            <h3 className="font-bold text-white text-sm mb-2 uppercase">DAILY_CASHOUTS</h3>
            <p className="text-xs font-sans text-slate-400 leading-relaxed">
              Low <strong>{formattedMinPayout} min cashout</strong> via UPI, FaucetPay, PayTM, PayPal, Crypto USDT, and Bank Transfer processed <strong>DAILY</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* SEO & FAQ SECTION */}
      <section className="py-16 bg-black/90 border-t border-cyan-500/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 px-3 py-1 bg-cyan-950 border border-cyan-500/40">
              #1 UNIVERSAL_LINK_MONETIZER
            </span>
            <h2 className="text-2xl font-black text-white uppercase">
              {siteSettings?.siteName || "TG Links"} — HIGH-PAYING URL SHORTENER
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <details className="bg-black border border-cyan-500/30 p-4">
              <summary className="font-bold text-cyan-400 cursor-pointer uppercase flex justify-between">
                <span>What is {siteSettings?.siteName || "TG Links"} and how does it pay?</span>
                <span>[+]</span>
              </summary>
              <p className="mt-3 text-slate-400 font-sans leading-relaxed pt-2 border-t border-cyan-500/20">
                It is a free URL shortener platform that pays you whenever visitors complete shortener steps. Simply shorten links, share them, and get paid for every view.
              </p>
            </details>

            <details className="bg-black border border-cyan-500/30 p-4">
              <summary className="font-bold text-cyan-400 cursor-pointer uppercase flex justify-between">
                <span>What are the minimum withdrawal limits?</span>
                <span>[+]</span>
              </summary>
              <p className="mt-3 text-slate-400 font-sans leading-relaxed pt-2 border-t border-cyan-500/20">
                Low flat <strong>{formattedMinPayout} minimum payout</strong> for all supported payment methods including UPI, PayTM, FaucetPay, PayPal, and USDT. Processed <strong>DAILY within 24 hours</strong>!
              </p>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
