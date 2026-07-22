import React, { useState, useEffect } from "react";
import { fetchApi } from "../lib/api";
import { 
  User, 
  Link, 
  Withdrawal, 
  DashboardStats, 
  SystemSettings,
  SupportTicket
} from "../types";
import { 
  LayoutDashboard, 
  Link2, 
  DollarSign, 
  CreditCard, 
  Sliders, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  TrendingUp, 
  Eye, 
  AlertCircle, 
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  LogOut,
  SlidersHorizontal,
  FolderOpen,
  UserCheck,
  Mail,
  Menu,
  X,
  QrCode
} from "lucide-react";
import QRCode from "qrcode";
import { motion } from "motion/react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

import SiteLogo, { getCachedSettings } from "./SiteLogo";

const getBaseShortUrl = () => {
  const hostname = window.location.hostname;
  const isProd = !hostname.includes("localhost") && !hostname.includes("127.0.0.1") && !hostname.includes("ais-dev") && !hostname.includes("ais-pre");
  return isProd ? "https://tglinks.eu.cc" : window.location.origin;
};

interface DashboardPageProps {
  user: User;
  initialTab?: "overview" | "links" | "withdraw" | "settings" | "tools" | "contact";
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export default function DashboardPage({ user, initialTab, onLogout, onNavigate }: DashboardPageProps) {
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [activeTab, setActiveTab] = useState<"overview" | "links" | "withdraw" | "settings" | "tools" | "contact">(initialTab || "overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(() => getCachedSettings());

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const changeTab = (tab: "overview" | "links" | "withdraw" | "settings" | "tools" | "contact", path: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
  };
  const [reportTab, setReportTab] = useState<"daily" | "monthly">("daily");
  
  // Create link state
  const [newUrl, setNewUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [shortenedLink, setShortenedLink] = useState<Link | null>(null);
  const [shortenLoading, setShortenLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedApiToken, setCopiedApiToken] = useState(false);

  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Profile withdrawal settings state
  const [userMethod, setUserMethod] = useState(user.withdrawalMethod || "");
  const [userAccount, setUserAccount] = useState(user.withdrawalAccount || "");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Faucet state
  const [faucetModeEnabled, setFaucetModeEnabled] = useState(user.enableFaucetMode || false);
  const [showFaucetModal, setShowFaucetModal] = useState(false);
  const [faucetModalLoading, setFaucetModalLoading] = useState(false);
  const [faucetSettingsSuccess, setFaucetSettingsSuccess] = useState("");

  // Advanced shortener options state
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Support inquiry state
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSuccess, setSupportSuccess] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);

  const loadUserTickets = async () => {
    try {
      const res = await fetchApi(`/tickets/user/${user.id}`);
      if (res.tickets) {
        setUserTickets(res.tickets);
      }
    } catch (err) {
      console.error("Failed to load user support tickets:", err);
    }
  };

  // QR Code generator state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalLinkUrl, setQrModalLinkUrl] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  const handleGenerateQrCode = async (linkUrl: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(linkUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#0f172a", // slate-900
          light: "#ffffff" // white
        }
      });
      setQrCodeDataUrl(dataUrl);
      setQrModalLinkUrl(linkUrl);
      setQrModalOpen(true);
    } catch (err) {
      console.error(err);
      alert("Failed to generate QR Code");
    }
  };

  const copyQrCodeImage = async () => {
    try {
      const response = await fetch(qrCodeDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      alert("QR Code image copied to your clipboard!");
    } catch (err) {
      console.error(err);
      alert("Failed to copy image. Please try downloading the QR Code using the button.");
    }
  };

  const downloadQrCodeImage = () => {
    const linkElement = document.createElement("a");
    linkElement.href = qrCodeDataUrl;
    linkElement.download = `tglinks-qr-${qrModalLinkUrl.split("/").pop()}.png`;
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
  };

  const loadDashboardData = async () => {
    try {
      const [statsRes, linksRes, withdrawsRes, settingsRes] = await Promise.all([
        fetchApi(`/dashboard/stats/${user.id}`),
        fetchApi(`/links/user/${user.id}`),
        fetchApi(`/withdrawals/user/${user.id}`),
        fetchApi("/settings")
      ]);

      setStats(statsRes);
      setLinks(linksRes.links);
      setWithdrawals(withdrawsRes.withdrawals);
      setSettings(settingsRes);
      
      // Update local profile states with fresh DB values if any
      const freshUser = await fetchApi("/auth/me");
      if (freshUser && freshUser.user) {
        setCurrentUser(freshUser.user);
        setUserMethod(freshUser.user.withdrawalMethod || "");
        setUserAccount(freshUser.user.withdrawalAccount || "");
        setFaucetModeEnabled(!!freshUser.user.enableFaucetMode);
        setShowFaucetModal(false);
      }
    } catch (err) {
      console.error("Failed to load dashboard statistics:", err);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadUserTickets();
  }, [user.id]);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    setShortenLoading(true);
    setShortenedLink(null);
    try {
      const res = await fetchApi("/links/shorten", {
        method: "POST",
        body: JSON.stringify({
          originalUrl: newUrl,
          userId: user.id,
          customAlias: customAlias.trim() || undefined,
          expiresAt: expiresAt || undefined
        })
      });
      if (res.link) {
        setShortenedLink(res.link);
        setNewUrl("");
        setCustomAlias("");
        setExpiresAt("");
        // Reload link list and statistics
        loadDashboardData();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to shorten link.");
    } finally {
      setShortenLoading(false);
    }
  };

  const copyLink = (code: string) => {
    const fullUrl = `${getBaseShortUrl()}/go/${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shortened URL?")) return;
    try {
      await fetchApi(`/links/${id}`, { method: "DELETE" });
      setLinks(links.filter(l => l.id !== id));
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete link.");
    }
  };

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSuccess("");

    if (!userMethod || !userAccount) {
      setWithdrawError("Please configure your withdrawal method & account in the settings tab first.");
      return;
    }

    const amountNum = Number(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setWithdrawError("Please enter a valid withdrawal amount.");
      return;
    }

    if (settings && amountNum < settings.minWithdrawal) {
      setWithdrawError(`The minimum withdrawal threshold is $${settings.minWithdrawal.toFixed(2)}`);
      return;
    }

    if (stats && stats.balance < amountNum) {
      setWithdrawError("Insufficient available balance in your wallet.");
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await fetchApi("/withdrawals/request", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          amount: amountNum,
          method: userMethod,
          account: userAccount
        })
      });

      if (res.success) {
        setWithdrawSuccess(`Success! Your request for $${amountNum.toFixed(2)} is submitted for processing.`);
        setWithdrawAmount("");
        loadDashboardData();
      }
    } catch (err: any) {
      setWithdrawError(err.message || "Failed to submit withdrawal request.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess("");
    try {
      const res = await fetchApi("/users/withdrawal-settings", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          method: userMethod,
          account: userAccount
        })
      });
      if (res.success) {
        setProfileSuccess("Withdrawal details updated successfully!");
        setTimeout(() => setProfileSuccess(""), 4000);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update profile settings.");
    }
  };

  const handleToggleFaucetMode = async (enabled: boolean) => {
    try {
      setFaucetModalLoading(true);
      const res = await fetchApi("/users/faucet-settings", {
        method: "POST",
        body: JSON.stringify({
          userId: currentUser.id,
          enableFaucetMode: enabled
        })
      });
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setFaucetModeEnabled(!!res.user.enableFaucetMode);
        setFaucetSettingsSuccess("Faucet Mode updated successfully!");
        setTimeout(() => setFaucetSettingsSuccess(""), 3000);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update Faucet Mode settings.");
    } finally {
      setFaucetModalLoading(false);
    }
  };

  const handleDismissFaucetModal = async (enableFaucetMode: boolean) => {
    try {
      setFaucetModalLoading(true);
      const res = await fetchApi("/users/faucet-settings", {
        method: "POST",
        body: JSON.stringify({
          userId: currentUser.id,
          enableFaucetMode,
          faucetPromptSeen: true
        })
      });
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setFaucetModeEnabled(!!res.user.enableFaucetMode);
        setShowFaucetModal(false);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save Faucet settings.");
    } finally {
      setFaucetModalLoading(false);
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject || !supportMessage) return;
    setSupportLoading(true);
    setSupportSuccess("");
    try {
      const res = await fetchApi("/tickets", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          subject: supportSubject,
          message: supportMessage
        })
      });
      if (res.success) {
        setSupportSuccess("Support ticket created and saved! An email alert has been sent via SMTP to our support team.");
        setSupportSubject("");
        setSupportMessage("");
        loadUserTickets();
      } else {
        alert(res.error || "Failed to submit support request.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to submit support request. Please try again.");
    } finally {
      setSupportLoading(false);
    }
  };

  const activeWithdrawalsSum = withdrawals
    .filter(w => w.status === "pending")
    .reduce((sum, w) => sum + w.amount, 0);

  const completedWithdrawalsSum = withdrawals
    .filter(w => w.status === "approved")
    .reduce((sum, w) => sum + w.amount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row relative" id="dashboard_root">
      
      {/* Mobile Top Header Navigation */}
      <header className="flex md:hidden items-center justify-between bg-slate-900 border-b border-slate-800/80 px-5 py-4 sticky top-0 z-40 w-full" id="mobile_dashboard_header">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate("home")}>
          <SiteLogo logoUrl={settings?.logoUrl} isLoaded={!!settings} className="w-8 h-8 object-contain rounded-lg" />
          <div className="flex items-center gap-1">
            <span className="text-2xl font-black text-white tracking-tight">TG</span>
            <span className="text-2xl font-black text-indigo-500 tracking-tight">LINKS</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-200 transition focus:outline-none"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className={`
        fixed md:sticky top-0 z-50 md:z-auto h-screen md:h-auto
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        transition-transform duration-300 ease-in-out
        w-72 md:w-64 bg-slate-900 text-slate-400 flex flex-col border-r border-slate-800/80
        inset-y-0 left-0 md:flex shrink-0
      `} id="dashboard_sidebar">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate("home")}>
            <SiteLogo logoUrl={settings?.logoUrl} isLoaded={!!settings} className="w-10 h-10 object-contain rounded-xl" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1 leading-none">
                <span className="text-xl font-black text-white tracking-tight">TG</span>
                <span className="text-xl font-black text-indigo-500 tracking-tight">LINKS</span>
              </div>
              <span className="text-[8px] uppercase tracking-widest font-bold text-slate-500 mt-1 leading-none">
                Publisher Dashboard
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Quick Mini Profile */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-extrabold text-white shrink-0">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className="flex-grow overflow-hidden">
            <p className="text-xs text-white font-bold truncate">{user.email}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-emerald-400" />
              {user.role === "admin" ? "Platform Admin" : "Publisher"}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-grow p-4 space-y-1.5 text-sm font-semibold overflow-y-auto" id="sidebar_nav">
          <button
            onClick={() => changeTab("overview", "/dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === "overview" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "hover:bg-slate-800/50 hover:text-white"}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview Analytics
          </button>
          
          <button
            onClick={() => changeTab("links", "/dashboard/links")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === "links" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "hover:bg-slate-800/50 hover:text-white"}`}
          >
            <Link2 className="w-4 h-4" />
            Manage Links ({links.length})
          </button>

          <button
            onClick={() => changeTab("withdraw", "/dashboard/withdrawals")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === "withdraw" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "hover:bg-slate-800/50 hover:text-white"}`}
          >
            <DollarSign className="w-4 h-4" />
            Withdraw Earnings
          </button>

          <button
            onClick={() => changeTab("settings", "/dashboard/settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === "settings" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "hover:bg-slate-800/50 hover:text-white"}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Payout Settings
          </button>

          <button
            onClick={() => changeTab("tools", "/api")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === "tools" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "hover:bg-slate-800/50 hover:text-white"}`}
          >
            <Sliders className="w-4 h-4" />
            Developer Tools / API
          </button>

          <button
            onClick={() => changeTab("contact", "/dashboard/tickets")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === "contact" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "hover:bg-slate-800/50 hover:text-white"}`}
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </button>

          {user.role === "admin" && (
            <div className="pt-4 mt-4 border-t border-slate-800/80 space-y-1.5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-4 mb-2">Admin Section</p>
              <button
                onClick={() => { onNavigate("admin"); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-rose-950 to-rose-900/80 border border-rose-900/40 hover:from-rose-900 hover:to-rose-800 rounded-xl text-rose-200 transition"
                id="btn_admin_portal"
              >
                <FolderOpen className="w-4 h-4 text-rose-400" />
                Go to Admin Panel
              </button>
            </div>
          )}
        </nav>

        {/* Sidebar Footer logout */}
        <div className="p-4 border-t border-slate-800/80" id="sidebar_footer">
          <button
            onClick={() => { onLogout(); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-950/40 hover:text-rose-400 font-semibold text-slate-500 transition text-sm"
          >
            <LogOut className="w-4 h-4" />
            Log Out Account
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-grow p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full bg-slate-950" id="dashboard_workspace">
        
        {/* WORKSPACE HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              {activeTab === "overview" && "Dashboard Analytics"}
              {activeTab === "links" && "URL Link Manager"}
              {activeTab === "withdraw" && "Earnings Payouts"}
              {activeTab === "settings" && "Withdrawal Settings"}
              {activeTab === "tools" && "Quick Developer Tools"}
              {activeTab === "contact" && "Help & Support Center"}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {activeTab === "overview" && "Track real-time visitors, view rates, and aggregate daily earnings."}
              {activeTab === "links" && "List and review previous shortcodes, CPM yields, and target routes."}
              {activeTab === "withdraw" && "Withdraw funds safely directly into your configured payout channel."}
              {activeTab === "settings" && "Set and customize payment gateway details and credentials."}
              {activeTab === "tools" && "Utilize rapid shortener links and HTTP API endpoints."}
              {activeTab === "contact" && "Submit a ticket to our 24/7 client happiness help desk for prompt resolution."}
            </p>
          </div>

          {/* Quick Create Link trigger for header */}
          {activeTab !== "overview" && (
            <button
              onClick={() => setActiveTab("overview")}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              Shorten New URL
            </button>
          )}
        </div>

        {/* TAB WORKSPACE: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8" id="overview_workspace">
            {faucetModeEnabled ? (
              <div className="bg-amber-950/20 border border-amber-900/30 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <AlertTriangle className="w-4.5 h-4.5" />
                    Faucet Mode is Enabled
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">
                    Your account is currently running in <strong>Faucet Mode</strong>. Faucet traffic is allowed, and is correctly routed through high-capacity shorteners. Do not send standard organic traffic to your links while in Faucet Mode, as CPM calculation might differ.
                  </p>
                </div>
                <button
                  onClick={() => handleToggleFaucetMode(false)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shrink-0 cursor-pointer"
                >
                  Disable Faucet Mode
                </button>
              </div>
            ) : (
              <div className="bg-amber-950/20 border border-amber-900/30 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <AlertTriangle className="w-4.5 h-4.5" />
                    Faucet Traffic Warning
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">
                    Are you sending traffic from a crypto faucet or similar rewards platform? You <strong>must</strong> enable Faucet Mode in your settings, otherwise your traffic will violate our terms and your pending payments will be cancelled.
                  </p>
                </div>
                <button
                  onClick={() => handleToggleFaucetMode(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-slate-950 font-extrabold text-xs rounded-xl transition shrink-0 cursor-pointer"
                >
                  Enable Faucet Mode
                </button>
              </div>
            )}

            {/* IN-DASHBOARD SHORTENER CARD */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
              <h3 className="font-extrabold text-white text-base mb-3 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-indigo-400" />
                Shorten a New Link
              </h3>
              <form onSubmit={handleShorten} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Destination URL</label>
                    <input
                      required
                      type="url"
                      placeholder="Paste your destination URL (e.g. https://www.youtube.com/watch?v=...) here..."
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800/80 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-slate-100 placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold transition focus:outline-none select-none"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`} />
                      <span>Advanced</span>
                    </button>
                  </div>

                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800/40"
                    >
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Custom Alias (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. tutorial-guide"
                          value={customAlias}
                          onChange={(e) => setCustomAlias(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800/80 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-slate-100 placeholder-slate-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Expiration (Optional)</label>
                        <input
                          type="datetime-local"
                          value={expiresAt}
                          min={new Date().toISOString().slice(0, 16)}
                          onChange={(e) => setExpiresAt(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800/80 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-slate-100"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-slate-500">
                    Leaving the custom alias empty will automatically generate a secure random 6-character code.
                  </span>
                  <button
                    type="submit"
                    disabled={shortenLoading}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm transition duration-150 flex items-center justify-center gap-2 shadow-sm self-end"
                  >
                    {shortenLoading ? "Processing..." : "Shorten URL"}
                  </button>
                </div>
              </form>

              {shortenedLink && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Shortened URL</p>
                    <span className="font-mono font-bold text-indigo-400 text-sm break-all">
                      {getBaseShortUrl()}/go/{shortenedLink.code}
                    </span>
                    {shortenedLink.expiresAt && (
                      <p className="text-[10px] text-amber-400 font-semibold mt-0.5">
                        Expires: {new Date(shortenedLink.expiresAt).toLocaleString()}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      Original: {shortenedLink.originalUrl}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleGenerateQrCode(`${getBaseShortUrl()}/go/${shortenedLink.code}`)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-lg border border-slate-800 shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                      QR Code
                    </button>
                    
                    <button
                      onClick={() => copyLink(shortenedLink.code)}
                      className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-bold text-xs rounded-lg border border-indigo-500/30 shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      {copiedCode === shortenedLink.code ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* METRICS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {/* Card 1: Today's Views */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Today's Views</p>
                  <h3 className="text-xl font-black text-white mt-1 truncate">{stats?.todayViews || 0}</h3>
                </div>
              </div>

              {/* Card 2: Today's Earnings */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Today's Earned</p>
                  <h3 className="text-xl font-black text-emerald-400 mt-1 truncate">${stats?.todayEarnings ? stats.todayEarnings.toFixed(4) : "0.0000"}</h3>
                </div>
              </div>

              {/* Card 3: Month's Views */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">This Month Views</p>
                  <h3 className="text-xl font-black text-white mt-1 truncate">{stats?.monthViews || 0}</h3>
                </div>
              </div>

              {/* Card 4: Month's Earnings */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">This Month Earned</p>
                  <h3 className="text-xl font-black text-white mt-1 truncate">${stats?.monthEarnings ? stats.monthEarnings.toFixed(4) : "0.0000"}</h3>
                </div>
              </div>

              {/* Card 5: Wallet Balance */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Available Balance</p>
                  <h3 className="text-xl font-black text-amber-400 mt-1 truncate">${stats?.balance ? stats.balance.toFixed(4) : "0.0000"}</h3>
                </div>
              </div>

              {/* Card 6: Avg CPM */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Average CPM Rate</p>
                  <h3 className="text-xl font-black text-white mt-1 truncate">${stats?.averageCpm ? stats.averageCpm.toFixed(2) : "5.00"}</h3>
                </div>
              </div>
            </div>

            {/* PERFORMANCE CHART */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-extrabold text-white text-base">Earning Performance History (Last 15 Days)</h3>
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                  📊 Auto-updated daily stats
                </span>
              </div>
              <div className="h-72 w-full">
                {stats && stats.dailyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.dailyStats}>
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#6366f1" fontSize={11} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc" }}
                        itemStyle={{ color: "#f8fafc" }}
                      />
                      <Area yAxisId="left" type="monotone" dataKey="views" name="Clicks" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorViews)" />
                      <Area yAxisId="right" type="monotone" dataKey="earnings" name="Earnings ($)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEarnings)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 font-semibold text-sm">
                    No clicks logged yet. Start sharing shortened links!
                  </div>
                )}
              </div>
            </div>

            {/* DETAILED STATS REPORTS SECTION */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-800/60 pb-5">
                <div>
                  <h3 className="font-extrabold text-white text-base">📊 Detailed Statistics Reports</h3>
                  <p className="text-xs text-slate-400 mt-1">Browse your aggregated daily and monthly publisher yields below.</p>
                </div>
                
                {/* Reports Tabs Buttons */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80 self-stretch sm:self-auto">
                  <button
                    onClick={() => setReportTab("daily")}
                    className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition ${reportTab === "daily" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
                  >
                    Daily Reports
                  </button>
                  <button
                    onClick={() => setReportTab("monthly")}
                    className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition ${reportTab === "monthly" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
                  >
                    Monthly Reports
                  </button>
                </div>
              </div>

              {/* Daily Reports Table */}
              {reportTab === "daily" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-400 font-extrabold text-xs uppercase tracking-wider border-b border-slate-800/80">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-center">Clicks / Views</th>
                        <th className="py-3 px-4 text-right">Link Earnings</th>
                        <th className="py-3 px-4 text-right">Average CPM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
                      {stats?.dailyReports && stats.dailyReports.length > 0 ? (
                        stats.dailyReports.map((row) => (
                          <tr key={row.date} className="hover:bg-slate-800/10 transition">
                            <td className="py-3.5 px-4 font-mono font-medium text-slate-300">
                              {new Date(row.date + "T00:00:00").toLocaleDateString(undefined, {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-white">
                              {row.views}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono">
                              ${row.earnings.toFixed(4)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-indigo-300 font-mono">
                              ${row.cpm.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500 font-medium">
                            No daily records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Monthly Reports Table */}
              {reportTab === "monthly" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-400 font-extrabold text-xs uppercase tracking-wider border-b border-slate-800/80">
                        <th className="py-3 px-4">Month</th>
                        <th className="py-3 px-4 text-center">Clicks / Views</th>
                        <th className="py-3 px-4 text-right">Link Earnings</th>
                        <th className="py-3 px-4 text-right">Average CPM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
                      {stats?.monthlyReports && stats.monthlyReports.length > 0 ? (
                        stats.monthlyReports.map((row) => {
                          const [year, month] = row.month.split("-");
                          const dateObj = new Date(Number(year), Number(month) - 1, 1);
                          return (
                            <tr key={row.month} className="hover:bg-slate-800/10 transition">
                              <td className="py-3.5 px-4 font-semibold text-slate-300">
                                {dateObj.toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'long'
                                })}
                              </td>
                              <td className="py-3.5 px-4 text-center font-bold text-white">
                                {row.views}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono">
                                ${row.earnings.toFixed(4)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-medium text-indigo-300 font-mono">
                                ${row.cpm.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500 font-medium">
                            No monthly records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB WORKSPACE: LINKS */}
        {activeTab === "links" && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden" id="links_workspace">
            {links.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <p className="font-bold text-lg text-white">No shortened links yet</p>
                <p className="text-sm mt-1">Shorten links on the Overview tab to display your url inventory.</p>
                <button
                  onClick={() => setActiveTab("overview")}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow"
                >
                  Go Shorten Link
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 text-slate-400 font-extrabold text-xs uppercase tracking-wider border-b border-slate-800/80">
                      <th className="py-4 px-6">Original Destination URL</th>
                      <th className="py-4 px-6">Short Link Code</th>
                      <th className="py-4 px-6 text-center">Views</th>
                      <th className="py-4 px-6 text-right">Earning</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                    {links.map((link) => {
                      const fullShortUrl = `${getBaseShortUrl()}/go/${link.code}`;
                      return (
                        <tr key={link.id} className="hover:bg-slate-800/20 transition">
                          <td className="py-4 px-6 max-w-xs md:max-w-md truncate">
                            <span className="font-semibold text-white block truncate" title={link.originalUrl}>
                              {link.originalUrl}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium block">
                              Created on: {new Date(link.createdAt).toLocaleString()}
                            </span>
                            {link.isApiGenerated && (
                              <span
                                className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                title="API Generated Link: Auto-deleted if no new views/clicks occur within 3 days"
                              >
                                ⚡ API Link (Auto-deletes after 3d no views)
                              </span>
                            )}
                            {link.expiresAt && (
                              <span className={`text-[10px] font-semibold block mt-0.5 ${new Date(link.expiresAt).getTime() < Date.now() ? "text-rose-400" : "text-amber-400"}`}>
                                {new Date(link.expiresAt).getTime() < Date.now() ? "Expired on: " : "Expires: "}
                                {new Date(link.expiresAt).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-mono font-bold text-indigo-400 block select-all">
                              {link.code}
                            </span>
                            <span className="text-[10px] text-slate-500 block font-medium">
                              CPM: ${link.cpm.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center font-bold text-white">
                            {link.clicks}
                          </td>
                          <td className="py-4 px-6 text-right font-bold text-emerald-400 text-base">
                            ${link.earnings.toFixed(4)}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${link.status === "active" ? (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now() ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20") : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                              {link.status === "active" ? (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now() ? "expired" : "active") : link.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => copyLink(link.code)}
                                className="p-2 bg-slate-900 hover:bg-indigo-950 text-slate-400 hover:text-indigo-400 rounded-lg transition"
                                title="Copy Shortened URL"
                              >
                                {copiedCode === link.code ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                onClick={() => handleGenerateQrCode(fullShortUrl)}
                                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                                title="Generate QR Code"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => window.open(fullShortUrl, "_blank")}
                                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg transition"
                                title="Test Redirect Page"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteLink(link.id)}
                                className="p-2 bg-slate-900 hover:bg-rose-950/40 text-rose-400 rounded-lg transition"
                                title="Delete link"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB WORKSPACE: WITHDRAW */}
        {activeTab === "withdraw" && (
          <div className="space-y-8" id="withdraw_workspace">
            {/* BALANCES SNAPSHOT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bal 1 */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Available Wallet Balance</p>
                  <h3 className="text-2xl font-black text-emerald-400 mt-1">${stats?.balance ? stats.balance.toFixed(4) : "0.0000"}</h3>
                </div>
              </div>
              {/* Bal 2 */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Withdrawal</p>
                  <h3 className="text-2xl font-black text-amber-400 mt-1">${activeWithdrawalsSum.toFixed(2)}</h3>
                </div>
              </div>
              {/* Bal 3 */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Withdrawn Funds</p>
                  <h3 className="text-2xl font-black text-white mt-1">${completedWithdrawalsSum.toFixed(2)}</h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Request Form */}
              <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl">
                <h3 className="font-extrabold text-white text-base mb-4">Request Fund Withdrawal</h3>
                
                {/* Active Payout Settings Display */}
                <div className="mb-6 p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                  <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Active Payout Destination</p>
                  {userMethod && userAccount ? (
                    <>
                      <p className="text-slate-200 font-bold flex items-center gap-1.5 mt-1 text-sm">
                        💳 {userMethod} Gateway
                      </p>
                      <p className="text-slate-400 font-mono break-all font-medium mt-0.5">
                        Account: {userAccount}
                      </p>
                    </>
                  ) : (
                    <div className="text-amber-400 font-medium py-1">
                      ⚠️ No payout method configured. Please add payout details in the <button onClick={() => setActiveTab("settings")} className="underline font-bold text-indigo-400">Settings tab</button> before submitting request.
                    </div>
                  )}
                </div>

                {withdrawError && (
                  <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                    <span>{withdrawError}</span>
                  </div>
                )}

                {withdrawSuccess && (
                  <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold flex items-start gap-2">
                    <Check className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                    <span>{withdrawSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleWithdrawRequest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Withdrawal Amount ($)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white placeholder-slate-600"
                    />
                    <div className="flex justify-between mt-1.5 text-[10px] text-slate-500 font-semibold">
                      <span>Available: ${stats?.balance ? stats.balance.toFixed(4) : "0.00"}</span>
                      <span>Min Threshold: ${settings?.minWithdrawal.toFixed(2) || "2.00"}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={withdrawLoading || !userMethod || !userAccount}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 font-bold text-sm rounded-xl transition shadow"
                  >
                    {withdrawLoading ? "Submitting..." : "Submit Payout Request"}
                  </button>
                </form>
              </div>

              {/* Right Column: Withdrawal Logs */}
              <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl">
                <h3 className="font-extrabold text-white text-base mb-4">Previous Withdrawal History</h3>
                
                {withdrawals.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No withdrawal requests submitted yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800/80">
                          <th className="py-3 px-4">Request ID / Date</th>
                          <th className="py-3 px-4">Method & Account</th>
                          <th className="py-3 px-4 text-right">Amount</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                        {withdrawals.map((w) => (
                           <tr key={w.id} className="hover:bg-slate-800/20">
                             <td className="py-3 px-4">
                               <span className="font-mono text-white font-bold block">{w.id}</span>
                               <span className="text-[9px] text-slate-500 block">{new Date(w.createdAt).toLocaleDateString()}</span>
                             </td>
                             <td className="py-3 px-4 max-w-[150px] truncate">
                               <span className="text-white block font-bold">{w.method}</span>
                               <span className="font-mono text-slate-500 truncate block text-[10px]" title={w.account}>{w.account}</span>
                             </td>
                             <td className="py-3 px-4 text-right font-bold text-white">
                               ${w.amount.toFixed(2)}
                             </td>
                             <td className="py-3 px-4 text-center">
                               <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${w.status === "approved" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : w.status === "rejected" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                                 {w.status}
                               </span>
                             </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB WORKSPACE: SETTINGS */}
        {activeTab === "settings" && (
          <div className="max-w-2xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6" id="settings_workspace">
            <h3 className="font-extrabold text-white text-base mb-4">Payout Account Configuration</h3>
            
            {profileSuccess && (
              <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold flex items-start gap-2">
                <Check className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Select Gateway Method</label>
                <select
                  required
                  value={userMethod}
                  onChange={(e) => setUserMethod(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                >
                  <option value="" className="bg-slate-950 text-white">-- Choose Gateway Payout --</option>
                  {settings?.withdrawalMethods.map((method, idx) => (
                    <option key={idx} value={method} className="bg-slate-950 text-white">{method}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Account Wallet Address / Details</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter details based on selected gateway: For PayPal/Payeer enter Email. For UPI enter virtual payment address. For Bitcoin enter public key wallet address. For Bank enter Full Name, Account Number, and Swift/IFSC code."
                  value={userAccount}
                  onChange={(e) => setUserAccount(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white placeholder-slate-600"
                />
              </div>

              <div className="p-3.5 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-indigo-300 text-xs leading-normal font-medium">
                💡 <span className="font-bold">Tip:</span> Please double check your withdrawal credentials carefully to prevent any locked or misrouted payouts. Updates apply to both current available balance and subsequent new withdrawal submissions.
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-sm"
              >
                Save Payout Settings
              </button>
            </form>

            <div className="mt-8 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
              <h3 className="font-extrabold text-white text-base mb-2 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
                Faucet Integration Settings
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-normal">
                If you integrate your TG Links with a faucet platform, enable Faucet Mode below. This ensures faucet traffic is correctly routed through faucet-specific high-capacity shorteners.
              </p>

              {faucetSettingsSuccess && (
                <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold flex items-start gap-2">
                  <Check className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                  <span>{faucetSettingsSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="space-y-1 pr-4">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    Faucet Mode
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${faucetModeEnabled ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-slate-800 text-slate-500"}`}>
                      {faucetModeEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Turn this on ONLY if you are sending automated/incentivized traffic from a crypto faucet. Non-faucet users should keep this disabled.
                  </p>
                </div>
                
                <button
                  onClick={() => handleToggleFaucetMode(!faucetModeEnabled)}
                  disabled={faucetModalLoading}
                  className={`px-4 py-2 font-bold text-xs rounded-xl transition cursor-pointer shrink-0 ${faucetModeEnabled ? "bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow"}`}
                >
                  {faucetModalLoading ? "Updating..." : faucetModeEnabled ? "Disable Faucet Mode" : "Enable Faucet Mode"}
                </button>
              </div>

              {faucetModeEnabled && (
                <div className="mt-4 p-3.5 bg-amber-950/20 border border-amber-900/30 rounded-xl text-amber-300 text-xs leading-normal font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>
                    <strong>Warning:</strong> Since Faucet Mode is enabled, you will only use the Faucet API URL shorteners defined by the Admin. Do not send standard organic traffic to your links while in Faucet Mode, as CPM calculation might differ.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB WORKSPACE: TOOLS */}
        {activeTab === "tools" && (
          <div className="space-y-8" id="tools_workspace">
            {/* Developers API Documentation Card */}
            <div className="bg-slate-900/40 border border-slate-800/80 p-6 md:p-8 rounded-2xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
                <div>
                  <h3 className="text-xl font-extrabold text-white">⚙️ Developers API</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Programmatically shorten URLs and query integration endpoints dynamically.
                  </p>
                </div>
                
                {/* Real User Token Display */}
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2 max-w-sm w-full">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Your Personal API Token:</span>
                  <div className="flex items-center justify-between gap-3 bg-slate-900 p-2 px-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 overflow-hidden">
                    <span className="truncate select-all">{currentUser.apiToken || "No Token Assigned"}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentUser.apiToken || "");
                        setCopiedApiToken(true);
                        setTimeout(() => setCopiedApiToken(false), 2000);
                      }}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition shrink-0"
                      title="Copy Token to Clipboard"
                    >
                      {copiedApiToken ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* API Info & Format Section */}
              <div className="space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">
                  For developers, <span className="text-white font-extrabold">{settings?.siteName || "AroLinks.com"}</span> prepared a robust shortening API which returns responses in either <span className="text-indigo-400 font-bold">JSON</span> or <span className="text-indigo-400 font-bold">TEXT</span> format.
                </p>
                
                <p className="text-slate-300 text-sm leading-relaxed">
                  Currently, there is one major method which can be used to shorten links on behalf of your publisher account.
                </p>
              </div>

              {/* Endpoint GET block */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm">📡 GET Request Structure</h4>
                <p className="text-xs text-slate-400 leading-normal">
                  Send a standardized <span className="font-mono text-slate-200">GET</span> request with your unique API token, the destination URL, and an optional custom alias:
                </p>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-nowrap">
                  {getBaseShortUrl()}/api?api=<span className="text-indigo-300 font-bold">{currentUser.apiToken || "your_api_token"}</span>&amp;url=<span className="text-indigo-400">yourdestinationlink.com</span>&amp;alias=<span className="text-purple-400">CustomAlias</span>
                </div>
              </div>

              {/* Response Layout Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <h5 className="font-bold text-slate-300 text-xs uppercase tracking-wider">1. JSON Response (Default)</h5>
                  <p className="text-xs text-slate-500 leading-relaxed">By default, the API returns a structured JSON payload containing the shortened target route.</p>
                  <pre className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-xs font-mono text-indigo-300 overflow-x-auto">
{`{
  "status": "success",
  "shortenedUrl": "${getBaseShortUrl()}/go/xxxxx"
}`}
                  </pre>
                </div>

                <div className="space-y-2">
                  <h5 className="font-bold text-slate-300 text-xs uppercase tracking-wider">2. Plain Text Response</h5>
                  <p className="text-xs text-slate-500 leading-relaxed">Append <code className="text-indigo-400 font-bold font-mono">&amp;format=text</code> at the end of the query string to return raw text URL output.</p>
                  <pre className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
{`${getBaseShortUrl()}/go/xxxxx`}
                  </pre>
                  <p className="text-[10px] text-slate-500 leading-relaxed italic">• Note: If an validation error or credential fault occurs during text format processing, it will return an empty output.</p>
                </div>
              </div>

              {/* Using API in PHP Block */}
              <div className="border-t border-slate-800/60 pt-6 space-y-4">
                <h4 className="font-bold text-white text-sm">🐘 Programmatic Integration in PHP</h4>
                <p className="text-xs text-slate-400">
                  To easily invoke the URL Shortening pipeline inside your PHP scripts, send a GET request via the standard <code className="font-mono text-slate-300">file_get_contents</code> wrapper or curl bindings. See full functional code snippets below:
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* PHP JSON Block */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 block">Using JSON Response Parser</span>
                    <pre className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto text-left leading-normal">
{`<?php
$long_url = urlencode('yourdestinationlink.com');
$api_token = '${currentUser.apiToken || "your_api_token"}';
$api_url = "${window.location.origin}/api?api={$api_token}&url={$long_url}&alias=CustomAlias";

$result = @json_decode(file_get_contents($api_url), TRUE);

if($result["status"] === 'error') {
    echo $result["message"];
} else {
    echo $result["shortenedUrl"];
}
?>`}
                    </pre>
                  </div>

                  {/* PHP Plain Text Block */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 block">Using Plain Text Response</span>
                    <pre className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto text-left leading-normal">
{`<?php
$long_url = urlencode('yourdestinationlink.com');
$api_token = '${currentUser.apiToken || "your_api_token"}';
$api_url = "${window.location.origin}/api?api={$api_token}&url={$long_url}&alias=CustomAlias&format=text";

$result = @file_get_contents($api_url);

if( $result ) {
    echo $result;
}
?>`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Mass Shrinker Card */}
            <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl">
              <h3 className="font-extrabold text-white text-base mb-2">📥 Mass Shrinker</h3>
              <p className="text-slate-400 text-sm mb-4">
                Shorten multiple destination links simultaneously! Enter up to 5 URLs (one per line) to batch-shorten in one click.
              </p>
              <textarea
                rows={4}
                placeholder="https://example.com/url1&#10;https://example.com/url2&#10;https://example.com/url3"
                className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm font-mono text-white placeholder-slate-700 mb-4"
              />
              <button
                onClick={() => alert("Batch mass shrinker tool is accessible for verified VIP publishers. Contact support to request access!")}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg transition"
              >
                Perform Mass Shorten
              </button>
            </div>
          </div>
        )}

        {/* TAB WORKSPACE: CONTACT SUPPORT */}
        {activeTab === "contact" && (
          <div className="max-w-2xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 md:p-8" id="contact_workspace">
            <h3 className="text-xl font-bold text-white mb-2">📬 Submit a Support Ticket</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Have issues with your link earnings, payment processing times, API integration, or looking to negotiate a custom VIP rate? Submit your ticket directly below. Our administrator team will review and reply within 12 to 24 hours.
            </p>

            {supportSuccess && (
              <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-900/55 rounded-xl text-emerald-450 text-xs font-semibold leading-relaxed">
                🎉 {supportSuccess}
              </div>
            )}

            <form onSubmit={handleSupportSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Your Account Email</label>
                  <input
                    disabled
                    type="text"
                    value={user.email}
                    className="w-full px-4 py-3 bg-slate-950/70 border border-slate-850 rounded-xl text-slate-500 font-semibold text-sm cursor-not-allowed outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Inquiry Topic</label>
                  <select
                    required
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                  >
                    <option value="">-- Select inquiry topic --</option>
                    <option value="Withdrawals & Payouts">Withdrawals & Payouts</option>
                    <option value="URL Ad Gate / Suspended Link">URL Ad Gate / Suspended Link</option>
                    <option value="Custom VIP CPM Tiers">Custom VIP CPM Tiers</option>
                    <option value="API or Technical Issue">API or Technical Issue</option>
                    <option value="Other Inquiries">Other Inquiries</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Detailed Message</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Explain your request, question, or problem in detail. Please include any link codes or payment IDs if relevant..."
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white placeholder-slate-700"
                />
              </div>

              <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-indigo-300 text-xs leading-normal font-semibold">
                ⚠️ <span className="font-bold">Notice:</span> Spamming duplicate tickets or submitting false claims is strictly against terms and may lead to temporary suspension of your publisher privileges.
              </div>

              <button
                type="submit"
                disabled={supportLoading}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-indigo-600/10 flex items-center gap-2 cursor-pointer"
              >
                {supportLoading ? "Sending inquiry..." : "Submit Support Ticket"}
              </button>
            </form>

            {/* YOUR TICKETS HISTORY */}
            <div className="mt-10 pt-8 border-t border-slate-800/80">
              <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <span>📋 Your Support Ticket History</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                  {userTickets.length}
                </span>
              </h4>

              {userTickets.length === 0 ? (
                <div className="p-6 bg-slate-950/50 border border-slate-800/50 rounded-xl text-center text-slate-500 text-xs">
                  No support tickets submitted yet. Any tickets you submit will appear here with live resolution status.
                </div>
              ) : (
                <div className="space-y-4">
                  {userTickets.map((t) => (
                    <div key={t.id} className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-indigo-400 font-bold">{t.id}</span>
                          <span className="text-xs font-bold text-white">{t.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">
                            {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {t.status === "open" && (
                            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">
                              Open
                            </span>
                          )}
                          {t.status === "replied" && (
                            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">
                              Replied
                            </span>
                          )}
                          {t.status === "closed" && (
                            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-slate-800 text-slate-400 rounded-full">
                              Closed
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                        {t.message}
                      </div>

                      {t.adminReply && (
                        <div className="p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-lg space-y-1">
                          <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span>💬 Admin Response</span>
                            <span className="text-[9px] font-normal text-slate-500">
                              ({new Date(t.updatedAt).toLocaleDateString()})
                            </span>
                          </div>
                          <p className="text-xs text-indigo-200 leading-relaxed whitespace-pre-wrap">
                            {t.adminReply}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* QR CODE GENERATOR MODAL */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl p-6 relative"
          >
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Short Link QR Code</h3>
              <p className="text-xs text-slate-400 break-all mb-4 font-mono select-all p-2 bg-slate-950 rounded-lg border border-slate-800/40">
                {qrModalLinkUrl}
              </p>

              {/* QR Image Frame */}
              <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mb-5">
                <img
                  src={qrCodeDataUrl}
                  alt="Short Link QR Code"
                  className="w-44 h-44 mx-auto"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={copyQrCodeImage}
                  className="px-4 py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-300 font-bold text-xs rounded-xl border border-slate-800 transition flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  Copy Image
                </button>
                <button
                  onClick={downloadQrCodeImage}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 text-indigo-100" />
                  Download PNG
                </button>
              </div>

              <p className="text-[10px] text-slate-500 mt-4 leading-relaxed">
                Scan with any mobile camera to test redirection flow or distribute to your subscribers.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
