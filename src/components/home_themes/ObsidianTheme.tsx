import React, { useState, useId } from "react";
import {
  ArrowRight,
  Link2,
  Sparkles,
  DollarSign,
  Copy,
  Check,
  TrendingUp,
  ShieldCheck,
  Zap,
  Globe2,
  Code2,
  ChevronDown,
  ArrowUpRight,
  Layers,
  Send,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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

export default function ObsidianTheme({
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
  isSettingsLoaded
}: HomeThemeProps) {
  // Profit Calculator State
  const [dailyClicks, setDailyClicks] = useState<number>(5000);
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");
  const inrRate = 86.5; // Current USD to INR conversion rate

  const dailyEarningsUsd = (dailyClicks / 1000) * currentCpm;
  const monthlyEarningsUsd = dailyEarningsUsd * 30;

  const displayDaily = currency === "USD" 
    ? `$${dailyEarningsUsd.toFixed(2)}` 
    : `₹${(dailyEarningsUsd * inrRate).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  
  const displayMonthly = currency === "USD" 
    ? `$${monthlyEarningsUsd.toFixed(2)}` 
    : `₹${(monthlyEarningsUsd * inrRate).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Copied State for Developer API curl snippet
  const [apiCopied, setApiCopied] = useState(false);
  const curlExample = `curl -X GET "${getBaseShortUrl()}/api?api=YOUR_API_TOKEN&url=https://example.com/download"`;

  const handleCopyApi = () => {
    navigator.clipboard.writeText(curlExample);
    setApiCopied(true);
    setTimeout(() => setApiCopied(false), 2000);
  };

  const payoutGateways = [
    { name: "UPI / QR", min: "$0.25", fee: "0%", time: "< 2 Hours", icon: "⚡", popular: true },
    { name: "PayTM", min: "$0.25", fee: "0%", time: "< 2 Hours", icon: "📱", popular: true },
    { name: "PhonePe", min: "$0.25", fee: "0%", time: "< 2 Hours", icon: "🟣", popular: false },
    { name: "FaucetPay", min: "$0.25", fee: "0%", time: "Instant", icon: "🪙", popular: true },
    { name: "Litecoin (LTC)", min: "$0.25", fee: "0%", time: "< 1 Hour", icon: "Ł", popular: false },
    { name: "USDT (TRC20)", min: "$5.00", fee: "0%", time: "< 3 Hours", icon: "₮", popular: false },
    { name: "PayPal", min: "$5.00", fee: "0%", time: "< 24 Hours", icon: "💳", popular: false },
    { name: "Bank Transfer", min: "$5.00", fee: "0%", time: "< 24 Hours", icon: "🏛️", popular: false }
  ];

  const faqs = [
    {
      q: "What makes TG Links CPM payout rates higher than competitors?",
      a: "TG Links collaborates with premier premium brand advertisers and high-yield direct sponsors. Instead of cluttering visitors with 5 intrusive redirect loops, our streamlined single-step process delivers high advertiser retention, allowing us to maintain a guaranteed $10.00 CPM rate."
    },
    {
      q: "What is the minimum withdrawal amount and when do I get paid?",
      a: "The minimum payout threshold is just $0.25 for UPI, PayTM, PhonePe, FaucetPay, and Litecoin. Payments are processed daily with typical turnaround times under 2 hours."
    },
    {
      q: "Are Telegram channels, YouTube descriptions, and social media links allowed?",
      a: "Yes! TG Links is specifically engineered for Telegram creators, YouTube video descriptions, WhatsApp communities, bio links, forums, and download portals. All organic web and social traffic is fully accepted."
    },
    {
      q: "Can I shorten links automatically using a Telegram bot or REST API?",
      a: "Absolutely. We provide a high-throughput, industry-standard AdLinkFly-compatible Developer REST API and QuickLink endpoint (/st). You can generate links programmatically in Python, Node.js, PHP, or directly inside your Telegram bots."
    },
    {
      q: "Do you offer a referral commission program?",
      a: "Yes. Every publisher earns a lifetime 20% referral commission for all friends and colleagues they refer to TG Links, credited automatically to your account balance."
    }
  ];

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 selection:bg-amber-500/20 selection:text-amber-300 font-sans antialiased overflow-x-hidden">
      {/* AMBIENT RADIAL LIGHTING */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-indigo-900/25 via-amber-600/10 to-transparent blur-[140px] rounded-full opacity-70" />
        <div className="absolute top-[40%] -left-40 w-[600px] h-[600px] bg-indigo-950/20 blur-[160px] rounded-full" />
        <div className="absolute top-[65%] -right-40 w-[600px] h-[600px] bg-amber-950/15 blur-[160px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40" />
      </div>

      {/* TOP NAVIGATION BAR - Strict 3-zone contract */}
      <header className="sticky top-0 z-50 bg-[#07080d]/85 backdrop-blur-xl border-b border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div
            className="flex items-center gap-3 cursor-pointer shrink-0"
            onClick={() => changeTab("home", "/")}
          >
            <SiteLogo logoUrl={siteSettings?.logoUrl} isLoaded={isSettingsLoaded} className="w-10 h-10 object-contain rounded-xl ring-1 ring-white/10" />
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                {siteSettings?.siteName || "TG LINKS"}
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </span>
              <span className="text-[10px] tracking-wider text-slate-400 uppercase font-semibold">
                High-Yield Publisher Network
              </span>
            </div>
          </div>

          {/* Zone 2: Single-line Clean Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <button onClick={() => changeTab("home", "/")} className="hover:text-white transition-colors whitespace-nowrap text-amber-400">
              Overview
            </button>
            <button onClick={() => changeTab("rates", "/rates")} className="hover:text-white transition-colors whitespace-nowrap">
              Publisher Rates
            </button>
            <button onClick={() => changeTab("plans", "/plans")} className="hover:text-white transition-colors whitespace-nowrap">
              Plans
            </button>
            <button onClick={() => changeTab("paymentProof", "/payout-proof")} className="hover:text-white transition-colors whitespace-nowrap">
              Payment Proofs
            </button>
            <button onClick={() => changeTab("contact", "/contact")} className="hover:text-white transition-colors whitespace-nowrap">
              Support
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <button
                onClick={() => onNavigate("dashboard")}
                className="px-5 py-2.5 text-xs font-bold text-[#07080d] bg-amber-400 hover:bg-amber-300 rounded-lg shadow-lg shadow-amber-400/20 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-5 py-2.5 text-xs font-bold text-[#07080d] bg-amber-400 hover:bg-amber-300 rounded-lg shadow-lg shadow-amber-400/20 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                Start Earning
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT CONTENT */}
      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 lg:pt-24 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              {/* Unboxed Typographic Metadata */}
              <div className="flex items-center gap-2.5 text-xs text-slate-400 font-medium">
                <span className="text-amber-400 font-bold uppercase tracking-wider">Apex Yield</span>
                <span aria-hidden="true">·</span>
                <span>${currentCpm.toFixed(2)} Guaranteed CPM</span>
                <span aria-hidden="true">·</span>
                <span>Daily Payouts from {formattedMinPayout}</span>
              </div>

              {/* Refined Display Headline with text-wrap: balance */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.08] [text-wrap:balance]">
                Shorten Links. <br />
                <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 bg-clip-text text-transparent">
                  Maximized Daily Earnings.
                </span>
              </h1>

              {/* Authentic Domain Copy */}
              <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl">
                The high-performance monetization platform engineered for creators, Telegram channels, and web publishers. Experience industry-leading CPM rates, zero intrusive redirects, and same-day payouts directly to your local bank or crypto wallet.
              </p>

              {/* Primary Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  onClick={() => {
                    if (user) onNavigate("dashboard");
                    else onOpenAuth();
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#07080d] font-black text-sm rounded-xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2.5"
                >
                  Create Publisher Account
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => changeTab("rates", "/rates")}
                  className="px-6 py-4 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white font-semibold text-sm rounded-xl border border-white/[0.1] transition-all flex items-center justify-center gap-2"
                >
                  View Payout Rates
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400 border-t border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verified Daily Settlements</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Instant API Shortening</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>20% Lifetime Referral Tier</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Profit Simulator Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-px shadow-2xl">
                <div className="rounded-[15px] bg-[#0c0e17] p-6 sm:p-8 space-y-6">
                  {/* Header of Card */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        Live Earnings Calculator
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Real-time revenue forecast at ${currentCpm.toFixed(2)} CPM</p>
                    </div>
                    {/* Currency Toggle */}
                    <div className="flex items-center p-1 bg-white/[0.05] rounded-lg border border-white/[0.08]">
                      <button
                        onClick={() => setCurrency("USD")}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                          currency === "USD" ? "bg-amber-400 text-[#07080d]" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        USD ($)
                      </button>
                      <button
                        onClick={() => setCurrency("INR")}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                          currency === "INR" ? "bg-amber-400 text-[#07080d]" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        INR (₹)
                      </button>
                    </div>
                  </div>

                  {/* Projected Earnings Display */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Daily Payout</span>
                      <span className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums mt-1 block">
                        {displayDaily}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-400/[0.08] border border-amber-400/20">
                      <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider block">Monthly Payout</span>
                      <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums mt-1 block">
                        {displayMonthly}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Estimated Daily Clicks:</span>
                      <span className="font-bold text-white font-mono tabular-nums bg-white/[0.06] px-2.5 py-1 rounded-md border border-white/[0.08]">
                        {dailyClicks.toLocaleString()} views/day
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1000}
                      max={100000}
                      step={1000}
                      value={dailyClicks}
                      onChange={(e) => setDailyClicks(Number(e.target.value))}
                      className="w-full h-2 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>1,000</span>
                      <span>25,000</span>
                      <span>50,000</span>
                      <span>100,000+</span>
                    </div>
                  </div>

                  {/* Quick Select Presets */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[2500, 5000, 15000, 50000].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setDailyClicks(preset)}
                        className={`py-1.5 text-xs font-semibold rounded-lg border transition-all font-mono tabular-nums ${
                          dailyClicks === preset
                            ? "bg-amber-400/15 border-amber-400 text-amber-300"
                            : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white"
                        }`}
                      >
                        {preset >= 1000 ? `${preset / 1000}k` : preset}
                      </button>
                    ))}
                  </div>

                  {/* CTA Footer in Card */}
                  <div className="pt-2">
                    <button
                      onClick={onOpenAuth}
                      className="w-full py-3 bg-white/[0.06] hover:bg-white/[0.1] text-white font-bold text-xs rounded-xl border border-white/[0.1] transition-all flex items-center justify-center gap-2"
                    >
                      Start Earning with {dailyClicks.toLocaleString()} Daily Views
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* QUICK SHORTENER COMPONENT */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="relative rounded-2xl bg-gradient-to-r from-amber-500/20 via-white/[0.08] to-indigo-500/20 p-px shadow-2xl">
            <div className="rounded-[15px] bg-[#0c0e17] p-6 sm:p-8">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-lg bg-amber-400/10 text-amber-400">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Instant Link Shortener</h3>
                  <p className="text-xs text-slate-400">Paste your destination URL to generate a monetized TG Link instantly</p>
                </div>
              </div>

              <form onSubmit={handleShorten} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-grow">
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/download/file.zip"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-4 py-3.5 bg-black/50 border border-white/[0.1] rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3.5 bg-amber-400 hover:bg-amber-300 disabled:bg-amber-600 text-[#07080d] font-black text-sm rounded-xl transition shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 shrink-0"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#07080d] border-t-transparent rounded-full animate-spin" />
                      Shortening...
                    </span>
                  ) : (
                    <>
                      Shorten URL
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Shortened URL Result Preview */}
              <AnimatePresence>
                {shortenedLink && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-6 p-4 rounded-xl bg-amber-400/[0.06] border border-amber-400/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                        <Check className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-amber-400 block">Monetized Link Ready</span>
                        <a
                          href={`${getBaseShortUrl()}/go/${shortenedLink.code}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm sm:text-base font-mono font-bold text-white hover:text-amber-300 transition truncate block"
                        >
                          {getBaseShortUrl()}/go/{shortenedLink.code}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={copyToClipboard}
                        className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#07080d] font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copied!" : "Copy Link"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* LIVE NETWORK TELEMETRY STRIP - Tabular Figures */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-6 rounded-2xl bg-[#0c0e17] border border-white/[0.07] space-y-1">
              <span className="text-xs text-slate-400 font-medium">Guaranteed CPM Rate</span>
              <div className="text-3xl font-black text-amber-400 font-mono tabular-nums">
                ${currentCpm.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-500 block">Per 1,000 verified clicks</span>
            </div>

            <div className="p-6 rounded-2xl bg-[#0c0e17] border border-white/[0.07] space-y-1">
              <span className="text-xs text-slate-400 font-medium">Minimum Cashout</span>
              <div className="text-3xl font-black text-white font-mono tabular-nums">
                {formattedMinPayout}
              </div>
              <span className="text-[11px] text-slate-500 block">UPI, PayTM, Crypto, PayPal</span>
            </div>

            <div className="p-6 rounded-2xl bg-[#0c0e17] border border-white/[0.07] space-y-1">
              <span className="text-xs text-slate-400 font-medium">Links Monetized</span>
              <div className="text-3xl font-black text-white font-mono tabular-nums">
                {(stats.totalLinks || 12480).toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 block">Active platform links</span>
            </div>

            <div className="p-6 rounded-2xl bg-[#0c0e17] border border-white/[0.07] space-y-1">
              <span className="text-xs text-slate-400 font-medium">Total Clicks Tracked</span>
              <div className="text-3xl font-black text-emerald-400 font-mono tabular-nums">
                {(stats.totalClicks || 854000).toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 block">Real-time unique views</span>
            </div>
          </div>
        </section>

        {/* 3-STEP MECHANISM SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/[0.06]">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Monetization Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight [text-wrap:balance]">
              Three Simple Steps to Daily Earnings
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              No complicated approvals or delayed payouts. Get up and running in less than two minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-[#0c0e17] border border-white/[0.07] space-y-4 relative">
              <span className="text-3xl font-black font-mono text-white/20 block">01</span>
              <h3 className="text-lg font-bold text-white">Create & Shorten Links</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Paste any destination link into your dashboard or use our developer API. Customize aliases and tags to organize your campaigns.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#0c0e17] border border-white/[0.07] space-y-4 relative">
              <span className="text-3xl font-black font-mono text-amber-400/40 block">02</span>
              <h3 className="text-lg font-bold text-white">Share on Channels & Social</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Distribute your links across Telegram channels, YouTube descriptions, Discord servers, and websites. Clean, single-step visitor verification guarantees high conversion.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#0c0e17] border border-white/[0.07] space-y-4 relative">
              <span className="text-3xl font-black font-mono text-emerald-400/40 block">03</span>
              <h3 className="text-lg font-bold text-white">Withdraw Daily Payments</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Reach the $0.25 threshold and request instant settlement directly to UPI, PayTM, PhonePe, FaucetPay, or Crypto.
              </p>
            </div>
          </div>
        </section>

        {/* SUPPORTED PAYOUT GATEWAYS SHOWCASE */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/[0.06]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Fast Settlements</span>
              <h2 className="text-3xl font-black text-white tracking-tight mt-1">Supported Withdrawal Gateways</h2>
              <p className="text-sm text-slate-400 mt-1">Low threshold settlements with zero deduction fees</p>
            </div>
            <button
              onClick={() => changeTab("paymentProof", "/payout-proof")}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition whitespace-nowrap"
            >
              View Live Payment Proofs
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {payoutGateways.map((gw, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-[#0c0e17] border border-white/[0.07] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{gw.icon}</span>
                  <span className="text-[10px] font-bold text-emerald-400 font-mono">{gw.time}</span>
                </div>
                <h4 className="font-bold text-white text-sm">{gw.name}</h4>
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Min: {gw.min}</span>
                  <span>Fee: {gw.fee}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* DEVELOPER API & BOT SHOWCASE */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/[0.06]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Developer First</span>
              <h2 className="text-3xl font-black text-white tracking-tight [text-wrap:balance]">
                Automate Link Shortening With High-Speed REST API
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Connect your Telegram bots, content management systems, or WordPress blogs. Our API supports both JSON responses and QuickLink redirects with 99.9% uptime.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (user) onNavigate("dashboard");
                    else onOpenAuth();
                  }}
                  className="px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white font-bold text-xs rounded-xl border border-white/[0.1] transition flex items-center gap-2"
                >
                  <Code2 className="w-4 h-4 text-amber-400" />
                  Get Your API Key in Dashboard
                </button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl bg-[#0c0e17] border border-white/[0.08] p-5 font-mono text-xs overflow-x-auto shadow-2xl">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                    <span className="ml-2 text-slate-300 font-sans font-medium text-[11px]">API Quickstart</span>
                  </div>
                  <button
                    onClick={handleCopyApi}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white transition text-[11px]"
                  >
                    {apiCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {apiCopied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="text-amber-300 leading-relaxed whitespace-pre-wrap break-all">
                  {curlExample}
                </pre>
                <div className="mt-4 pt-3 border-t border-white/[0.06] text-slate-400 text-[11px]">
                  <span className="text-emerald-400 font-bold">200 OK:</span> {`{"status": "success", "shortenedUrl": "${getBaseShortUrl()}/go/AbCd12"}`}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/[0.06]">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Clear Answers</span>
            <h2 className="text-3xl font-black text-white tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-[#0c0e17] border border-white/[0.07] overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm text-white hover:text-amber-300 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      openFaq === idx ? "rotate-180 text-amber-400" : ""
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 pt-1 text-xs text-slate-400 leading-relaxed border-t border-white/[0.04]">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CALL TO ACTION */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="rounded-3xl bg-gradient-to-b from-amber-400/10 via-white/[0.03] to-transparent border border-amber-400/20 p-8 sm:p-12 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight [text-wrap:balance]">
              Start Monetizing Your Audience Today
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
              Join thousands of creators, Telegram publishers, and media networks earning high daily revenue with TG Links.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={onOpenAuth}
                className="px-8 py-4 bg-amber-400 hover:bg-amber-300 text-[#07080d] font-black text-sm rounded-xl shadow-xl shadow-amber-400/20 transition flex items-center justify-center gap-2"
              >
                Create Free Account
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.07] bg-[#050609] py-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <SiteLogo logoUrl={siteSettings?.logoUrl} isLoaded={isSettingsLoaded} className="w-7 h-7 object-contain rounded-lg" />
            <span className="font-bold text-white">{siteSettings?.siteName || "TG LINKS"}</span>
            <span>·</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <button onClick={() => changeTab("rates", "/rates")} className="hover:text-white transition">Rates</button>
            <button onClick={() => changeTab("plans", "/plans")} className="hover:text-white transition">Plans</button>
            <button onClick={() => changeTab("contact", "/contact")} className="hover:text-white transition">Support</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
