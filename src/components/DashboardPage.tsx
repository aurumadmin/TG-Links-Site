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
  QrCode,
  Target,
  Megaphone,
  ArrowLeftRight,
  Play,
  Pause,
  LifeBuoy,
  RefreshCw,
  Info,
  CheckCircle2
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

import SiteLogo, { getCachedSettings, saveCachedSettings } from "./SiteLogo";
import TopLoadingBar from "./TopLoadingBar";

const getBaseShortUrl = () => {
  const hostname = window.location.hostname;
  const isProd = !hostname.includes("localhost") && !hostname.includes("127.0.0.1") && !hostname.includes("ais-dev") && !hostname.includes("ais-pre");
  return isProd ? "https://tglinks.eu.cc" : window.location.origin;
};

interface DashboardPageProps {
  user: User;
  initialTab?: "overview" | "links" | "withdraw" | "settings" | "tools" | "contact" | "advertiser";
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export default function DashboardPage({ user, initialTab, onLogout, onNavigate }: DashboardPageProps) {
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [activeTab, setActiveTab] = useState<"overview" | "links" | "withdraw" | "settings" | "tools" | "contact" | "advertiser">(initialTab || "overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(() => getCachedSettings());
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const changeTab = (tab: "overview" | "links" | "withdraw" | "settings" | "tools" | "contact" | "advertiser", path: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
  };
  const [reportTab, setReportTab] = useState<"daily" | "monthly">("daily");

  // Advertiser Panel state
  const [advertiserSection, setAdvertiserSection] = useState<"deposit" | "campaigns" | "support">("campaigns");
  const [advertiserCampaigns, setAdvertiserCampaigns] = useState<any[]>([]);
  const [convertAmount, setConvertAmount] = useState("");
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState("");
  const [convertSuccess, setConvertSuccess] = useState("");

  // Deposit state
  const [depositTab, setDepositTab] = useState<"faucetpay" | "oxapay" | "upi">("oxapay");
  const [depositAmount, setDepositAmount] = useState("5.00");
  const [upiScreenshotUrl, setUpiScreenshotUrl] = useState("");
  const [upiTxnId, setUpiTxnId] = useState("");
  const [copiedUpiId, setCopiedUpiId] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [depositSuccess, setDepositSuccess] = useState("");
  const [depositHistory, setDepositHistory] = useState<any[]>([]);

  const loadUserDeposits = async () => {
    try {
      const res = await fetchApi("/deposits/my");
      if (res?.deposits) {
        setDepositHistory(res.deposits);
      }
    } catch (err) {
      console.error("Failed to load user deposits:", err);
    }
  };

  const verifyFaucetPayDeposit = async (depId?: string, token?: string) => {
    try {
      const res = await fetchApi("/deposits/faucetpay/verify", {
        method: "POST",
        body: JSON.stringify({ depId, token })
      });
      if (res?.success && res.verified) {
        setDepositSuccess("Payment verified! Your Advertiser Balance has been credited.");
        if (typeof res.advertiserBalance === "number") {
          setCurrentUser(prev => ({ ...prev, advertiserBalance: res.advertiserBalance }));
        }
        loadUserDeposits();
      } else if (res?.deposit?.status === "approved") {
        loadUserDeposits();
      }
    } catch (err) {
      console.error("Failed to verify FaucetPay deposit:", err);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("deposit") === "success") {
      const depId = params.get("dep_id") || undefined;
      const token = params.get("token") || undefined;
      verifyFaucetPayDeposit(depId, token);
      setDepositSuccess("Payment returned from FaucetPay! Verifying and crediting balance...");
      loadUserDeposits();
    }
  }, []);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError("");
    setDepositSuccess("");

    const amt = Number(depositAmount);
    if (isNaN(amt) || amt < 0.1) {
      setDepositError("Minimum deposit amount is $0.10");
      return;
    }

    setDepositLoading(true);
    try {
      if (depositTab === "faucetpay") {
        if (!settings?.enableFaucetPayDeposit) {
          setDepositError("FaucetPay deposits are currently paused. Please choose OxaPay Crypto or UPI.");
          setDepositLoading(false);
          return;
        }
        const res = await fetchApi("/deposits/faucetpay", {
          method: "POST",
          body: JSON.stringify({ amount: amt })
        });
        if (res.error) {
          setDepositError(res.error);
        } else if (res.checkoutUrl && res.params) {
          const form = document.createElement("form");
          form.method = "POST";
          form.action = res.checkoutUrl;
          Object.keys(res.params).forEach((key) => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = String(res.params[key]);
            form.appendChild(input);
          });
          document.body.appendChild(form);
          form.submit();
        } else if (res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        }
      } else if (depositTab === "oxapay") {
        const res = await fetchApi("/deposits/oxapay", {
          method: "POST",
          body: JSON.stringify({ amount: amt })
        });
        if (res.error) {
          setDepositError(res.error);
        } else if (res.payLink) {
          window.location.href = res.payLink;
        }
      } else if (depositTab === "upi") {
        if (!upiScreenshotUrl.trim()) {
          setDepositError("Payment screenshot URL / image proof is mandatory for UPI deposits.");
          setDepositLoading(false);
          return;
        }
        const res = await fetchApi("/deposits/upi", {
          method: "POST",
          body: JSON.stringify({
            amount: amt,
            screenshotUrl: upiScreenshotUrl,
            txnId: upiTxnId
          })
        });
        if (res.error) {
          setDepositError(res.error);
        } else {
          setDepositSuccess("UPI deposit request submitted successfully! Admin will verify and credit your advertiser balance.");
          setUpiScreenshotUrl("");
          setUpiTxnId("");
          loadUserDeposits();
        }
      }
    } catch (err: any) {
      setDepositError(err.message || "Failed to submit deposit request.");
    } finally {
      setDepositLoading(false);
    }
  };

  // Campaign Creation state
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignType, setCampaignType] = useState<
    | "offerwall"
    | "sponsored_popup"
    | "banner_728x90"
    | "banner_468x60"
    | "banner_300x250"
    | "banner_320x50"
    | "banner_300x600"
    | "banner_left"
    | "banner_right"
  >("banner_300x250");
  const [campaignTargetUrl, setCampaignTargetUrl] = useState("");
  const [campaignBannerImageUrl, setCampaignBannerImageUrl] = useState("");
  const [campaignAdCode, setCampaignAdCode] = useState("");
  const [campaignTargetViews, setCampaignTargetViews] = useState("1000");
  const [createCampaignLoading, setCreateCampaignLoading] = useState(false);
  const [createCampaignError, setCreateCampaignError] = useState("");
  const [createCampaignSuccess, setCreateCampaignSuccess] = useState("");

  const loadAdvertiserCampaigns = async () => {
    try {
      const res = await fetchApi("/advertiser/campaigns");
      if (res?.campaigns) {
        setAdvertiserCampaigns(res.campaigns);
      }
    } catch (err) {
      console.error("Failed to load advertiser campaigns:", err);
    }
  };

  const getCpmForType = (type: string) => {
    if (!settings) return 2.0;
    if (type === "offerwall") return settings.advCpmOfferWall ?? 3.0;
    if (type === "sponsored_popup") return settings.advCpmSponsoredPopup ?? 4.0;
    if (type === "banner_728x90") return settings.advCpmBanner728x90 ?? 1.5;
    if (type === "banner_468x60") return settings.advCpmBanner468x60 ?? 1.2;
    if (type === "banner_300x250") return settings.advCpmBanner300x250 ?? 2.0;
    if (type === "banner_320x50") return settings.advCpmBanner320x50 ?? 1.0;
    if (type === "banner_300x600") return settings.advCpmBanner300x600 ?? 2.5;
    if (type === "banner_left") return settings.advCpmBannerLeft ?? 1.5;
    if (type === "banner_right") return settings.advCpmBannerRight ?? 1.5;
    return 2.0;
  };

  const calculatedCost = () => {
    const views = Number(campaignTargetViews) || 0;
    const cpm = getCpmForType(campaignType);
    return Number(((views / 1000) * cpm).toFixed(4));
  };

  const handleConvertBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setConvertError("");
    setConvertSuccess("");
    const amount = Number(convertAmount);
    if (isNaN(amount) || amount <= 0) {
      setConvertError("Please enter a valid positive conversion amount.");
      return;
    }
    const currentBal = Number(currentUser.balance || 0);
    if (amount > currentBal + 0.00001) {
      setConvertError(`Insufficient publisher balance. Available: $${currentBal.toFixed(4)}`);
      return;
    }

    setConvertLoading(true);
    try {
      const res = await fetchApi("/advertiser/convert-balance", {
        method: "POST",
        body: JSON.stringify({ amount })
      });
      
      setConvertSuccess(res.message || `Successfully converted $${amount.toFixed(2)} to Advertiser Balance!`);
      if (res.user) {
        setCurrentUser(res.user);
        try {
          localStorage.setItem("tglinks_user", JSON.stringify(res.user));
        } catch (e) {}
      }
      setConvertAmount("");
      loadDashboardData();
    } catch (err: any) {
      setConvertError(err.message || "Failed to convert balance.");
    } finally {
      setConvertLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateCampaignError("");
    setCreateCampaignSuccess("");

    if (!campaignTitle.trim()) {
      setCreateCampaignError("Campaign title is required.");
      return;
    }
    const views = Number(campaignTargetViews);
    if (isNaN(views) || views < 100) {
      setCreateCampaignError("Minimum target views is 100.");
      return;
    }

    const cost = calculatedCost();
    if ((currentUser.advertiserBalance || 0) < cost) {
      setCreateCampaignError(`Insufficient Advertiser Balance. Campaign cost is $${cost.toFixed(2)}. Please convert publisher balance first.`);
      return;
    }

    setCreateCampaignLoading(true);
    try {
      const res = await fetchApi("/advertiser/campaigns", {
        method: "POST",
        body: JSON.stringify({
          title: campaignTitle,
          type: campaignType,
          targetUrl: campaignTargetUrl,
          bannerImageUrl: campaignBannerImageUrl,
          adCode: campaignAdCode,
          targetViews: views
        })
      });

      if (res.error) {
        setCreateCampaignError(res.error);
      } else {
        setCreateCampaignSuccess("Campaign created successfully!");
        if (res.user) setCurrentUser(res.user);
        loadAdvertiserCampaigns();
        setShowCreateCampaignModal(false);
        setCampaignTitle("");
        setCampaignTargetUrl("");
        setCampaignBannerImageUrl("");
        setCampaignAdCode("");
        setCampaignTargetViews("1000");
      }
    } catch (err: any) {
      setCreateCampaignError(err.message || "Failed to create campaign.");
    } finally {
      setCreateCampaignLoading(false);
    }
  };

  const handleToggleCampaignStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    try {
      await fetchApi(`/advertiser/campaigns/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: newStatus })
      });
      loadAdvertiserCampaigns();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      const res = await fetchApi(`/advertiser/campaigns/${id}`, {
        method: "DELETE"
      });
      if (res?.advertiserBalance !== undefined) {
        setCurrentUser(prev => ({ ...prev, advertiserBalance: res.advertiserBalance }));
      }
      loadAdvertiserCampaigns();
    } catch (err) {
      console.error(err);
    }
  };
  
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
    setIsDashboardLoading(true);
    try {
      const [statsRes, linksRes, withdrawsRes, settingsRes, depositSettingsRes] = await Promise.all([
        fetchApi(`/dashboard/stats/${user.id}`),
        fetchApi(`/links/user/${user.id}`),
        fetchApi(`/withdrawals/user/${user.id}`),
        fetchApi("/settings"),
        fetchApi("/deposits/settings")
      ]);

      if (statsRes) setStats(statsRes);
      if (linksRes?.links) setLinks(linksRes.links);
      if (withdrawsRes?.withdrawals) setWithdrawals(withdrawsRes.withdrawals);
      
      const combinedSettings = {
        ...(settingsRes || {}),
        ...(depositSettingsRes || {})
      };
      
      if (settingsRes || depositSettingsRes) {
        setSettings(combinedSettings);
        saveCachedSettings(combinedSettings);
      }
      
      // Update local profile states with fresh DB values if any
      const freshUser = await fetchApi("/auth/me");
      if (freshUser && freshUser.user) {
        setCurrentUser(freshUser.user);
        try {
          localStorage.setItem("tglinks_user", JSON.stringify(freshUser.user));
        } catch (e) {}
        setUserMethod(freshUser.user.withdrawalMethod || "");
        setUserAccount(freshUser.user.withdrawalAccount || "");
        setFaucetModeEnabled(!!freshUser.user.enableFaucetMode);
        setShowFaucetModal(false);
      }
    } catch (err) {
      console.error("Failed to load dashboard statistics:", err);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadUserTickets();
    loadAdvertiserCampaigns();
    loadUserDeposits();

    const handleSettingsUpdated = () => {
      const cached = getCachedSettings();
      if (cached) setSettings(cached);
    };
    window.addEventListener("site_settings_updated", handleSettingsUpdated);
    return () => window.removeEventListener("site_settings_updated", handleSettingsUpdated);
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
      <TopLoadingBar isLoading={isDashboardLoading} />
      
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
              <span className={`text-[8px] uppercase tracking-widest font-extrabold mt-1 leading-none flex items-center gap-1 ${activeTab === "advertiser" ? "text-amber-400" : "text-slate-500"}`}>
                {activeTab === "advertiser" ? (
                  <>
                    <Target className="w-2.5 h-2.5 text-amber-400 inline" />
                    Advertiser Panel
                  </>
                ) : (
                  "Publisher Dashboard"
                )}
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
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-white shrink-0 ${activeTab === "advertiser" ? "bg-amber-600" : "bg-indigo-600"}`}>
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className="flex-grow overflow-hidden">
            <p className="text-xs text-white font-bold truncate">{user.email}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1">
              <UserCheck className={`w-3 h-3 ${activeTab === "advertiser" ? "text-amber-400" : "text-emerald-400"}`} />
              {user.role === "admin" ? "Platform Admin" : activeTab === "advertiser" ? "Advertiser" : "Publisher"}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-grow p-4 space-y-1.5 text-sm font-semibold overflow-y-auto" id="sidebar_nav">
          {activeTab === "advertiser" ? (
            /* ADVERTISER PANEL NAVIGATION ONLY */
            <>
              {/* Switch to Publisher Button */}
              <button
                onClick={() => { changeTab("overview", "/dashboard"); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-indigo-500/30 transition cursor-pointer font-bold mb-3 shadow-md group"
              >
                <div className="flex items-center gap-2.5">
                  <ArrowLeftRight className="w-4 h-4 text-indigo-400 group-hover:rotate-180 transition-transform duration-300" />
                  <span>Switch to Publisher</span>
                </div>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">
                  Earn
                </span>
              </button>

              <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest px-3 pt-1 pb-1">
                Advertiser Menu
              </div>

              {/* Deposit Funds */}
              <button
                onClick={() => { setAdvertiserSection("deposit"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition cursor-pointer ${
                  advertiserSection === "deposit"
                    ? "bg-amber-600 text-white font-black shadow-lg shadow-amber-900/30"
                    : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Deposit Funds</span>
              </button>

              {/* Ad Campaigns */}
              <button
                onClick={() => { setAdvertiserSection("campaigns"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition cursor-pointer ${
                  advertiserSection === "campaigns"
                    ? "bg-amber-600 text-white font-black shadow-lg shadow-amber-900/30"
                    : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                }`}
              >
                <Megaphone className="w-4 h-4 text-amber-400" />
                <span>Campaigns ({advertiserCampaigns.length})</span>
              </button>

              {/* Contact Support */}
              <button
                onClick={() => { setAdvertiserSection("support"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition cursor-pointer ${
                  advertiserSection === "support"
                    ? "bg-amber-600 text-white font-black shadow-lg shadow-amber-900/30"
                    : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                }`}
              >
                <Mail className="w-4 h-4 text-indigo-400" />
                <span>Contact Support</span>
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
            </>
          ) : (
            /* PUBLISHER DASHBOARD NAVIGATION */
            <>
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

              {/* Prominent Advertiser Switch Button */}
              <button
                onClick={() => changeTab("advertiser", "/dashboard/advertiser")}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent hover:from-amber-500/25 hover:to-amber-500/15 text-amber-300 border border-amber-500/30 transition cursor-pointer font-bold my-1 shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Advertiser Panel</span>
                </div>
                <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black uppercase rounded shadow-sm">
                  Ads
                </span>
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
            </>
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
              {activeTab === "advertiser" && "Advertiser Self-Service Portal"}
              {activeTab === "settings" && "Withdrawal Settings"}
              {activeTab === "tools" && "Quick Developer Tools"}
              {activeTab === "contact" && "Help & Support Center"}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {activeTab === "overview" && "Track real-time visitors, view rates, and aggregate daily earnings."}
              {activeTab === "links" && "List and review previous shortcodes, CPM yields, and target routes."}
              {activeTab === "withdraw" && "Withdraw funds safely directly into your configured payout channel."}
              {activeTab === "advertiser" && "Convert publisher earnings to advertiser balance and create targeted ad campaigns."}
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
                  {isDashboardLoading && !stats ? (
                    <div className="h-6 w-16 bg-slate-800 animate-pulse rounded mt-1" />
                  ) : (
                    <h3 className="text-xl font-black text-white mt-1 truncate">{stats?.todayViews || 0}</h3>
                  )}
                </div>
              </div>

              {/* Card 2: Today's Earnings */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Today's Earned</p>
                  {isDashboardLoading && !stats ? (
                    <div className="h-6 w-20 bg-slate-800 animate-pulse rounded mt-1" />
                  ) : (
                    <h3 className="text-xl font-black text-emerald-400 mt-1 truncate">${stats?.todayEarnings ? stats.todayEarnings.toFixed(4) : "0.0000"}</h3>
                  )}
                </div>
              </div>

              {/* Card 3: Month's Views */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">This Month Views</p>
                  {isDashboardLoading && !stats ? (
                    <div className="h-6 w-16 bg-slate-800 animate-pulse rounded mt-1" />
                  ) : (
                    <h3 className="text-xl font-black text-white mt-1 truncate">{stats?.monthViews || 0}</h3>
                  )}
                </div>
              </div>

              {/* Card 4: Month's Earnings */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">This Month Earned</p>
                  {isDashboardLoading && !stats ? (
                    <div className="h-6 w-20 bg-slate-800 animate-pulse rounded mt-1" />
                  ) : (
                    <h3 className="text-xl font-black text-white mt-1 truncate">${stats?.monthEarnings ? stats.monthEarnings.toFixed(4) : "0.0000"}</h3>
                  )}
                </div>
              </div>

              {/* Card 5: Wallet Balance */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Available Balance</p>
                  {isDashboardLoading && !stats ? (
                    <div className="h-6 w-20 bg-slate-800 animate-pulse rounded mt-1" />
                  ) : (
                    <h3 className="text-xl font-black text-amber-400 mt-1 truncate">${stats?.balance ? stats.balance.toFixed(4) : "0.0000"}</h3>
                  )}
                </div>
              </div>

              {/* Card 6: Avg CPM */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Average CPM Rate</p>
                  {isDashboardLoading && !stats ? (
                    <div className="h-6 w-16 bg-slate-800 animate-pulse rounded mt-1" />
                  ) : (
                    <h3 className="text-xl font-black text-white mt-1 truncate">${stats?.averageCpm ? stats.averageCpm.toFixed(2) : "5.00"}</h3>
                  )}
                </div>
              </div>

              {/* Card 7: Advertiser Balance */}
              <div className="bg-amber-950/20 border border-amber-500/30 p-5 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest truncate">Advertiser Balance</p>
                    <h3 className="text-xl font-black text-amber-300 mt-1 truncate">
                      ${(currentUser.advertiserBalance || 0).toFixed(4)}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("advertiser")}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl transition shrink-0 cursor-pointer"
                >
                  Manage Ads
                </button>
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
                <div className="mb-4 p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
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

                {/* Account Faucet Mode Status */}
                <div className="mb-6 p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Account Traffic Mode</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${faucetModeEnabled ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-slate-800 text-slate-400 border-slate-700"}`}>
                      {faucetModeEnabled ? "🚰 FAUCET MODE ON" : "🌐 ORGANIC TRAFFIC"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    {faucetModeEnabled 
                      ? "Your account is set to Crypto Faucet Mode. Admins verify traffic referrers prior to payout approval."
                      : "Organic traffic mode active. You can toggle Faucet Mode in your account Settings."}
                  </p>
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

        {/* TAB WORKSPACE: ADVERTISER PANEL */}
        {activeTab === "advertiser" && (
          <div className="space-y-8" id="advertiser_workspace">
            {/* Advertiser Sub-Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setAdvertiserSection("campaigns")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  advertiserSection === "campaigns"
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Megaphone className="w-4 h-4" />
                <span>Ad Campaigns ({advertiserCampaigns.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAdvertiserSection("deposit")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  advertiserSection === "deposit"
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Deposit & Convert Balance</span>
              </button>

              <button
                type="button"
                onClick={() => setAdvertiserSection("support")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  advertiserSection === "support"
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <LifeBuoy className="w-4 h-4" />
                <span>Advertiser Helpdesk</span>
              </button>
            </div>

            {/* Advertiser Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 p-6 rounded-2xl border border-amber-500/20 shadow-lg">
              <div>
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider mb-1">
                  <Target className="w-4 h-4" />
                  <span>Advertiser Control Center</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  {advertiserSection === "campaigns" && "Ad Campaigns & Impressions"}
                  {advertiserSection === "deposit" && "Deposit & Convert Advertiser Funds"}
                  {advertiserSection === "support" && "Advertiser Helpdesk & Support"}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  {advertiserSection === "campaigns" && "Launch, track, and optimize your high-converting offer wall, banner, and popup ad campaigns."}
                  {advertiserSection === "deposit" && "Add funds directly via FaucetPay, OxaPay crypto, or UPI QR code, or convert publisher earnings 1:1."}
                  {advertiserSection === "support" && "Submit inquiry tickets or check response status with our dedicated advertising team."}
                </p>
              </div>

              {advertiserSection === "campaigns" && (
                <button
                  onClick={() => setShowCreateCampaignModal(true)}
                  className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create New Campaign
                </button>
              )}
            </div>

            {/* Quick Balance & Campaign Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Advertiser Balance Card */}
              <div className="bg-amber-950/20 border border-amber-500/30 p-5 rounded-2xl space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Advertiser Wallet</span>
                  <Target className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-2xl font-black text-amber-300">${(currentUser.advertiserBalance || 0).toFixed(4)}</h3>
                <p className="text-[10px] text-amber-200/70">For purchasing ad impressions.</p>
              </div>

              {/* Publisher Balance Card */}
              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Publisher Earnings</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-black text-emerald-400">${currentUser.balance.toFixed(4)}</h3>
                <p className="text-[10px] text-slate-400">Convertible 1:1 to advertiser balance.</p>
              </div>

              {/* Active Campaigns Card */}
              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Campaigns</span>
                  <Megaphone className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-black text-white">
                  {advertiserCampaigns.filter(c => c.status === "active").length} / {advertiserCampaigns.length}
                </h3>
                <p className="text-[10px] text-slate-400">Live ad placements in network.</p>
              </div>

              {/* Delivered Views Card */}
              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivered Views</span>
                  <Eye className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-2xl font-black text-white font-mono">
                  {advertiserCampaigns.reduce((sum, c) => sum + (c.viewsDelivered || 0), 0).toLocaleString()}
                </h3>
                <p className="text-[10px] text-slate-400">Total impressions delivered.</p>
              </div>
            </div>

            {/* SECTION 1: DEPOSIT & CONVERT FUNDS */}
            {advertiserSection === "deposit" && (
              <div className="space-y-8">
                {/* CONVERT PUBLISHER BALANCE FORM */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <ArrowLeftRight className="w-5 h-5 text-amber-400" />
                        Convert Publisher Balance to Advertiser Balance
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Instantly transfer your publisher link earnings into your advertiser balance to purchase network ad views.
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider rounded-lg shrink-0">
                      ⚡ 1:1 Instant Conversion
                    </span>
                  </div>

                  {/* Conversion Rules Warning */}
                  <div className="p-4 bg-amber-950/30 border border-amber-900/40 rounded-xl flex items-start gap-3">
                    <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200/90 leading-relaxed">
                      <strong>Important Notice:</strong> Once publisher funds are converted to your Advertiser Balance, they <strong>cannot</strong> be converted back to publisher balance or withdrawn. They remain permanently in your advertiser balance for launching banner, popup, or offer wall ads.
                    </p>
                  </div>

                  {convertError && (
                    <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-400 text-xs font-semibold">
                      ⚠️ {convertError}
                    </div>
                  )}

                  {convertSuccess && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-emerald-400 text-xs font-semibold">
                      🎉 {convertSuccess}
                    </div>
                  )}

                  <form onSubmit={handleConvertBalance} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Amount to Convert ($)
                        </label>
                        <span className="text-xs text-slate-400 font-semibold">
                          Publisher Balance: <strong className="text-emerald-400 font-mono">${Number(currentUser.balance || 0).toFixed(4)}</strong>
                        </span>
                      </div>

                      <div className="relative">
                        <input
                          required
                          type="number"
                          step="any"
                          min="0.0001"
                          placeholder="Enter amount (e.g. 5.00)"
                          value={convertAmount}
                          onChange={(e) => setConvertAmount(e.target.value)}
                          className="w-full h-12 pl-4 pr-24 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition text-sm font-bold text-white placeholder-slate-600 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setConvertAmount(Number(currentUser.balance || 0).toFixed(4))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-extrabold uppercase rounded-lg transition cursor-pointer"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={convertLoading || Number(currentUser.balance || 0) <= 0}
                      className="w-full h-12 px-6 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {convertLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ArrowLeftRight className="w-4 h-4" />
                          <span>Convert Funds Now</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* DEPOSIT FUNDS VIA GATEWAYS SECTION */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-emerald-400" />
                        Deposit Funds via Payment Gateway
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Add funds directly via automatic payment gateways (FaucetPay, OxaPay) or manual UPI QR Code payment.
                      </p>
                    </div>
                  </div>

                  {depositError && (
                    <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-400 text-xs font-semibold">
                      ⚠️ {depositError}
                    </div>
                  )}

                  {depositSuccess && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-emerald-400 text-xs font-semibold">
                      🎉 {depositSuccess}
                    </div>
                  )}

                  {/* PAYMENT METHOD SELECTOR TABS */}
                  <div className="grid grid-cols-3 gap-3 max-w-xl">
                    <button
                      type="button"
                      onClick={() => {
                        if (settings?.enableFaucetPayDeposit) {
                          setDepositTab("faucetpay");
                        }
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                        !settings?.enableFaucetPayDeposit
                          ? "bg-slate-950/50 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed"
                          : depositTab === "faucetpay"
                          ? "bg-amber-500/10 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10 cursor-pointer"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-amber-400" />
                      <span>FaucetPay</span>
                      <span className={`text-[9px] font-mono uppercase ${settings?.enableFaucetPayDeposit ? "text-emerald-400" : "text-amber-500/80"}`}>
                        {settings?.enableFaucetPayDeposit ? "Auto Instant" : "Paused"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDepositTab("oxapay")}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                        depositTab === "oxapay"
                          ? "bg-indigo-500/10 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/10"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <DollarSign className="w-4 h-4 text-indigo-400" />
                      <span>OxaPay Crypto</span>
                      <span className="text-[9px] font-mono text-emerald-400 uppercase">Auto Instant</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDepositTab("upi")}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                        depositTab === "upi"
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-emerald-400" />
                      <span>UPI / QR</span>
                      <span className="text-[9px] font-mono text-amber-400 uppercase">Manual Verify</span>
                    </button>
                  </div>

                  {/* DEPOSIT FORM */}
                  <form onSubmit={handleDepositSubmit} className="space-y-4 max-w-xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Deposit Amount ($ USD)
                      </label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0.10"
                        placeholder="5.00"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:border-amber-500 outline-none"
                      />
                    </div>

                    {depositTab === "upi" && (
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                        <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-slate-800 pb-4">
                          <div className="p-2.5 bg-white rounded-xl shrink-0 shadow-lg border border-slate-200 flex flex-col items-center justify-center">
                            <img
                              src={
                                settings?.upiQrUrl
                                  ? settings.upiQrUrl
                                  : `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                                      `upi://pay?pa=${settings?.upiId || "pay@upi"}&pn=${encodeURIComponent(settings?.upiAccountHolderName || "TG Links Ads")}&am=${depositAmount || "5.00"}&cu=INR`
                                    )}`
                              }
                              alt="Deposit UPI QR Code"
                              className="w-32 h-32 object-contain mx-auto"
                            />
                            {settings?.upiQrUrl && (
                              <a
                                href={settings.upiQrUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> Full QR
                              </a>
                            )}
                          </div>

                          <div className="space-y-2 text-center sm:text-left flex-1">
                            <div className="flex items-center justify-center sm:justify-between">
                              <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">UPI Payment Details</span>
                              {settings?.upiAccountHolderName && (
                                <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                                  Payee: <strong className="text-slate-200">{settings.upiAccountHolderName}</strong>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 p-2 bg-slate-900 border border-slate-800 rounded-lg">
                              <div className="text-left font-mono truncate">
                                <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">UPI ID (VPA)</span>
                                <span className="text-xs sm:text-sm font-bold text-emerald-400 select-all">
                                  {settings?.upiId || "pay@upi"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (settings?.upiId) {
                                    navigator.clipboard.writeText(settings.upiId);
                                    setCopiedUpiId(true);
                                    setTimeout(() => setCopiedUpiId(false), 2000);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                                  copiedUpiId
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                                }`}
                                title="Copy UPI ID"
                              >
                                {copiedUpiId ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              Scan QR code using <strong>PhonePe, Google Pay, Paytm, BHIM, or any UPI App</strong>. Amount: <strong>${depositAmount || "5.00"} USD</strong>.
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                            Payment Screenshot URL / Image Proof <span className="text-rose-400">* (Mandatory)</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="Paste image link or screenshot URL (e.g. https://i.imgur.com/screenshot.png)"
                            value={upiScreenshotUrl}
                            onChange={(e) => setUpiScreenshotUrl(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                            Transaction ID / UTR Number <span className="text-slate-500 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 312456789012"
                            value={upiTxnId}
                            onChange={(e) => setUpiTxnId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500 outline-none font-mono"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={depositLoading}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {depositLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          {depositTab === "faucetpay" && "Proceed to FaucetPay"}
                          {depositTab === "oxapay" && "Pay with OxaPay Crypto"}
                          {depositTab === "upi" && "Submit UPI Deposit Proof"}
                        </>
                      )}
                    </button>
                  </form>

                  {/* DEPOSIT HISTORY TABLE */}
                  {depositHistory.length > 0 && (
                    <div className="pt-4 border-t border-slate-800 space-y-3">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-amber-400" />
                        My Deposit History
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                            <tr>
                              <th className="p-3">ID / Method</th>
                              <th className="p-3">Amount</th>
                              <th className="p-3">Date</th>
                              <th className="p-3">Proof / Txn</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {depositHistory.map((dep) => (
                              <tr key={dep.id} className="hover:bg-slate-900/60">
                                <td className="p-3 font-mono font-bold text-white">
                                  <div>{dep.id}</div>
                                  <span className="text-[10px] text-amber-400 uppercase font-sans">{dep.method}</span>
                                </td>
                                <td className="p-3 font-mono font-bold text-emerald-400">
                                  ${dep.amount.toFixed(2)}
                                </td>
                                <td className="p-3 text-[11px] text-slate-400">
                                  {new Date(dep.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-3">
                                  {dep.screenshotUrl ? (
                                    <a
                                      href={dep.screenshotUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-400 hover:underline flex items-center gap-1"
                                    >
                                      <ExternalLink className="w-3 h-3" /> Proof
                                    </a>
                                  ) : (
                                    <span className="text-slate-500">{dep.gatewayTxnId || dep.txnId || "-"}</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    {dep.status === "approved" && (
                                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-md">
                                        Approved
                                      </span>
                                    )}
                                    {dep.status === "pending" && (
                                      <>
                                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase rounded-md animate-pulse">
                                          Pending
                                        </span>
                                        {dep.method === "faucetpay" && (
                                          <button
                                            type="button"
                                            onClick={() => verifyFaucetPayDeposit(dep.id, dep.gatewayTxnId)}
                                            className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded text-[9px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                                            title="Check gateway status"
                                          >
                                            <RefreshCw className="w-2.5 h-2.5" /> Check
                                          </button>
                                        )}
                                      </>
                                    )}
                                    {dep.status === "rejected" && (
                                      <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase rounded-md">
                                        Rejected
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 2: CAMPAIGNS */}
            {advertiserSection === "campaigns" && (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-indigo-400" />
                      My Ad Campaigns
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage active ad campaigns and track impressions delivered to network visitors.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowCreateCampaignModal(true)}
                    className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Ad Campaign
                  </button>
                </div>

                {/* CAMPAIGN LIST */}
                {advertiserCampaigns.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl space-y-3">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                      <Target className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-white">No Ad Campaigns Yet</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Convert your publisher balance into advertiser balance and launch your first offer wall or banner ad campaign!
                    </p>
                    <button
                      onClick={() => setShowCreateCampaignModal(true)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Create First Campaign
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-3.5">Campaign Title</th>
                          <th className="p-3.5">Ad Format</th>
                          <th className="p-3.5">CPM Rate</th>
                          <th className="p-3.5">Progress / Views</th>
                          <th className="p-3.5">Budget Spent</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {advertiserCampaigns.map((c) => {
                          const targetViewsNum = c.targetViews || (c.cpm > 0 ? Math.round((c.totalBudget / c.cpm) * 1000) : 1000);
                          const viewsDeliveredNum = c.viewsDelivered ?? c.impressions ?? 0;
                          const progress = Math.min(100, Math.round((viewsDeliveredNum / targetViewsNum) * 100));
                          return (
                            <tr key={c.id} className="hover:bg-slate-900/60 transition">
                              <td className="p-3.5 font-bold text-white">
                                <div>
                                  {c.title}
                                  {c.targetUrl && (
                                    <a href={c.targetUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 flex items-center gap-1 hover:underline font-mono mt-0.5">
                                      <ExternalLink className="w-3 h-3" />
                                      {c.targetUrl.substring(0, 30)}...
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td className="p-3.5">
                                <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-extrabold uppercase rounded-lg">
                                  {c.type === "offerwall" ? "Offer Wall Task" : c.type === "sponsored_popup" ? "Sponsored Popup" : c.type}
                                </span>
                              </td>
                              <td className="p-3.5 font-mono text-emerald-400 font-bold">
                                ${c.cpm.toFixed(2)} CPM
                              </td>
                              <td className="p-3.5">
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                                    <span>{viewsDeliveredNum.toLocaleString()} / {targetViewsNum.toLocaleString()} views</span>
                                    <span>{progress}%</span>
                                  </div>
                                  <div className="w-32 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${progress}%` }} />
                                  </div>
                                </div>
                              </td>
                              <td className="p-3.5 font-mono text-amber-300 font-bold">
                                ${(c.spent || 0).toFixed(2)} / ${c.totalBudget.toFixed(2)}
                              </td>
                              <td className="p-3.5">
                                {c.status === "active" && (
                                  <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-md animate-pulse">
                                    Active
                                  </span>
                                )}
                                {c.status === "paused" && (
                                  <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase rounded-md">
                                    Paused
                                  </span>
                                )}
                                {c.status === "completed" && (
                                  <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold uppercase rounded-md">
                                    Completed
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 text-right space-x-1">
                                {c.status !== "completed" && (
                                  <button
                                    onClick={() => handleToggleCampaignStatus(c.id, c.status)}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition cursor-pointer"
                                    title={c.status === "active" ? "Pause Campaign" : "Resume Campaign"}
                                  >
                                    {c.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteCampaign(c.id)}
                                  className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-lg transition cursor-pointer"
                                  title="Delete Campaign"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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

            {/* SECTION 3: ADVERTISER SUPPORT */}
            {advertiserSection === "support" && (
              <div className="max-w-2xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-indigo-400" />
                    Advertiser Support & Custom Rates
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Have questions about campaign placement, bulk advertising deals, or custom targeting? Submit your ticket directly below.
                  </p>
                </div>

                {supportSuccess && (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-900/55 rounded-xl text-emerald-400 text-xs font-semibold leading-relaxed">
                    🎉 {supportSuccess}
                  </div>
                )}

                <form onSubmit={handleSupportSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Your Email</label>
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
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition text-sm text-white"
                      >
                        <option value="">-- Select advertiser topic --</option>
                        <option value="Deposit & Payment Issue">Deposit & Payment Issue</option>
                        <option value="Campaign Placement & Targeting">Campaign Placement & Targeting</option>
                        <option value="Bulk Advertising & VIP Rates">Bulk Advertising & VIP Rates</option>
                        <option value="Other Inquiries">Other Inquiries</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Inquiry Message</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Describe your request or campaign details in detail..."
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition text-sm text-white placeholder-slate-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={supportLoading}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {supportLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Submit Support Ticket"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* CREATE CAMPAIGN MODAL */}
            {showCreateCampaignModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative flex flex-col my-auto"
                >
                  {/* Modal Header (Pinned) */}
                  <div className="p-5 md:p-6 pb-4 border-b border-slate-800/80 shrink-0 relative">
                    <button
                      onClick={() => setShowCreateCampaignModal(false)}
                      className="absolute top-4 right-4 p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2 pr-8">
                      <Target className="w-5 h-5 text-amber-400 shrink-0" />
                      Create New Advertiser Campaign
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Target visitors on TG LINKS redirection pages with custom offer wall tasks, popup windows, or banner placements.
                    </p>
                  </div>

                  {/* Scrollable Modal Body */}
                  <div className="p-5 md:p-6 overflow-y-auto flex-1 space-y-4">
                    {createCampaignError && (
                      <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-400 text-xs font-semibold">
                        ⚠️ {createCampaignError}
                      </div>
                    )}

                    <form id="createCampaignForm" onSubmit={handleCreateCampaign} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Campaign Title</label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. My Crypto App Launch"
                            value={campaignTitle}
                            onChange={(e) => setCampaignTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-amber-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Ad Format Type</label>
                          <select
                            value={campaignType}
                            onChange={(e: any) => setCampaignType(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-amber-500 outline-none"
                          >
                            <option value="offerwall">Direct Link Offer Wall Task (CPM: ${getCpmForType("offerwall").toFixed(2)})</option>
                            <option value="sponsored_popup">Sponsored Premium Popup Network (CPM: ${getCpmForType("sponsored_popup").toFixed(2)})</option>
                            <option value="banner_728x90">Banner 728x90 Leaderboard (CPM: ${getCpmForType("banner_728x90").toFixed(2)})</option>
                            <option value="banner_300x250">Banner 300x250 Medium Rectangle (CPM: ${getCpmForType("banner_300x250").toFixed(2)})</option>
                            <option value="banner_468x60">Banner 468x60 Banner (CPM: ${getCpmForType("banner_468x60").toFixed(2)})</option>
                            <option value="banner_320x50">Banner 320x50 Mobile Banner (CPM: ${getCpmForType("banner_320x50").toFixed(2)})</option>
                            <option value="banner_300x600">Banner 300x600 Skyscraper (CPM: ${getCpmForType("banner_300x600").toFixed(2)})</option>
                            <option value="banner_left">Banner Left Slot (CPM: ${getCpmForType("banner_left").toFixed(2)})</option>
                            <option value="banner_right">Banner Right Slot (CPM: ${getCpmForType("banner_right").toFixed(2)})</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Destination Link / Target URL</label>
                        <input
                          required
                          type="url"
                          placeholder="https://yourwebsite.com/landing-page"
                          value={campaignTargetUrl}
                          onChange={(e) => setCampaignTargetUrl(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-amber-500 outline-none"
                        />
                      </div>

                      {campaignType.startsWith("banner_") && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Banner Image URL (Optional)</label>
                            <input
                              type="url"
                              placeholder="https://yourwebsite.com/banner.png"
                              value={campaignBannerImageUrl}
                              onChange={(e) => setCampaignBannerImageUrl(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-amber-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Custom Ad HTML / Script Code (Optional)</label>
                            <input
                              type="text"
                              placeholder="<a href='...'><img src='...'/></a>"
                              value={campaignAdCode}
                              onChange={(e) => setCampaignAdCode(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:border-amber-500 outline-none"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Target View Count (Minimum 100 views)</label>
                        <input
                          required
                          type="number"
                          min="100"
                          step="100"
                          placeholder="1000"
                          value={campaignTargetViews}
                          onChange={(e) => setCampaignTargetViews(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-amber-500 outline-none"
                        />
                      </div>

                      {/* LIVE AD PREVIEW BOX */}
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5" /> Live Ad Unit Preview ({campaignType})
                          </span>
                          <span className="text-[10px] text-slate-500">How it appears to website visitors</span>
                        </div>

                        <div className="pt-2 flex justify-center items-center overflow-x-auto min-h-[100px] bg-slate-900/60 rounded-lg p-3 border border-slate-800/60">
                          {campaignType === "offerwall" && (
                            <div className="w-full max-w-md p-4 bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 shadow-lg">
                              <div>
                                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Sponsored Task</span>
                                <h5 className="font-bold text-white text-sm mt-0.5">{campaignTitle || "Your Campaign Title"}</h5>
                                <p className="text-[11px] text-slate-400 mt-0.5">Complete task to get redirect link</p>
                              </div>
                              <button type="button" className="px-4 py-2 bg-amber-500 text-slate-950 font-black text-xs rounded-lg shrink-0 shadow">
                                Complete Task
                              </button>
                            </div>
                          )}

                          {campaignType === "sponsored_popup" && (
                            <div className="w-full max-w-sm p-4 bg-slate-900 border border-indigo-500/40 rounded-xl shadow-2xl space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="text-xs font-bold text-indigo-400 uppercase">Sponsored Popup Ad</span>
                                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded">Wait 12s</span>
                              </div>
                              <h5 className="font-bold text-white text-sm">{campaignTitle || "Sponsored Partner Advert"}</h5>
                              <div className="h-28 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-500 font-mono overflow-hidden">
                                {campaignBannerImageUrl ? (
                                  <img src={campaignBannerImageUrl} alt="Preview" className="max-h-full object-contain" />
                                ) : (
                                  <span>Target: {campaignTargetUrl || "https://yourwebsite.com"}</span>
                                )}
                              </div>
                              <button type="button" className="w-full py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg">
                                Visit Sponsored Advert
                              </button>
                            </div>
                          )}

                          {campaignType === "banner_728x90" && (
                            <div className="w-[728px] max-w-full h-[90px] bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden relative">
                              {campaignBannerImageUrl ? (
                                <img src={campaignBannerImageUrl} alt="Banner" className="w-full h-full object-cover" />
                              ) : campaignAdCode ? (
                                <div className="p-2 text-xs font-mono text-emerald-400" dangerouslySetInnerHTML={{ __html: campaignAdCode }} />
                              ) : (
                                <div className="text-center px-4">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 block">728x90 Leaderboard Ad</span>
                                  <span className="text-xs font-bold text-amber-300">{campaignTitle || "Your Ad Banner Title"}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {campaignType === "banner_300x250" && (
                            <div className="w-[300px] h-[250px] bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden relative p-2">
                              {campaignBannerImageUrl ? (
                                <img src={campaignBannerImageUrl} alt="Banner" className="w-full h-full object-contain" />
                              ) : campaignAdCode ? (
                                <div className="p-2 text-xs font-mono text-emerald-400" dangerouslySetInnerHTML={{ __html: campaignAdCode }} />
                              ) : (
                                <div className="text-center">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 block">300x250 Medium Rectangle</span>
                                  <span className="text-sm font-bold text-amber-300 block mt-1">{campaignTitle || "Your Ad Banner"}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {campaignType === "banner_320x50" && (
                            <div className="w-[320px] h-[50px] bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden px-2">
                              {campaignBannerImageUrl ? (
                                <img src={campaignBannerImageUrl} alt="Mobile Banner" className="w-full h-full object-cover" />
                              ) : campaignAdCode ? (
                                <div className="p-1 text-[10px] font-mono text-emerald-400" dangerouslySetInnerHTML={{ __html: campaignAdCode }} />
                              ) : (
                                <div className="text-center">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 block">320x50 Mobile Banner</span>
                                  <span className="text-xs font-bold text-amber-300">{campaignTitle || "Mobile Ad Banner"}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {campaignType === "banner_468x60" && (
                            <div className="w-[468px] max-w-full h-[60px] bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden px-2">
                              {campaignBannerImageUrl ? (
                                <img src={campaignBannerImageUrl} alt="Banner" className="w-full h-full object-cover" />
                              ) : campaignAdCode ? (
                                <div className="p-1 text-[10px] font-mono text-emerald-400" dangerouslySetInnerHTML={{ __html: campaignAdCode }} />
                              ) : (
                                <div className="text-center">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 block">468x60 Standard Banner</span>
                                  <span className="text-xs font-bold text-amber-300">{campaignTitle || "Standard Banner Ad"}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {(campaignType === "banner_300x600" || campaignType === "banner_left" || campaignType === "banner_right") && (
                            <div className="w-[300px] h-[250px] bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden p-2">
                              {campaignBannerImageUrl ? (
                                <img src={campaignBannerImageUrl} alt="Banner" className="w-full h-full object-contain" />
                              ) : campaignAdCode ? (
                                <div className="p-2 text-xs font-mono text-emerald-400" dangerouslySetInnerHTML={{ __html: campaignAdCode }} />
                              ) : (
                                <div className="text-center">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 block">{campaignType.replace('_', ' ').toUpperCase()}</span>
                                  <span className="text-sm font-bold text-amber-300 block mt-1">{campaignTitle || "Sidebar / Skyscraper Ad"}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* PRICE SUMMARY CARD */}
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">CPM Rate & Cost Calculation</span>
                          <p className="text-xs text-slate-300">
                            <span className="font-bold text-amber-400">${getCpmForType(campaignType).toFixed(2)} CPM</span> × {Number(campaignTargetViews) || 0} Views
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Campaign Budget</span>
                          <span className="text-xl font-black text-amber-300">${calculatedCost().toFixed(2)} USD</span>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Modal Footer (Pinned) */}
                  <div className="p-4 md:px-6 bg-slate-950/60 border-t border-slate-800 rounded-b-2xl flex items-center justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowCreateCampaignModal(false)}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form="createCampaignForm"
                      disabled={createCampaignLoading || (currentUser.advertiserBalance || 0) < calculatedCost()}
                      className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-600/20 flex items-center gap-2 cursor-pointer"
                    >
                      {createCampaignLoading ? "Launching..." : "Launch Ad Campaign"}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
      </main>

      {/* QR CODE GENERATOR MODAL */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl p-6 relative"
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
