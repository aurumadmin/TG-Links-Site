import React, { useState, useEffect } from "react";
import { ArrowRight, Link2, Eye, ShieldAlert, Sparkles, DollarSign, Activity, FileText, Mail, ArrowUpRight, HelpCircle, Copy, Check } from "lucide-react";
import { motion } from "motion/react";
import { fetchApi } from "../lib/api";
import SiteLogo, { getCachedSettings } from "./SiteLogo";

const getBaseShortUrl = () => {
  const hostname = window.location.hostname;
  const isProd = !hostname.includes("localhost") && !hostname.includes("127.0.0.1") && !hostname.includes("ais-dev") && !hostname.includes("ais-pre");
  return isProd ? "https://tglinks.eu.cc" : window.location.origin;
};

interface LandingPageProps {
  onNavigate: (page: string) => void;
  user: any;
  onOpenAuth: () => void;
  initialTab?: string;
  siteSettings?: any;
  isSettingsLoaded?: boolean;
}

export default function LandingPage({ onNavigate, user, onOpenAuth, initialTab, siteSettings: propSettings, isSettingsLoaded = true }: LandingPageProps) {
  const [url, setUrl] = useState("");
  const [shortenedLink, setShortenedLink] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({
    totalLinks: 0,
    totalClicks: 0,
    totalUsers: 0,
    globalCpm: 5.0
  });
  const [siteSettings, setSiteSettings] = useState<any>(() => propSettings || getCachedSettings());
  const [activeTab, setActiveTab] = useState(initialTab || "home"); // home, rates, contact, privacy, dmca, terms

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (propSettings) {
      setSiteSettings(propSettings);
    }
  }, [propSettings]);

  useEffect(() => {
    // Load live site analytics from public stats endpoint
    fetchApi("/public/stats")
      .then((res) => {
        setStats({
          totalLinks: res.totalLinks !== undefined ? res.totalLinks : 0,
          totalClicks: res.totalClicks !== undefined ? res.totalClicks : 0,
          totalUsers: res.totalUsers !== undefined ? res.totalUsers : 0,
          globalCpm: res.globalCpm || 5.0
        });
      })
      .catch((err) => console.error("Error loading public stats:", err));

    if (!propSettings) {
      fetchApi("/settings")
        .then((res) => setSiteSettings(res))
        .catch((err) => console.error("Error loading public settings:", err));
    }
  }, [propSettings]);

  const changeTab = (tab: string, path: string) => {
    setActiveTab(tab);
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
  };

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    try {
      const res = await fetchApi("/links/shorten", {
        method: "POST",
        body: JSON.stringify({
          originalUrl: url,
          userId: user ? user.id : "guest"
        })
      });
      if (res.link) {
        setShortenedLink(res.link);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to shorten link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!shortenedLink) return;
    const fullUrl = `${getBaseShortUrl()}/go/${shortenedLink.code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Publisher Rates country list with multipliers
  const countries = [
    { name: "Worldwide Deal (Global)", code: "GL", cpm: stats.globalCpm, type: "Desktop / Mobile" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-200" id="landing_root">
      {/* HEADER NAVIGATION */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-indigo-950/10" id="landing_header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => changeTab("home", "/")} id="landing_logo">
            <SiteLogo logoUrl={siteSettings?.logoUrl} isLoaded={isSettingsLoaded} className="w-10 h-10 object-contain rounded-xl" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1 leading-none">
                <span className="text-2xl font-black tracking-tight text-indigo-400">TG</span>
                <span className="text-2xl font-black tracking-tight text-emerald-400">LINKS</span>
              </div>
              <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500 mt-0.5">
                Short Links and Earn Money
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-6 text-sm font-semibold text-slate-400" id="landing_nav">
            <button 
              onClick={() => changeTab("home", "/")} 
              className={`hover:text-indigo-400 transition ${activeTab === "home" ? "text-indigo-400 border-b-2 border-indigo-500 pb-1" : ""}`}
            >
              Home
            </button>
            <button 
              onClick={() => changeTab("rates", "/rates")} 
              className={`hover:text-indigo-400 transition ${activeTab === "rates" ? "text-indigo-400 border-b-2 border-indigo-500 pb-1" : ""}`}
            >
              Publisher Rates
            </button>
            <button 
              onClick={() => {
                if (user) onNavigate("dashboard");
                else onOpenAuth();
              }} 
              className="hover:text-indigo-400 transition"
            >
              Dashboard
            </button>
          </nav>

          {/* CTA Button */}
          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => onNavigate("dashboard")}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 text-sm"
                id="btn_to_dashboard"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 text-sm"
                id="btn_login_register"
              >
                Dashboard
              </button>
            )}
          </div>
        </div>
      </header>

      {/* RENDER ACTIVE TAB BODY */}
      <main className="flex-grow">
        {activeTab === "home" && (
          <div id="landing_home_tab">
            {/* HERO SECTION */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Hero Left Content */}
              <div className="lg:col-span-7 flex flex-col space-y-6">
                {/* Payout Badge */}
                <div className="inline-flex">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-950/40 text-xs font-bold text-indigo-400 border border-indigo-900/50">
                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] uppercase font-black">New</span>
                    Best URL Shortener
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Hero Headings */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                  Unlock the Power of <span className="text-emerald-400">Shortened</span> URLs
                  <br />
                  <span className="text-slate-100">Monetize your </span>
                  <span className="text-indigo-400 inline-block relative">
                    Links.
                    <span className="absolute left-0 right-0 bottom-1 h-2 bg-indigo-950/80 -z-10 rounded-full"></span>
                  </span>
                </h1>

                {/* Hero Description */}
                <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                  Step into the new age of monetization. Every link you share has potential, and we help you tap into it. Whether you're a content creator, influencer, or blogger, our URL shortener is not just about making links concise - it's about maximizing their value.
                </p>

                {/* Get Started Button */}
                <div className="pt-2 flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => {
                      if (user) onNavigate("dashboard");
                      else onOpenAuth();
                    }}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-base rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2.5"
                  >
                    Get started
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Hero Right Visual Art */}
              <div className="lg:col-span-5 relative flex justify-center">
                <div className="relative w-full max-w-[420px] aspect-square bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800/80 flex items-center justify-center overflow-hidden">
                  {/* Grid Background Pattern */}
                  <div className="absolute inset-0 bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.1))] -z-10" />

                  {/* Gradient Glows */}
                  <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-indigo-600 rounded-full filter blur-3xl opacity-20 animate-pulse" />
                  <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-rose-600 rounded-full filter blur-3xl opacity-10" />

                  {/* High Quality Illustration Structure */}
                  <svg viewBox="0 0 400 400" className="w-full h-full">
                    {/* Background frame */}
                    <rect x="80" y="80" width="240" height="280" rx="20" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
                    <rect x="95" y="100" width="210" height="240" rx="12" fill="#020617" />
                    
                    {/* View statistics graph line decoration */}
                    <path d="M 105 300 Q 150 250 190 280 T 295 180" fill="none" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="295" cy="180" r="6" fill="#6366f1" />
                    
                    {/* Character */}
                    {/* Neck and ears */}
                    <rect x="185" y="165" width="30" height="30" rx="4" fill="#fed7aa" />
                    <circle cx="178" cy="180" r="6" fill="#fed7aa" />
                    <circle cx="222" cy="180" r="6" fill="#fed7aa" />
                    
                    {/* Head */}
                    <circle cx="200" cy="160" r="28" fill="#fecdd3" />
                    {/* Hair */}
                    <path d="M 170 160 Q 185 130 200 135 Q 215 130 230 160 Q 225 120 200 120 Q 175 120 170 160" fill="#1e293b" />
                    <path d="M 172 150 C 180 142 195 142 200 148 C 205 142 220 142 228 150" fill="none" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
                    
                    {/* Face features */}
                    <circle cx="192" cy="158" r="2" fill="#1e293b" />
                    <circle cx="208" cy="158" r="2" fill="#1e293b" />
                    {/* Happy Smile */}
                    <path d="M 194 168 Q 200 174 206 168" fill="none" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />

                    {/* Torso & Arms */}
                    <path d="M 150 230 Q 170 190 200 190 Q 230 190 250 230 Z" fill="#1e293b" />
                    <path d="M 160 210 Q 180 205 200 208 Q 220 205 240 210" fill="none" stroke="#4f46e5" strokeWidth="1.5" />
                    {/* T-Shirt Collar */}
                    <path d="M 185 190 Q 200 202 215 190" fill="none" stroke="#4f46e5" strokeWidth="3" />

                    {/* Legs / Jeans */}
                    <rect x="175" y="295" width="22" height="85" rx="5" fill="#1e3a8a" />
                    <rect x="203" y="295" width="22" height="85" rx="5" fill="#1e3a8a" />
                    
                    {/* Hands holding money & phone */}
                    {/* Left hand holding phone */}
                    <path d="M 245 220 Q 260 175 265 170" fill="none" stroke="#fecdd3" strokeWidth="10" strokeLinecap="round" />
                    {/* Phone device */}
                    <rect x="255" y="145" width="20" height="38" rx="4" transform="rotate(10, 265, 164)" fill="#22c55e" />
                    <rect x="258" y="148" width="14" height="32" rx="2" transform="rotate(10, 265, 164)" fill="#15803d" />
                    
                    {/* Right Hand holding cash */}
                    <path d="M 155 220 Q 185 200 195 210" fill="none" stroke="#fecdd3" strokeWidth="10" strokeLinecap="round" />
                    {/* Stack of Cash Bills */}
                    <ellipse cx="190" cy="205" rx="14" ry="8" fill="#4ade80" />
                    <ellipse cx="195" cy="200" rx="14" ry="8" fill="#22c55e" />
                    <ellipse cx="192" cy="195" rx="14" ry="8" fill="#15803d" />
                    {/* Dollar signs in cash */}
                    <text x="188" y="198" fontFamily="sans-serif" fontSize="8" fontWeight="bold" fill="#ffffff" textAnchor="middle">$</text>
                    <text x="192" y="203" fontFamily="sans-serif" fontSize="8" fontWeight="bold" fill="#ffffff" textAnchor="middle">$</text>

                    {/* Bubble Labels */}
                    {/* Bubble 1: $13 */}
                    <rect x="50" y="115" width="48" height="26" rx="8" fill="#f43f5e" />
                    <text x="74" y="132" fontFamily="sans-serif" fontSize="11" fontWeight="extrabold" fill="#ffffff" textAnchor="middle">$13</text>
                    <polygon points="70,141 78,141 74,146" fill="#f43f5e" />

                    {/* Bubble 2: Views badge */}
                    <rect x="25" y="325" width="115" height="30" rx="8" fill="#22c55e" />
                    <text x="82" y="344" fontFamily="sans-serif" fontSize="11" fontWeight="bold" fill="#ffffff" textAnchor="middle">👁 25,325.23</text>
                    <rect x="115" y="325" width="25" height="30" rx="4" fill="#166534" opacity="0.3" />
                    <text x="127" y="344" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#ffffff" textAnchor="middle">2/3</text>

                    {/* Bubble 3: $420 */}
                    <rect x="300" y="330" width="60" height="28" rx="8" fill="#3b82f6" />
                    <text x="330" y="348" fontFamily="sans-serif" fontSize="11" fontWeight="extrabold" fill="#ffffff" textAnchor="middle">$420</text>
                    <polygon points="325,330 335,330 330,324" fill="#3b82f6" />

                    {/* Like indicator badge */}
                    <circle cx="65" cy="240" r="16" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                    <path d="M60 245 C60 245 56 242 56 238 C56 234 59 233 61 235 C62 233 65 233 66 235 C67 233 70 234 70 238 C70 242 66 245 66 245 Z" fill="#22c55e" transform="scale(0.8) translate(14, 53)" />
                  </svg>
                </div>
              </div>
            </div>

            {/* QUICK SHORTENER COMPONENT */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 pb-16">
              <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-6 md:p-8">
                <h3 className="text-xl font-extrabold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />
                  Shorten Link Now & Estimate Your Earnings
                </h3>
                
                <form onSubmit={handleShorten} className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Link2 className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      type="url"
                      required
                      placeholder="Paste your destination URL here..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="block w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-950 focus:border-indigo-500 outline-none transition text-base text-slate-200 placeholder:text-slate-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="md:px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 text-base"
                  >
                    {loading ? "Shortening..." : "Shorten URL"}
                  </button>
                </form>

                {/* SHORTENED RESULTS SECTION */}
                {shortenedLink && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 md:p-5 bg-indigo-950/30 border border-indigo-900/50 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-grow">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Your Shortened Link</p>
                      <span className="font-mono font-bold text-indigo-400 text-sm md:text-base break-all">
                        {getBaseShortUrl()}/go/{shortenedLink.code}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        Est. CPM: <span className="font-bold text-emerald-400">${shortenedLink.cpm.toFixed(2)}</span> per 1,000 views.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-950 border border-indigo-900/50 text-indigo-400 font-bold text-sm rounded-lg hover:bg-indigo-950/80 transition-all shadow-sm w-full md:w-auto"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy Link
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const fullUrl = `${getBaseShortUrl()}/go/${shortenedLink.code}`;
                          window.open(fullUrl, "_blank");
                        }}
                        className="flex items-center justify-center gap-1 px-4 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-500 transition shadow-sm w-full md:w-auto"
                      >
                        Test Link
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 font-semibold justify-center md:justify-start">
                  <span className="flex items-center gap-1">✅ 100% Secure redirection</span>
                  <span className="flex items-center gap-1">⚡ Instant Shortening API</span>
                  <span className="flex items-center gap-1">📊 Professional Click Log</span>
                </div>
              </div>
            </div>

            {/* THREE STEPS */}
            <section className="bg-slate-950 py-16 border-t border-slate-900">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">How does it work?</h2>
                  <p className="text-slate-400 mt-2">Start earning extra cash on your online traffic in three easy steps.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Step 1 */}
                  <div className="flex flex-col items-center text-center p-6 bg-slate-900 border border-slate-800/60 rounded-2xl hover:shadow-md transition">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 text-indigo-400 border border-indigo-900/30 flex items-center justify-center mb-6 font-black text-2xl">1</div>
                    <h3 className="text-lg font-bold text-white mb-2">Create an Account</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">Sign up for a free publisher account in less than 30 seconds. No credit card required.</p>
                  </div>
                  {/* Step 2 */}
                  <div className="flex flex-col items-center text-center p-6 bg-slate-900 border border-slate-800/60 rounded-2xl hover:shadow-md transition">
                    <div className="w-16 h-16 rounded-2xl bg-rose-950/60 text-rose-400 border border-rose-900/30 flex items-center justify-center mb-6 font-black text-2xl">2</div>
                    <h3 className="text-lg font-bold text-white mb-2">Shorten & Share</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">Paste any long website URL, shorten it, and share it on YouTube, blogs, forums, or social networks.</p>
                  </div>
                  {/* Step 3 */}
                  <div className="flex flex-col items-center text-center p-6 bg-slate-900 border border-slate-800/60 rounded-2xl hover:shadow-md transition">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 text-emerald-400 border border-emerald-900/30 flex items-center justify-center mb-6 font-black text-2xl">3</div>
                    <h3 className="text-lg font-bold text-white mb-2">Withdraw Earnings</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">Earn money based on link impressions. Instantly withdraw payouts once you hit only $2.00!</p>
                  </div>
                </div>
              </div>
            </section>

            {/* STATISTICS OVERVIEW */}
            <section className="bg-slate-900/40 border-t border-b border-slate-850 py-16">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-4xl sm:text-5xl font-black text-emerald-400">{stats.totalClicks.toLocaleString()}+</div>
                  <p className="text-slate-400 mt-2 font-semibold text-sm uppercase tracking-wider">Total Click Views Served</p>
                </div>
                <div>
                  <div className="text-4xl sm:text-5xl font-black text-indigo-400">{stats.totalLinks.toLocaleString()}+</div>
                  <p className="text-slate-400 mt-2 font-semibold text-sm uppercase tracking-wider">Shortened URLs Created</p>
                </div>
                <div>
                  <div className="text-4xl sm:text-5xl font-black text-purple-400">{stats.totalUsers.toLocaleString()}+</div>
                  <p className="text-slate-400 mt-2 font-semibold text-sm uppercase tracking-wider">Happy Publisher Users</p>
                </div>
              </div>
            </section>

            {/* KEY FEATURES */}
            <section className="py-20 bg-slate-950">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">Why Choose TG Links?</h2>
                  <p className="text-slate-400 mt-2">We provide the most feature-rich, high-paying adlink syndication platform on the web.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                    <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-900/30 text-indigo-400 flex items-center justify-center mb-4">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-white text-lg mb-2">Highest CPM Rates</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">Earn up to $15.00 per 1,000 views! We negotiate top-tier ad network rates to maximize your returns.</p>
                  </div>

                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                    <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-900/30 text-emerald-400 flex items-center justify-center mb-4">
                      <Activity className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-white text-lg mb-2">Deep Live Analytics</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">Track your impressions, referral performance, and CPM rates live in our client dashboard.</p>
                  </div>

                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                    <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-900/30 text-purple-400 flex items-center justify-center mb-4">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-white text-lg mb-2">Multiple APIs Chaining</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">Admin can pool external AdLinkFly shorteners inside our platform. Maximum passive yields guaranteed.</p>
                  </div>

                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                    <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-900/30 text-rose-400 flex items-center justify-center mb-4">
                      <Mail className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-white text-lg mb-2">Dedicated Support</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">Got questions? Our customer service team is online 24/7 to help approve payments and manage links.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: PUBLISHER RATES */}
        {activeTab === "rates" && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16" id="tab_rates">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Earnings Calculator</span>
              <h1 className="text-4xl font-extrabold text-white tracking-tight mt-1">Publisher Payout CPM Rates</h1>
              <p className="text-slate-400 mt-2">See how much you will earn per 1,000 views of your shortened URLs based on visitor country.</p>
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-extrabold text-xs uppercase tracking-wider border-b border-slate-800">
                    <th className="py-4 px-6">Country Flag & Name</th>
                    <th className="py-4 px-6 text-right">Payout per 1,000 Views (CPM)</th>
                    <th className="py-4 px-6 text-center">Traffic Source Allowed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                  {countries.map((country, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/40 transition">
                      <td className="py-4 px-6 font-semibold text-white flex items-center gap-3">
                        <span className="text-xl">
                          {country.code === "US" && "🇺🇸"}
                          {country.code === "GB" && "🇬🇧"}
                          {country.code === "DE" && "🇩🇪"}
                          {country.code === "CA" && "🇨🇦"}
                          {country.code === "IN" && "🇮🇳"}
                          {country.code === "ID" && "🇮🇩"}
                          {country.code === "GL" && "🌐"}
                        </span>
                        {country.name}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-emerald-450 text-base">
                        ${country.cpm.toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-center text-xs text-slate-400 font-medium">
                        <span className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-md">{country.type}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 bg-indigo-950/40 border border-indigo-900/40 p-6 rounded-2xl text-center">
              <h4 className="font-bold text-indigo-300 mb-1">Looking for custom deals?</h4>
              <p className="text-xs text-indigo-400 leading-relaxed max-w-xl mx-auto">
                If you generate over 10,000 unique impressions daily from high-quality sources, contact us to unlock special VIP CPM tiers with custom payment options.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: CONTACT US */}
        {activeTab === "contact" && (
          <div className="max-w-xl mx-auto px-4 py-16" id="tab_contact">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-extrabold text-white">Contact Our Support Team</h1>
              <p className="text-slate-400 text-sm mt-1">Have questions about withdrawals or advertising? We're here to help.</p>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); alert("Thank you! Your inquiry has been sent successfully."); setUrl(""); }} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Your Full Name</label>
                <input required type="text" placeholder="John Doe" className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-950 focus:border-indigo-500 outline-none transition text-sm text-slate-200 placeholder:text-slate-700" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Your Email Address</label>
                <input required type="email" placeholder="john@example.com" className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-950 focus:border-indigo-500 outline-none transition text-sm text-slate-200 placeholder:text-slate-700" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Subject</label>
                <input required type="text" placeholder="Payment delayed / link disabled query" className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-950 focus:border-indigo-500 outline-none transition text-sm text-slate-200 placeholder:text-slate-700" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Message Detail</label>
                <textarea required rows={4} placeholder="Type your detailed support query here..." className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-950 focus:border-indigo-500 outline-none transition text-sm text-slate-200 placeholder:text-slate-700"></textarea>
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-indigo-600/20">
                Send Inquiry Message
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: PRIVACY POLICY */}
        {activeTab === "privacy" && (
          <div className="max-w-4xl mx-auto px-4 py-16 text-slate-300 leading-relaxed text-sm space-y-6" id="tab_privacy">
            <h1 className="text-3xl font-extrabold text-white mb-6">Privacy Policy</h1>
            <p>At TG Links, accessible from our portal, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by TG Links and how we use it.</p>
            <h3 className="text-lg font-bold text-white mt-6">Log Files</h3>
            <p>TG Links follows a standard procedure of using log files. These files log visitors when they visit shortened URLs. The information collected by log files includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users' movement on the website, and gathering demographic information.</p>
            <h3 className="text-lg font-bold text-white">Cookies and Web Beacons</h3>
            <p>Like any other website, TG Links uses 'cookies'. These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.</p>
          </div>
        )}

        {/* TAB 5: DMCA */}
        {activeTab === "dmca" && (
          <div className="max-w-4xl mx-auto px-4 py-16 text-slate-300 leading-relaxed text-sm space-y-6" id="tab_dmca">
            <h1 className="text-3xl font-extrabold text-white mb-6">DMCA & Copyright Policy</h1>
            <p>TG Links respects the intellectual property rights of others. In accordance with the Digital Millennium Copyright Act ("DMCA"), we will respond expeditiously to claims of copyright infringement committed using our URL shortening service.</p>
            <p>If you are a copyright owner, authorized to act on behalf of one, or authorized to act under any exclusive right under copyright, please report alleged copyright infringements taking place on or through the Site by completing a DMCA Notice of Alleged Infringement and delivering it to our designated support email address.</p>
            <h3 className="text-lg font-bold text-white">Take Down Procedure</h3>
            <p>Upon receipt of a valid DMCA notice, we will immediately disable or delete the offending shortened link from our platform. Standard actions are completed within 24 hours of report receipt.</p>
          </div>
        )}

        {/* TAB 6: TERMS OF SERVICE */}
        {activeTab === "terms" && (
          <div className="max-w-4xl mx-auto px-4 py-16 text-slate-300 leading-relaxed text-sm space-y-6" id="tab_terms">
            <h1 className="text-3xl font-extrabold text-white mb-6">Terms of Service</h1>
            <p>By accessing or registering with TG Links, you agree to comply with and be bound by the following Terms & Conditions:</p>
            <h3 className="text-lg font-bold text-white mt-6">1. Publisher Rules & Fraud Prevention</h3>
            <p>As a publisher, you must NOT engage in fraudulent tactics to inflate views. This includes, but is not limited to: autoframes, popunder scripts triggered programmatically, bot clicks, exchanging views, incentivized micro-tasks, or generating multiple fake view cycles from your own IP addresses. Any account found to violate these rules will be permanently suspended, and all earnings forfeited.</p>
            <h3 className="text-lg font-bold text-white">2. Link Restrictions</h3>
            <p>Shortening links containing adult content, malware, spyware, virus distribution, piracy material, torrents, or copyright-infringing content is strictly prohibited. TG Links reserves the right to suspend any link and block pending payouts without prior warning.</p>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900" id="landing_footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
          <div className="flex items-center gap-3">
            <SiteLogo logoUrl={siteSettings?.logoUrl} isLoaded={isSettingsLoaded} className="w-8 h-8 object-contain rounded-lg" />
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-sm">TG Links</span>
              <span className="text-[10px] text-slate-500 mt-0.5">© 2026 TG Links Inc. All rights reserved.</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-800/80 shadow-inner">
            <span>Proudly Made with 💝 in India</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
