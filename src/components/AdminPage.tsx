import React, { useState, useEffect } from "react";
import { fetchApi } from "../lib/api";
import { 
  User, 
  Link, 
  Withdrawal, 
  SystemSettings, 
  AdFlyShortener,
  SupportTicket 
} from "../types";
import { 
  ArrowLeft, 
  Users, 
  Link2, 
  DollarSign, 
  Settings, 
  Cpu, 
  Check, 
  X, 
  UserX, 
  ToggleLeft, 
  ToggleRight, 
  Trash2, 
  TrendingUp, 
  AlertCircle, 
  Save, 
  Plus, 
  ShieldCheck,
  Edit2,
  ChevronRight,
  Info,
  Mail,
  Send,
  RefreshCw,
  Sparkles,
  LifeBuoy,
  MessageSquare,
  Upload
} from "lucide-react";
import { motion } from "motion/react";

interface AdminPageProps {
  onBackToDashboard: () => void;
}

export default function AdminPage({ onBackToDashboard }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "links" | "withdrawals" | "tickets" | "settings" | "external">("overview");
  
  // Data states
  const [adminStats, setAdminStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [linksList, setLinksList] = useState<Link[]>([]);
  const [withdrawalsList, setWithdrawalsList] = useState<Withdrawal[]>([]);
  const [ticketsList, setTicketsList] = useState<SupportTicket[]>([]);
  const [sysSettings, setSysSettings] = useState<SystemSettings | null>(null);
  const [externalApis, setExternalApis] = useState<AdFlyShortener[]>([]);

  // Ticket management state
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'replied' | 'closed'>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [replyingStatus, setReplyingStatus] = useState<'open' | 'replied' | 'closed'>('replied');
  const [replyLoading, setReplyLoading] = useState(false);
  const [replySuccess, setReplySuccess] = useState("");
  const [replyError, setReplyError] = useState("");

  // User edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState("");
  const [editCustomCpm, setEditCustomCpm] = useState("");
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');

  // New AdLinkFly API state
  const [apiName, setApiName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [apiPriority, setApiPriority] = useState("0");
  const [isFaucetApi, setIsFaucetApi] = useState(false);
  const [editingApiId, setEditingApiId] = useState<string | null>(null);

  // New payment method state
  const [newPaymentMethod, setNewPaymentMethod] = useState("");

  // Google Drive Database Sync State
  const [gdriveInfo, setGdriveInfo] = useState<{ enabled: boolean; fileId: string; serviceAccountEmail: string } | null>(null);

  // Settings feedback
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [settingsError, setSettingsError] = useState("");

  // SMTP Test State
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestSuccess, setSmtpTestSuccess] = useState("");
  const [smtpTestError, setSmtpTestError] = useState("");

  const handleTestSmtp = async () => {
    if (!sysSettings) return;
    setSmtpTesting(true);
    setSmtpTestSuccess("");
    setSmtpTestError("");

    try {
      const res = await fetchApi("/admin/test-smtp", {
        method: "POST",
        body: JSON.stringify(sysSettings)
      });
      if (res.success) {
        setSmtpTestSuccess(res.message || "Database backup email sent successfully via SMTP!");
      } else {
        setSmtpTestError(res.error || "Failed to send email backup.");
      }
    } catch (err: any) {
      setSmtpTestError(err.message || "Failed to send email backup.");
    } finally {
      setSmtpTesting(false);
    }
  };

  const loadAdminData = async () => {
    try {
      const [stats, users, links, withdrawals, tickets, settings, apis] = await Promise.all([
        fetchApi("/admin/stats"),
        fetchApi("/admin/users"),
        fetchApi("/admin/links"),
        fetchApi("/admin/withdrawals"),
        fetchApi("/admin/tickets"),
        fetchApi("/admin/settings"),
        fetchApi("/admin/external-shorteners")
      ]);

      setAdminStats(stats);
      setUsersList(users.users);
      setLinksList(links.links);
      setWithdrawalsList(withdrawals.withdrawals);
      if (tickets?.tickets) {
        setTicketsList(tickets.tickets);
      }
      setSysSettings(settings.settings);
      if (settings.gdrive) {
        setGdriveInfo(settings.gdrive);
      }
      setExternalApis(apis.shorteners);
    } catch (err) {
      console.error("Failed to load admin panel data:", err);
    }
  };

  const handleSendAdminReply = async (ticketId: string) => {
    if (!adminReplyText.trim()) return;
    setReplyLoading(true);
    setReplySuccess("");
    setReplyError("");
    try {
      const res = await fetchApi(`/admin/tickets/${ticketId}/reply`, {
        method: "POST",
        body: JSON.stringify({
          adminReply: adminReplyText,
          status: replyingStatus
        })
      });
      if (res.success) {
        setReplySuccess(`Reply saved successfully! ${res.emailSent ? "Email notification sent to user via SMTP." : (res.emailError ? "Saved, but email send failed: " + res.emailError : "")}`);
        loadAdminData();
        if (res.ticket) setSelectedTicket(res.ticket);
      } else {
        setReplyError(res.error || "Failed to update ticket.");
      }
    } catch (err: any) {
      setReplyError(err.message || "Failed to submit reply.");
    } finally {
      setReplyLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this support ticket?")) return;
    try {
      await fetchApi(`/admin/tickets/${ticketId}`, { method: "DELETE" });
      setSelectedTicket(null);
      loadAdminData();
    } catch (err) {
      alert("Failed to delete ticket.");
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // USER MANAGEMENT ACTIONS
  const handleStartEditUser = (u: User) => {
    setEditingUserId(u.id);
    setEditBalance(String(u.balance));
    setEditCustomCpm(u.customCpm ? String(u.customCpm) : "");
    setEditRole(u.role);
  };

  const handleSaveUser = async (userId: string) => {
    try {
      const balanceNum = Number(editBalance);
      const cpmNum = editCustomCpm === "" ? null : Number(editCustomCpm);
      
      const res = await fetchApi(`/admin/users/${userId}/update`, {
        method: "POST",
        body: JSON.stringify({
          balance: isNaN(balanceNum) ? 0 : balanceNum,
          customCpm: cpmNum,
          role: editRole
        })
      });

      if (res.success) {
        setEditingUserId(null);
        loadAdminData();
      }
    } catch (err) {
      alert("Failed to update user.");
    }
  };

  const handleToggleUserBan = async (id: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? "unban" : "ban"} this user?`)) return;
    try {
      await fetchApi(`/admin/users/${id}/update`, {
        method: "POST",
        body: JSON.stringify({ banned: !currentStatus })
      });
      loadAdminData();
    } catch (err) {
      alert("Failed to toggle ban status.");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this user account?")) return;
    try {
      await fetchApi(`/admin/users/${id}`, { method: "DELETE" });
      loadAdminData();
    } catch (err) {
      alert("Failed to delete user.");
    }
  };

  // LINK ACTIONS
  const handleToggleLink = async (id: string) => {
    try {
      await fetchApi(`/admin/links/${id}/toggle`, { method: "POST" });
      loadAdminData();
    } catch (err) {
      alert("Failed to toggle link status.");
    }
  };

  // WITHDRAWALS ACTIONS
  const handleProcessWithdrawal = async (id: string, status: 'approved' | 'rejected') => {
    if (!confirm(`Are you sure you want to mark this withdrawal as ${status}?`)) return;
    try {
      await fetchApi(`/admin/withdrawals/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status })
      });
      loadAdminData();
    } catch (err) {
      alert("Failed to process withdrawal.");
    }
  };

  // SYSTEM SETTINGS SAVE
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess("");
    setSettingsError("");
    if (!sysSettings) return;

    try {
      const res = await fetchApi("/admin/settings", {
        method: "POST",
        body: JSON.stringify(sysSettings)
      });
      if (res.success) {
        setSettingsSuccess("System general settings and advertisement codes updated successfully!");
        loadAdminData();
      }
    } catch (err: any) {
      setSettingsError(err.message || "Failed to save settings.");
    }
  };

  // ADLINKFLY EXTERNAL SHORTENER ACTIONS
  const handleSaveApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiName || !apiUrl || !apiToken) {
      alert("All fields are required to establish AdLinkFly API integration.");
      return;
    }

    try {
      const res = await fetchApi("/admin/external-shorteners", {
        method: "POST",
        body: JSON.stringify({
          id: editingApiId || undefined,
          name: apiName,
          apiUrl,
          apiToken,
          priority: Number(apiPriority || 0),
          isFaucetApi
        })
      });

      if (res.success) {
        // Clear forms
        setApiName("");
        setApiUrl("");
        setApiToken("");
        setApiPriority("0");
        setIsFaucetApi(false);
        setEditingApiId(null);
        loadAdminData();
      }
    } catch (err) {
      alert("Failed to save AdLinkFly API connection.");
    }
  };

  const handleStartEditApi = (api: AdFlyShortener) => {
    setEditingApiId(api.id);
    setApiName(api.name);
    setApiUrl(api.apiUrl);
    setApiToken(api.apiToken);
    setApiPriority(String(api.priority));
    setIsFaucetApi(!!api.isFaucetApi);
  };

  const handleDeleteApi = async (id: string) => {
    if (!confirm("Are you sure you want to remove this external shortener API?")) return;
    try {
      await fetchApi(`/admin/external-shorteners/${id}`, { method: "DELETE" });
      loadAdminData();
    } catch (err) {
      alert("Failed to remove API integration.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row" id="admin_root">
      
      {/* ADMIN SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-400 flex flex-col border-r border-slate-800/80" id="admin_sidebar">
        
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={sysSettings?.logoUrl || "/logo.svg"} alt="TG Links Logo" className="w-9 h-9 object-contain rounded-xl" referrerPolicy="no-referrer" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1 leading-none">
                <span className="text-xl font-black text-indigo-500 tracking-tight">TG</span>
                <span className="text-xl font-black text-white tracking-tight">LINKS</span>
              </div>
              <span className="text-[7px] uppercase tracking-widest font-black text-rose-500 mt-1 ml-0.5 leading-none">
                SYSTEM ADMIN PANEL
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-grow p-4 space-y-1 text-sm font-semibold" id="admin_nav">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${activeTab === "overview" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "hover:bg-slate-850 hover:text-white"}`}
          >
            <TrendingUp className="w-4 h-4" />
            Admin Overview
          </button>
          
          <button
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${activeTab === "users" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "hover:bg-slate-850 hover:text-white"}`}
          >
            <Users className="w-4 h-4" />
            Manage Users ({usersList.length})
          </button>

          <button
            onClick={() => setActiveTab("links")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${activeTab === "links" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "hover:bg-slate-850 hover:text-white"}`}
          >
            <Link2 className="w-4 h-4" />
            All Short Links ({linksList.length})
          </button>

          <button
            onClick={() => setActiveTab("withdrawals")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${activeTab === "withdrawals" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "hover:bg-slate-850 hover:text-white"}`}
          >
            <DollarSign className="w-4 h-4" />
            Pending Withdrawals
          </button>

          <button
            onClick={() => setActiveTab("tickets")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${activeTab === "tickets" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "hover:bg-slate-850 hover:text-white"}`}
          >
            <LifeBuoy className="w-4 h-4" />
            <div className="flex-grow text-left flex items-center justify-between">
              <span>Support Tickets</span>
              {ticketsList.filter(t => t.status === "open").length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-500 text-slate-950 rounded-full animate-pulse">
                  {ticketsList.filter(t => t.status === "open").length}
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${activeTab === "settings" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "hover:bg-slate-850 hover:text-white"}`}
          >
            <Settings className="w-4 h-4" />
            Ads & System Settings
          </button>

          <button
            onClick={() => setActiveTab("external")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${activeTab === "external" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "hover:bg-slate-850 hover:text-white"}`}
          >
            <Cpu className="w-4 h-4" />
            AdLinkFly External APIs
          </button>

          <div className="pt-4 mt-4 border-t border-slate-800/80">
            <button
              onClick={onBackToDashboard}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 rounded-xl text-xs font-bold text-slate-300 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Publisher Area
            </button>
          </div>
        </nav>
      </aside>

      {/* ADMIN WORKSPACE CONTAINER */}
      <main className="flex-grow p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full bg-slate-950 text-slate-100" id="admin_workspace">
        
        {/* TAB WORKSPACE: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8" id="admin_overview">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Admin Statistics Overview</h1>
                <p className="text-xs text-slate-400 mt-0.5">Global platform views, platform earnings, and active pending withdrawals.</p>
              </div>
            </div>

            {/* METRICS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* Box 1: Users */}
              <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800/80 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Users</p>
                  <h3 className="text-xl font-extrabold text-white mt-0.5">{adminStats?.totalUsers || 0}</h3>
                </div>
              </div>
              {/* Box 2: Links */}
              <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800/80 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Short URLs</p>
                  <h3 className="text-xl font-extrabold text-white mt-0.5">{adminStats?.totalLinks || 0}</h3>
                </div>
              </div>
              {/* Box 3: Views */}
              <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800/80 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Views</p>
                  <h3 className="text-xl font-extrabold text-white mt-0.5">{adminStats?.totalViews || 0}</h3>
                </div>
              </div>
              {/* Box 4: System payouts */}
              <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800/80 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid Payouts</p>
                  <h3 className="text-xl font-extrabold text-emerald-400 mt-0.5">${adminStats?.systemEarnings ? adminStats.systemEarnings.toFixed(4) : "0.00"}</h3>
                </div>
              </div>
              {/* Box 5: Pending */}
              <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800/80 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Payouts</p>
                  <h3 className="text-xl font-extrabold text-amber-400 mt-0.5">${adminStats?.pendingWithdrawal ? adminStats.pendingWithdrawal.toFixed(2) : "0.00"}</h3>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 space-y-4">
                <h3 className="font-extrabold text-white text-sm">System Redirection Rules</h3>
                <div className="p-4 bg-slate-950 rounded-xl text-xs space-y-2 border border-slate-800/60">
                  <p className="flex justify-between font-medium">
                    <span className="text-slate-400">Ad Redirection Steps:</span>
                    <span className="font-bold text-indigo-400">{sysSettings?.adPagesCount || 1} Pages</span>
                  </p>
                  <p className="flex justify-between font-medium">
                    <span className="text-slate-400">Default CPM rate:</span>
                    <span className="font-bold text-emerald-400">${sysSettings?.globalCpm.toFixed(2) || "5.00"}</span>
                  </p>
                  <p className="flex justify-between font-medium">
                    <span className="text-slate-400">"My own page" Ads:</span>
                    <span className={`font-bold ${sysSettings?.enableOwnAds ? "text-emerald-400" : "text-rose-400"}`}>{sysSettings?.enableOwnAds ? "ENABLED" : "DISABLED"}</span>
                  </p>
                  <p className="flex justify-between font-medium">
                    <span className="text-slate-400">Active AdLinkFly APIs:</span>
                    <span className="font-bold text-indigo-400">{externalApis.filter(api => api.enabled).length} Enabled</span>
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("settings")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
                >
                  Configure Ads & CPM
                </button>
              </div>

              <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 space-y-3">
                <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5 text-rose-400">
                  <ShieldCheck className="w-5 h-5 text-rose-500" />
                  Primary Admins Confirmed
                </h3>
                <p className="text-xs text-slate-400 leading-normal">
                  The following email accounts are hardcoded with admin panel entry.
                </p>
                <div className="space-y-1">
                  <div className="p-2.5 bg-slate-950 border border-slate-800/60 rounded-lg text-xs font-semibold text-rose-300 font-mono">
                    freefiregtamcpe@gmail.com
                  </div>
                  <div className="p-2.5 bg-slate-950 border border-slate-800/60 rounded-lg text-xs font-semibold text-rose-300 font-mono">
                    teamthunderofficialyt@gmail.com
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB WORKSPACE: USERS */}
        {activeTab === "users" && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800/80 overflow-hidden" id="admin_users">
            <div className="p-6 border-b border-slate-800/60 bg-slate-900/20">
              <h2 className="text-lg font-extrabold text-white">Registered Publisher Users</h2>
              <p className="text-xs text-slate-400 mt-0.5">Control publisher roles, wallet balances, custom CPM rates, and account access.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-800/60">
                    <th className="py-4 px-6">Publisher Email</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6 text-right">Wallet Balance</th>
                    <th className="py-4 px-6 text-center">Custom CPM</th>
                    <th className="py-4 px-6 text-center">Registered Date</th>
                    <th className="py-4 px-6 text-center">Actions / Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                  {usersList.map((u) => {
                    const isEditing = editingUserId === u.id;
                    return (
                      <tr key={u.id} className={`hover:bg-slate-900/20 transition ${u.banned ? "bg-rose-950/10" : ""}`}>
                        <td className="py-4 px-6">
                           <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${u.role === "admin" ? "bg-indigo-600" : "bg-slate-700"}`}>
                              {u.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-white block">{u.email}</span>
                              <span className="text-[10px] text-slate-500 block font-mono">ID: {u.id}</span>
                              {u.banned && (
                                <span className="inline-flex px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-bold uppercase tracking-wider mt-0.5">
                                  BANNED
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {isEditing ? (
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as any)}
                              className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-white focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
                            >
                              <option value="user" className="bg-slate-950 text-white">user</option>
                              <option value="admin" className="bg-slate-950 text-white">admin</option>
                            </select>
                          ) : (
                            <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${u.role === "admin" ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400" : "bg-slate-850 border border-slate-800 text-slate-400"}`}>
                              {u.role}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-white text-sm">
                          {isEditing ? (
                            <input
                              required
                              type="number"
                              step="0.0001"
                              value={editBalance}
                              onChange={(e) => setEditBalance(e.target.value)}
                              className="w-24 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-right text-white focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
                            />
                          ) : (
                            `$${u.balance.toFixed(4)}`
                          )}
                        </td>
                        <td className="py-4 px-6 text-center font-bold">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.1"
                              placeholder="Default"
                              value={editCustomCpm}
                              onChange={(e) => setEditCustomCpm(e.target.value)}
                              className="w-20 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-center text-white focus:ring-2 focus:ring-indigo-500/30 focus:outline-none placeholder-slate-700"
                            />
                          ) : (
                            u.customCpm ? (
                              <span className="text-emerald-400 font-extrabold">${u.customCpm.toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-500 font-semibold">System Default</span>
                            )
                          )}
                        </td>
                        <td className="py-4 px-6 text-center text-slate-500 font-semibold">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveUser(u.id)}
                                  className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition"
                                  title="Save update"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingUserId(null)}
                                  className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded transition"
                                  title="Cancel edit"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEditUser(u)}
                                  className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition"
                                  title="Edit role, balance, custom CPM"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                
                                <button
                                  onClick={() => handleToggleUserBan(u.id, u.banned)}
                                  className={`p-1.5 rounded border transition ${u.banned ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" : "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"}`}
                                  title={u.banned ? "Unban user" : "Ban user"}
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-1.5 bg-slate-850 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition"
                                  title="Delete Account permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB WORKSPACE: LINKS */}
        {activeTab === "links" && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800/80 overflow-hidden" id="admin_links">
            <div className="p-6 border-b border-slate-800/60 bg-slate-900/20">
              <h2 className="text-lg font-extrabold text-white">Global URL Shortcuts Inventory</h2>
              <p className="text-xs text-slate-400 mt-0.5">List and monitor links created by all publishers on the platform.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 font-extrabold uppercase border-b border-slate-800/60">
                    <th className="py-4 px-6">Creator / Origin</th>
                    <th className="py-4 px-6">Short Slug</th>
                    <th className="py-4 px-6 text-center">Clicks</th>
                    <th className="py-4 px-6 text-right">Total Earnings</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Toggle Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                  {linksList.map((link) => (
                    <tr key={link.id} className="hover:bg-slate-900/20 transition">
                      <td className="py-4 px-6 max-w-sm truncate">
                        <span className="font-bold text-white block">{link.userEmail}</span>
                        <span className="text-[10px] text-slate-500 block font-mono" title={link.originalUrl}>
                          Origin: {link.originalUrl}
                        </span>
                        {link.adFlyShortenedUrl && (
                          <span className="inline-flex px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] text-indigo-300 font-bold mt-1 max-w-full truncate" title={link.adFlyShortenedUrl}>
                            🔀 Syndicated: {link.adFlyShortenedUrl}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-indigo-400 text-sm block">
                          {link.code}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          CPM: ${link.cpm.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-white text-sm">
                        {link.clicks}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-emerald-400 text-sm">
                        ${link.earnings.toFixed(4)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${link.status === "active" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"}`}>
                          {link.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleToggleLink(link.id)}
                          className="p-1.5 hover:bg-slate-850 rounded text-slate-400 hover:text-white transition"
                          title={link.status === "active" ? "Suspend short URL" : "Activate short URL"}
                        >
                          {link.status === "active" ? (
                            <ToggleRight className="w-6 h-6 text-indigo-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-600" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB WORKSPACE: WITHDRAWALS */}
        {activeTab === "withdrawals" && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800/80 overflow-hidden" id="admin_withdrawals">
            <div className="p-6 border-b border-slate-800/60 bg-slate-900/20">
              <h2 className="text-lg font-extrabold text-white">Fund Withdrawal Payout Requests</h2>
              <p className="text-xs text-slate-400 mt-0.5">Review, approve, or reject withdrawal submissions from publishers. Rejecting automatically refunds balance.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 font-extrabold uppercase border-b border-slate-800/60">
                    <th className="py-4 px-6">Publisher Details</th>
                    <th className="py-4 px-6">Method & Account</th>
                    <th className="py-4 px-6 text-right">Requested Amount</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Process Request</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                  {withdrawalsList.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-900/20 transition">
                      <td className="py-4 px-6">
                        <span className="font-bold text-white block">{w.userEmail}</span>
                        <span className="text-[10px] text-slate-500 block font-mono">Req ID: {w.id}</span>
                        <span className="text-[10px] text-slate-500 block">Date: {new Date(w.createdAt).toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-200 block text-xs">{w.method}</span>
                        <span className="font-mono text-slate-400 block break-all whitespace-pre-line text-[10px] mt-1 bg-slate-950 p-2 rounded-lg border border-slate-850">{w.account}</span>
                      </td>
                      <td className="py-4 px-6 text-right font-black text-white text-sm">
                        ${w.amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${w.status === "approved" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : w.status === "rejected" ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {w.status === "pending" ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleProcessWithdrawal(w.id, "approved")}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded shadow-sm flex items-center gap-1 uppercase transition"
                            >
                              <Check className="w-3 h-3" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleProcessWithdrawal(w.id, "rejected")}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded shadow-sm flex items-center gap-1 uppercase transition"
                            >
                              <X className="w-3 h-3" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-semibold text-xs">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB WORKSPACE: SUPPORT TICKETS */}
        {activeTab === "tickets" && (
          <div className="space-y-6" id="admin_tickets">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  <LifeBuoy className="w-6 h-6 text-indigo-400" />
                  <span>Support Tickets Desk</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Manage user inquiries and send responses. Configured SMTP ({sysSettings?.smtpHost ? sysSettings.smtpHost : "Not set"}) will automatically send email notifications to users when you reply!
                </p>
              </div>

              {/* Status Filter buttons */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {(['all', 'open', 'replied', 'closed'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setTicketFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${ticketFilter === filter ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    {filter} {filter === 'open' && `(${ticketsList.filter(t => t.status === 'open').length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* SMTP Alert Banner */}
            {(!sysSettings?.smtpHost || !sysSettings?.smtpUser) && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <strong>SMTP Notice:</strong> You haven't completed SMTP server configuration in <span className="underline font-bold cursor-pointer text-amber-200" onClick={() => setActiveTab("settings")}>Ads & System Settings</span>. Support tickets are saved, but email alerts cannot be dispatched until SMTP host and credentials are standardly saved.
                </div>
              </div>
            )}

            {/* TICKETS LIST & DETAILED REPLY VIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* TICKETS LIST COLUMN */}
              <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800 flex justify-between items-center">
                  <span>User Tickets ({ticketsList.length})</span>
                  <button onClick={loadAdminData} className="hover:text-white transition cursor-pointer" title="Refresh Tickets">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </h3>

                {ticketsList.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No support tickets found in system.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                    {ticketsList
                      .filter(t => ticketFilter === 'all' || t.status === ticketFilter)
                      .map(t => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedTicket(t);
                            setAdminReplyText(t.adminReply || "");
                            setReplyingStatus(t.status === "open" ? "replied" : t.status);
                            setReplySuccess("");
                            setReplyError("");
                          }}
                          className={`p-3.5 rounded-xl border transition cursor-pointer ${selectedTicket?.id === t.id ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-mono text-[11px] font-bold text-indigo-400">{t.id}</span>
                            {t.status === "open" && (
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                                Open
                              </span>
                            )}
                            {t.status === "replied" && (
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                                Replied
                              </span>
                            )}
                            {t.status === "closed" && (
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-slate-800 text-slate-400 rounded-full">
                                Closed
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-white truncate">{t.subject}</div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{t.userEmail}</div>
                          <div className="text-[10px] text-slate-500 mt-2 flex justify-between items-center">
                            <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                            <span>{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* TICKET DETAILS & ADMIN REPLY COLUMN */}
              <div className="lg:col-span-7">
                {selectedTicket ? (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-400">{selectedTicket.id}</span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs font-semibold text-slate-300">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                        </div>
                        <h2 className="text-lg font-bold text-white mt-1">{selectedTicket.subject}</h2>
                        <div className="text-xs text-indigo-300 font-medium mt-0.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          <span>From User: <strong>{selectedTicket.userEmail}</strong></span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteTicket(selectedTicket.id)}
                        className="p-2 text-rose-400 hover:bg-rose-950/40 border border-rose-900/40 rounded-xl transition cursor-pointer"
                        title="Delete Ticket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Original User Message */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">User's Message</label>
                      <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {selectedTicket.message}
                      </div>
                    </div>

                    {/* Admin Response Form */}
                    <div className="pt-2 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Admin Reply & Status Update</span>
                        </label>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 font-semibold">Status:</span>
                          <select
                            value={replyingStatus}
                            onChange={(e) => setReplyingStatus(e.target.value as any)}
                            className="bg-slate-950 border border-slate-800 text-xs font-bold text-white rounded-lg px-2.5 py-1 outline-none"
                          >
                            <option value="open">Open</option>
                            <option value="replied">Replied</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </div>

                      <textarea
                        rows={5}
                        placeholder="Type your official reply to the publisher... (This response will be saved and sent directly to user's email via SMTP)"
                        value={adminReplyText}
                        onChange={(e) => setAdminReplyText(e.target.value)}
                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs text-white placeholder-slate-600 leading-relaxed"
                      />

                      {replySuccess && (
                        <div className="p-3 bg-emerald-950/50 border border-emerald-900/60 rounded-xl text-emerald-400 text-xs font-semibold leading-relaxed">
                          🎉 {replySuccess}
                        </div>
                      )}

                      {replyError && (
                        <div className="p-3 bg-rose-950/50 border border-rose-900/60 rounded-xl text-rose-400 text-xs font-semibold leading-relaxed">
                          ⚠️ {replyError}
                        </div>
                      )}

                      <button
                        onClick={() => handleSendAdminReply(selectedTicket.id)}
                        disabled={replyLoading || !adminReplyText.trim()}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        {replyLoading ? "Saving & Sending Email..." : "Save Reply & Send Email via SMTP"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 space-y-2">
                    <LifeBuoy className="w-10 h-10 mx-auto text-slate-700" />
                    <div className="text-sm font-bold text-slate-400">No Ticket Selected</div>
                    <p className="text-xs text-slate-600">Select any support ticket from the list on the left to read full details and send an email response.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB WORKSPACE: SYSTEM SETTINGS */}
        {activeTab === "settings" && sysSettings && (
          <form onSubmit={handleSaveSettings} className="space-y-8" id="admin_settings">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-2xl font-black text-white">Ads Networks & General Settings</h1>
                <p className="text-xs text-slate-400">Configure portal name, landing text, CPM payouts, page count, and paste advertisement blocks.</p>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition"
              >
                <Save className="w-4 h-4" />
                Save All Changes
              </button>
            </div>

            {settingsSuccess && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold flex items-start gap-2">
                <Check className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                <span>{settingsSuccess}</span>
              </div>
            )}

            {settingsError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                <span>{settingsError}</span>
              </div>
            )}

            {/* WEBSITE LOGO & BRANDING SECTION */}
            <div className="bg-slate-900/40 p-6 rounded-xl border border-slate-800/80 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-extrabold text-white text-base">Website Logo & Visual Branding</h3>
                </div>
                {sysSettings.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setSysSettings({ ...sysSettings, logoUrl: "" })}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Reset to Default Logo
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Upload & URL Controls */}
                <div className="lg:col-span-8 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                      Upload Custom Logo Image
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer transition flex items-center gap-2 shadow-md shadow-indigo-600/20">
                        <Upload className="w-4 h-4" />
                        <span>Choose Image File...</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              alert("Please select an image smaller than 5MB.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = event.target?.result as string;
                              if (!base64) return;
                              // SVG files or small images don't need canvas resizing
                              if (file.type === "image/svg+xml" || file.size < 50000) {
                                setSysSettings({ ...sysSettings, logoUrl: base64 });
                                return;
                              }
                              // Resize raster images via canvas
                              const img = new Image();
                              img.src = base64;
                              img.onload = () => {
                                const canvas = document.createElement("canvas");
                                const maxDim = 400;
                                let width = img.width;
                                let height = img.height;
                                if (width > maxDim || height > maxDim) {
                                  if (width > height) {
                                    height = Math.round((height * maxDim) / width);
                                    width = maxDim;
                                  } else {
                                    width = Math.round((width * maxDim) / height);
                                    height = maxDim;
                                  }
                                }
                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext("2d");
                                if (ctx) {
                                  ctx.drawImage(img, 0, 0, width, height);
                                  const resizedBase64 = canvas.toDataURL("image/png");
                                  setSysSettings({ ...sysSettings, logoUrl: resizedBase64 });
                                } else {
                                  setSysSettings({ ...sysSettings, logoUrl: base64 });
                                }
                              };
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      <span className="text-xs text-slate-500">Supports PNG, JPG, SVG, WEBP (Max 2MB)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                      Or Direct Logo Image URL / Data Base64
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. https://example.com/logo.png or data:image/png;base64,..."
                      value={sysSettings.logoUrl || ""}
                      onChange={(e) => setSysSettings({ ...sysSettings, logoUrl: e.target.value })}
                      className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs text-white font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Leaving this empty will default to the standard site logo asset (<code className="text-indigo-400">/logo.svg</code>).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                      Website Favicon URL (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. https://example.com/favicon.ico"
                      value={sysSettings.faviconUrl || ""}
                      onChange={(e) => setSysSettings({ ...sysSettings, faviconUrl: e.target.value })}
                      className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Live Logo Preview Box */}
                <div className="lg:col-span-4 bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                    Live Header Logo Preview
                  </label>
                  <div className="p-4 bg-slate-900/90 rounded-lg border border-slate-800 flex flex-col items-center justify-center gap-2">
                    <img
                      src={sysSettings.logoUrl || "/logo.svg"}
                      alt="Site Logo Preview"
                      className="w-12 h-12 object-contain rounded-xl shadow-md border border-slate-700/50"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/logo.svg";
                      }}
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-center">
                      <div className="text-sm font-black text-white">{sysSettings.siteName || "TG LINKS"}</div>
                      <span className="text-[9px] text-indigo-400 uppercase font-extrabold tracking-wider">Active Logo</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/40 p-6 rounded-xl border border-slate-800/80 space-y-4">
              <h3 className="font-extrabold text-white text-base border-b border-slate-800 pb-2">Global System Parameters</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Portal Brand Name</label>
                  <input
                    required
                    type="text"
                    value={sysSettings.siteName}
                    onChange={(e) => setSysSettings({ ...sysSettings, siteName: e.target.value })}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Standard Default CPM ($)</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    value={sysSettings.globalCpm}
                    onChange={(e) => setSysSettings({ ...sysSettings, globalCpm: Number(e.target.value) })}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Min Withdrawal Limit ($)</label>
                  <input
                    required
                    type="number"
                    step="0.5"
                    value={sysSettings.minWithdrawal}
                    onChange={(e) => setSysSettings({ ...sysSettings, minWithdrawal: Number(e.target.value) })}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Site Title Heading</label>
                  <input
                    required
                    type="text"
                    value={sysSettings.siteTitle}
                    onChange={(e) => setSysSettings({ ...sysSettings, siteTitle: e.target.value })}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Site SEO Description</label>
                  <input
                    required
                    type="text"
                    value={sysSettings.siteDescription}
                    onChange={(e) => setSysSettings({ ...sysSettings, siteDescription: e.target.value })}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                  />
                </div>
              </div>
            </div>

            {/* PAYMENT METHODS SECTION */}
            <div className="bg-slate-900/40 p-6 rounded-xl border border-slate-800/80 space-y-4 mt-6">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Settings className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-white text-base">Withdrawal & Payment Gateways</h3>
              </div>
              <p className="text-xs text-slate-400">Add or remove supported payment gateways for user cashouts. These will instantly appear on user profile pages for selection. Remember to click <span className="font-semibold text-white">"Save All Changes"</span> above to persist modifications.</p>
              
              <div className="space-y-4">
                {/* Add new payment gateway */}
                <div className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="e.g., Payoneer, Crypto USDT, GPay"
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                    className="block w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newPaymentMethod.trim()) return;
                      const currentMethods = sysSettings.withdrawalMethods || [];
                      if (currentMethods.includes(newPaymentMethod.trim())) {
                        alert("This payment gateway is already added!");
                        return;
                      }
                      setSysSettings({
                        ...sysSettings,
                        withdrawalMethods: [...currentMethods, newPaymentMethod.trim()]
                      });
                      setNewPaymentMethod("");
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Gateway
                  </button>
                </div>

                {/* List of current payment gateways */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {(sysSettings.withdrawalMethods || []).length === 0 ? (
                    <div className="col-span-full py-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No payment methods enabled. Users will not be able to withdraw!
                    </div>
                  ) : (
                    (sysSettings.withdrawalMethods || []).map((method, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                        <span className="text-sm text-slate-200 font-semibold">{method}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (sysSettings.withdrawalMethods || []).filter((_, i) => i !== idx);
                            setSysSettings({
                              ...sysSettings,
                              withdrawalMethods: updated
                            });
                          }}
                          className="p-1.5 hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 rounded-lg transition"
                          title="Remove gateway"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>



            {/* SMTP DATABASE AUTO-BACKUP (EMAIL) */}
            <div className="bg-slate-900/40 p-6 rounded-xl border border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-white text-base">SMTP Database Hourly Auto-Backup</h3>
              </div>

              <p className="text-xs text-slate-400">
                Configure automatic hourly database backups sent directly to your email address via SMTP. This ensures your user accounts, link logs, and configurations are securely preserved, even if your VPS fails unexpectedly!
              </p>

              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <span className="block text-sm font-bold text-white">Enable Automated Email Backups</span>
                  <span className="block text-xs text-slate-400">When enabled, the server will email a full database backup (.json) to your receiver address every hour.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSysSettings({ ...sysSettings, enableEmailBackup: !sysSettings.enableEmailBackup })}
                  className="focus:outline-none transition"
                >
                  {sysSettings.enableEmailBackup ? (
                    <ToggleRight className="w-12 h-12 text-indigo-500" />
                  ) : (
                    <ToggleLeft className="w-12 h-12 text-slate-600" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">SMTP Host</label>
                  <input
                    type="text"
                    placeholder="e.g. smtp.gmail.com"
                    value={sysSettings.smtpHost || ""}
                    onChange={(e) => setSysSettings({ ...sysSettings, smtpHost: e.target.value })}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">SMTP Port</label>
                  <input
                    type="number"
                    placeholder="e.g. 465"
                    value={sysSettings.smtpPort || ""}
                    onChange={(e) => setSysSettings({ ...sysSettings, smtpPort: e.target.value ? Number(e.target.value) : undefined })}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Secure (SSL/TLS)</label>
                  <select
                    value={sysSettings.smtpSecure === undefined ? "true" : sysSettings.smtpSecure ? "true" : "false"}
                    onChange={(e) => setSysSettings({ ...sysSettings, smtpSecure: e.target.value === "true" })}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                  >
                    <option value="true" className="bg-slate-950 text-white">SSL (Port 465)</option>
                    <option value="false" className="bg-slate-950 text-white">STARTTLS (Port 587/25)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">SMTP Username / User</label>
                  <input
                    type="text"
                    placeholder="e.g. user@gmail.com"
                    value={sysSettings.smtpUser || ""}
                    onChange={(e) => setSysSettings({ ...sysSettings, smtpUser: e.target.value })}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">SMTP Password</label>
                  <input
                    type="password"
                    placeholder="SMTP Mail Password"
                    value={sysSettings.smtpPass || ""}
                    onChange={(e) => setSysSettings({ ...sysSettings, smtpPass: e.target.value })}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Sender Email</label>
                  <input
                    type="email"
                    placeholder="e.g. user@gmail.com"
                    value={sysSettings.backupSenderEmail || ""}
                    onChange={(e) => setSysSettings({ ...sysSettings, backupSenderEmail: e.target.value })}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Receiver Email</label>
                  <input
                    type="email"
                    placeholder="e.g. backup@gmail.com"
                    value={sysSettings.backupReceiverEmail || ""}
                    onChange={(e) => setSysSettings({ ...sysSettings, backupReceiverEmail: e.target.value })}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-[250px]">
                  {smtpTestSuccess && (
                    <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4 flex-shrink-0" />
                      {smtpTestSuccess}
                    </p>
                  )}
                  {smtpTestError && (
                    <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {smtpTestError}
                    </p>
                  )}
                </div>
                
                <button
                  type="button"
                  disabled={smtpTesting}
                  onClick={handleTestSmtp}
                  className="px-5 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/20 rounded-xl text-xs font-bold flex items-center gap-2 transition disabled:opacity-50 disabled:pointer-events-none"
                >
                  {smtpTesting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {smtpTesting ? "Testing Connection..." : "Test SMTP & Send Backup Now"}
                </button>
              </div>
            </div>

            {/* AD CONFIGURATION OPTIONS */}
            <div className="bg-slate-900/40 p-6 rounded-xl border border-slate-800/80 space-y-4 mt-6">
              <h3 className="font-extrabold text-white text-base border-b border-slate-800 pb-2">Advertising Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Redirection Ad Pages Count</label>
                  <select
                    value={sysSettings.adPagesCount}
                    onChange={(e) => setSysSettings({ ...sysSettings, adPagesCount: Number(e.target.value) })}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                  >
                    <option value={1} className="bg-slate-950 text-white">1 Ad redirection step (Fastest)</option>
                    <option value={2} className="bg-slate-950 text-white">2 Ad redirection steps</option>
                    <option value={3} className="bg-slate-950 text-white">3 Ad redirection steps (Maximize clicks)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Number of sequential ad gates a visitor completes before being sent to the final target URL.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">"My Own Page" Status Option</label>
                  <select
                    value={sysSettings.enableOwnAds ? "true" : "false"}
                    onChange={(e) => setSysSettings({ ...sysSettings, enableOwnAds: e.target.value === "true" })}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                  >
                    <option value="true" className="bg-slate-950 text-white">ENABLED: Serve local advertisement redirection screens</option>
                    <option value="false" className="bg-slate-950 text-white">DISABLED: Skip local ad screens (Only syndicate via AdLinkFly API)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">If disabled, shortened links will immediately route visitors directly to external AdLinkFly shortened endpoints.</p>
                </div>
              </div>

              {/* DIRECT LINK OFFER WALL (CLICK AD & STAY 10S) CONFIGURATION */}
              <div className="mt-6 pt-6 border-t border-slate-800/60 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-white text-sm">Direct Link Offer Wall Ads (Gate Page 1 Only)</h4>
                </div>

                <p className="text-[11px] text-slate-400">
                  Enable a multi-step offer wall on the first redirection gate. This forces visitors to click up to 4 configured direct-link ads and remain on each ad page for 10 seconds before they can advance to subsequent steps or unlock their destination URL.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Enable Offer Wall Ads</label>
                    <select
                      value={sysSettings.enableOfferWall ? "true" : "false"}
                      onChange={(e) => setSysSettings({ ...sysSettings, enableOfferWall: e.target.value === "true" })}
                      className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                    >
                      <option value="false" className="bg-slate-950 text-white">Disabled</option>
                      <option value="true" className="bg-slate-950 text-white">Enabled (Gate Page 1 only)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Thunder-Appz Redirection</label>
                    <select
                      value={sysSettings.enableThunderRedirect ? "true" : "false"}
                      onChange={(e) => setSysSettings({ ...sysSettings, enableThunderRedirect: e.target.value === "true" })}
                      className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-indigo-400 font-semibold"
                    >
                      <option value="false" className="bg-slate-950 text-white text-slate-300">Disabled (Direct Redirection)</option>
                      <option value="true" className="bg-slate-950 text-white text-indigo-400 font-bold">Enabled (Route via thunder-appz)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Timer per Ad (Seconds)</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={sysSettings.offerWallSeconds === undefined ? 10 : sysSettings.offerWallSeconds}
                      onChange={(e) => setSysSettings({ ...sysSettings, offerWallSeconds: e.target.value ? Number(e.target.value) : 10 })}
                      className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Number of Ad Steps</label>
                    <select
                      value={sysSettings.offerWallCount === undefined ? 4 : sysSettings.offerWallCount}
                      onChange={(e) => setSysSettings({ ...sysSettings, offerWallCount: Number(e.target.value) })}
                      className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                    >
                      <option value={1} className="bg-slate-950 text-white">1 Step</option>
                      <option value={2} className="bg-slate-950 text-white">2 Steps</option>
                      <option value={3} className="bg-slate-950 text-white">3 Steps</option>
                      <option value={4} className="bg-slate-950 text-white">4 Steps</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Offer 1 Direct Link / Ad URL</label>
                    <input
                      type="text"
                      placeholder="https://direct-link-1.com/ad"
                      value={sysSettings.offerWallUrl1 || ""}
                      onChange={(e) => setSysSettings({ ...sysSettings, offerWallUrl1: e.target.value })}
                      className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-mono text-emerald-400 placeholder-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Offer 2 Direct Link / Ad URL</label>
                    <input
                      type="text"
                      placeholder="https://direct-link-2.com/ad"
                      value={sysSettings.offerWallUrl2 || ""}
                      onChange={(e) => setSysSettings({ ...sysSettings, offerWallUrl2: e.target.value })}
                      className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-mono text-emerald-400 placeholder-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Offer 3 Direct Link / Ad URL</label>
                    <input
                      type="text"
                      placeholder="https://direct-link-3.com/ad"
                      value={sysSettings.offerWallUrl3 || ""}
                      onChange={(e) => setSysSettings({ ...sysSettings, offerWallUrl3: e.target.value })}
                      className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-mono text-emerald-400 placeholder-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Offer 4 Direct Link / Ad URL</label>
                    <input
                      type="text"
                      placeholder="https://direct-link-4.com/ad"
                      value={sysSettings.offerWallUrl4 || ""}
                      onChange={(e) => setSysSettings({ ...sysSettings, offerWallUrl4: e.target.value })}
                      className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-mono text-emerald-400 placeholder-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* NEON.TODAY AD GATE CONFIGURATION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-4 border-t border-slate-800/50">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Neon.today Click-To-Unlock Ad Gate</label>
                  <select
                    value={sysSettings.enableNeonAdGate ? "true" : "false"}
                    onChange={(e) => setSysSettings({ ...sysSettings, enableNeonAdGate: e.target.value === "true" })}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                  >
                    <option value="false" className="bg-slate-950 text-white">DISABLED: Standard click button (no ad click verification required)</option>
                    <option value="true" className="bg-slate-950 text-white">ENABLED: Forces visitor to physically click the neon.today iframe ad before continuing</option>
                  </select>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">If enabled, the standard redirection timer button will require clicking the specified neon.today ad below first.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Neon.today Custom Ad HTML / Iframe Code</label>
                  <textarea
                    rows={3}
                    value={sysSettings.neonTodayAdCode || ""}
                    onChange={(e) => setSysSettings({ ...sysSettings, neonTodayAdCode: e.target.value })}
                    placeholder='e.g. <iframe scrolling="no" src="https://neon.today/context/get/..." style="..." frameborder="0"></iframe>'
                    className="block w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white font-mono placeholder-slate-700"
                  />
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Paste your custom neon.today iframe code snippet. Visitors will be forced to click inside this ad block to proceed.</p>
                </div>
              </div>
            </div>

            {/* ADVERTISING BANNER HTML INJECTIONS */}
            <div className="bg-slate-900/40 p-6 rounded-xl border border-slate-800/80 space-y-4 mt-6">
              <h3 className="font-extrabold text-white text-base border-b border-slate-800 pb-2">Injected Advertisement Blocks (HTML / JS Script)</h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Header Code (Redirection Page Only - popunder ads etc.)</label>
                <textarea
                  rows={4}
                  value={sysSettings.popunderCode || ""}
                  onChange={(e) => setSysSettings({ ...sysSettings, popunderCode: e.target.value })}
                  placeholder="<script src='https://ad-network.com/popunder.js'></script>"
                  className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-mono text-emerald-400 placeholder-slate-700"
                />
                <p className="text-[10px] text-slate-500 font-semibold mt-1">💡 Handled strictly on `/go/:code` redirection gateways. Excellent for popunder, direct link, or coin miner script networks.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Site-wide Header Code (Entire Platform - for site verification etc.)</label>
                <textarea
                  rows={4}
                  value={sysSettings.globalHeaderCode || ""}
                  onChange={(e) => setSysSettings({ ...sysSettings, globalHeaderCode: e.target.value })}
                  placeholder="<!-- Analytics, Google verification, site-wide code -->"
                  className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-mono text-emerald-400 placeholder-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Leaderboard Banner (728x90) HTML Block</label>
                  <textarea
                    rows={6}
                    value={sysSettings.bannerAd728x90 || ""}
                    onChange={(e) => setSysSettings({ ...sysSettings, bannerAd728x90: e.target.value })}
                    className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-mono text-emerald-400 placeholder-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Rectangle Banner (300x250) HTML Block</label>
                  <textarea
                    rows={6}
                    value={sysSettings.bannerAd300x250 || ""}
                    onChange={(e) => setSysSettings({ ...sysSettings, bannerAd300x250: e.target.value })}
                    className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-mono text-emerald-400 placeholder-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mobile Banner (320x50) HTML Block</label>
                <textarea
                  rows={3}
                  value={sysSettings.bannerAd320x50 || ""}
                  onChange={(e) => setSysSettings({ ...sysSettings, bannerAd320x50: e.target.value })}
                  className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-mono text-emerald-400 placeholder-slate-700"
                />
              </div>

              <h4 className="font-bold text-white text-xs uppercase tracking-wider border-t border-slate-850 pt-4 mt-4">Offer Wall / Redirect Page Specific Placements (Different Sizes)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">AD TOP LEFT HTML / Banner</label>
                  <textarea
                    rows={4}
                    value={sysSettings.adTopLeftCode || ""}
                    onChange={(e) => setSysSettings({ ...sysSettings, adTopLeftCode: e.target.value })}
                    placeholder="e.g. <iframe ...></iframe> or JS script tag"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-mono text-emerald-400 placeholder-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">AD TOP CENTER HTML / Banner</label>
                  <textarea
                    rows={4}
                    value={sysSettings.adTopCenterCode || ""}
                    onChange={(e) => setSysSettings({ ...sysSettings, adTopCenterCode: e.target.value })}
                    placeholder="e.g. <iframe ...></iframe> or JS script tag"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-mono text-emerald-400 placeholder-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">AD TOP RIGHT HTML / Banner</label>
                  <textarea
                    rows={4}
                    value={sysSettings.adTopRightCode || ""}
                    onChange={(e) => setSysSettings({ ...sysSettings, adTopRightCode: e.target.value })}
                    placeholder="e.g. <iframe ...></iframe> or JS script tag"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-mono text-emerald-400 placeholder-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">AD LEFT HTML / Banner</label>
                  <textarea
                    rows={4}
                    value={sysSettings.adLeftCode || ""}
                    onChange={(e) => setSysSettings({ ...sysSettings, adLeftCode: e.target.value })}
                    placeholder="e.g. <iframe ...></iframe> or JS script tag"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-mono text-emerald-400 placeholder-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">AD BOTTOM CENTER HTML / Banner</label>
                  <textarea
                    rows={4}
                    value={sysSettings.adBottomCenterCode || ""}
                    onChange={(e) => setSysSettings({ ...sysSettings, adBottomCenterCode: e.target.value })}
                    placeholder="e.g. <iframe ...></iframe> or JS script tag"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-mono text-emerald-400 placeholder-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">AD RIGHT HTML / Banner</label>
                  <textarea
                    rows={4}
                    value={sysSettings.adRightCode || ""}
                    onChange={(e) => setSysSettings({ ...sysSettings, adRightCode: e.target.value })}
                    placeholder="e.g. <iframe ...></iframe> or JS script tag"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-mono text-emerald-400 placeholder-slate-800"
                  />
                </div>
              </div>
            </div>
          </form>
        )}

        {/* TAB WORKSPACE: EXTERNAL ADLINKFLY APIS */}
        {activeTab === "external" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="admin_external">
            {/* Left Column: API Registration Form */}
            <div className="lg:col-span-5 bg-slate-900/40 p-6 rounded-xl border border-slate-800/80 space-y-4">
              <h3 className="font-extrabold text-white text-base border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <Cpu className="w-5 h-5 text-indigo-400" />
                {editingApiId ? "Edit AdLinkFly API" : "Integrate AdLinkFly API"}
              </h3>
              
              <form onSubmit={handleSaveApi} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Shortener Name / Brand</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. ShrinkMe.io"
                    value={apiName}
                    onChange={(e) => setApiName(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">API Base URL</label>
                  <input
                    required
                    type="url"
                    placeholder="https://arolinks.com/"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Please enter the shortener's base domain ending with a slash (e.g., <code>https://arolinks.com/</code>).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Developer API Secret Token</label>
                  <input
                    required
                    type="text"
                    placeholder="0123456789abcdef0123456789abcdef..."
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Round-Robin Selection Weight</label>
                  <input
                    required
                    type="number"
                    min="0"
                    placeholder="0"
                    value={apiPriority}
                    onChange={(e) => setApiPriority(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-white font-bold"
                  />
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFaucetApi}
                      onChange={(e) => setIsFaucetApi(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-4 focus:ring-indigo-500/20 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-slate-300 uppercase">Faucet-specific API</span>
                  </label>
                  <p className="text-[10px] text-slate-500 leading-normal mt-1">
                    Check this if you want this API to be used <strong>ONLY for users who have enabled Faucet Mode</strong>.
                  </p>
                </div>

                <div className="p-3.5 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-[11px] text-indigo-300 leading-normal font-medium">
                  💡 <span className="font-bold">Syndication Loop:</span> When users shorten links on TG Links, our system will automatically call these external platforms' API to request shortcodes. Visitors are routed directly or sequentially, allowing you to pool CPM payouts from multiple third-party accounts simultaneously!
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-grow py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-lg"
                  >
                    {editingApiId ? "Save Connection Settings" : "Establish API Connection"}
                  </button>
                  {editingApiId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingApiId(null);
                        setApiName("");
                        setApiUrl("");
                        setApiToken("");
                        setApiPriority("0");
                        setIsFaucetApi(false);
                      }}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-sm rounded-xl transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right Column: Registered Connections List */}
            <div className="lg:col-span-7 bg-slate-900/40 p-6 rounded-xl border border-slate-800/80 space-y-4">
              <h3 className="font-extrabold text-white text-base border-b border-slate-800 pb-2">Active AdLinkFly Network APIs</h3>
              
              {externalApis.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No external shorteners connected. Add connection in left panel!
                </div>
              ) : (
                <div className="space-y-4">
                  {externalApis.map((api) => (
                    <div key={api.id} className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-4">
                      <div className="overflow-hidden">
                        <span className="font-bold text-white block">{api.name}</span>
                        <span className="font-mono text-[10px] text-slate-500 truncate block mt-0.5">{api.apiUrl}</span>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-1.5 py-0.5 rounded">
                            Weight: {api.priority || 0}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${api.enabled ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}>
                            {api.enabled ? "ACTIVE" : "DISABLED"}
                          </span>
                          {api.isFaucetApi && (
                            <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded">
                              FAUCET ONLY
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEditApi(api)}
                          className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg shadow-xs transition"
                          title="Edit settings"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteApi(api.id)}
                          className="p-2 bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg shadow-xs transition"
                          title="Remove integration"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
