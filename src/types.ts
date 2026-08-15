/**
 * TG Links Types
 */

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  balance: number;
  totalEarned: number;
  withdrawalMethod: string;
  withdrawalAccount: string;
  createdAt: string;
  banned: boolean;
  advertiserBalance?: number; // Separate advertiser balance (non-withdrawable)
  customCpm?: number; // Custom CPM set by admin for this user
  apiToken: string; // Dynamic API Token for programmatic integration
  enableFaucetMode?: boolean; // Faucet Mode setting for faucet traffic users
  faucetPromptSeen?: boolean; // Track if user has seen the initial faucet prompt
}

export interface Link {
  id: string;
  code: string;
  originalUrl: string;
  userId: string;
  userEmail: string;
  cpm: number;
  clicks: number;
  earnings: number;
  createdAt: string;
  status: 'active' | 'suspended';
  adFlyShortenerId?: string; // If delegated to external AdLinkFly API
  adFlyShortenedUrl?: string; // The URL returned by AdLinkFly API
  expiresAt?: string; // Optional link expiration ISO date string
  isApiGenerated?: boolean; // Tag for links generated via Developer API
  lastViewedAt?: string; // ISO date string of last view/click
}

export interface AdFlyShortener {
  id: string;
  name: string;
  apiUrl: string;
  apiToken: string;
  enabled: boolean;
  priority: number; // For prioritizing which API to use
  isFaucetApi?: boolean; // If enabled, only used for faucet traffic users
}

export interface ClickLog {
  id: string;
  linkId: string;
  userId: string;
  timestamp: string;
  ip: string;
  earning: number;
  country: string;
  referrer?: string;
}

export interface TrafficSource {
  source: string;
  clicks: number;
  earnings: number;
  lastSeen: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  method: string;
  account: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  userFaucetMode?: boolean;
  totalUserClicks?: number;
  trafficSources?: TrafficSource[];
}

export interface SystemSettings {
  siteName: string;
  siteTitle: string;
  siteDescription: string;
  globalCpm: number;
  minWithdrawal: number;
  withdrawalMethods: string[];
  adPagesCount: number;
  bannerAd728x90: string;
  bannerAd300x250: string;
  bannerAd320x50: string;
  popunderCode: string;
  globalHeaderCode: string;
  faviconUrl: string;
  logoUrl: string;
  enableOwnAds: boolean; // "My own page" option
  enableNeonAdGate?: boolean;
  neonTodayAdCode?: string;
  enableEmailBackup?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  backupSenderEmail?: string;
  backupReceiverEmail?: string;
  enableOfferWall?: boolean;
  offerWallSeconds?: number;
  offerWallCount?: number;
  offerWallUrl1?: string;
  offerWallUrl2?: string;
  offerWallUrl3?: string;
  offerWallUrl4?: string;
  enableThunderRedirect?: boolean;
  adTopLeftCode?: string;
  adTopCenterCode?: string;
  adTopRightCode?: string;
  adLeftCode?: string;
  adBottomCenterCode?: string;
  adRightCode?: string;
  ad300x600Code?: string;
  enableSponsoredAd1?: boolean;
  sponsoredAd1Url?: string;
  sponsoredAd1Timer?: number;
  enableSponsoredAd2?: boolean;
  sponsoredAd2Url?: string;
  sponsoredAd2Timer?: number;
  advCpmOfferWall?: number;
  advCpmSponsoredPopup?: number;
  advCpmBanner728x90?: number;
  advCpmBanner468x60?: number;
  advCpmBanner300x250?: number;
  advCpmBanner320x50?: number;
  advCpmBanner300x600?: number;
  advCpmBannerLeft?: number;
  advCpmBannerRight?: number;
  // Payment & Deposit Gateways
  enableFaucetPayDeposit?: boolean;
  faucetPayMerchant?: string;
  faucetPaySecret?: string;
  enableOxaPayDeposit?: boolean;
  oxaPayMerchantKey?: string;
  oxaPayApiKey?: string;
  enableUpiDeposit?: boolean;
  upiId?: string;
  upiQrUrl?: string;
  upiAccountHolderName?: string;
  // Official Telegram Channel / Support Link
  telegramChannelUrl?: string;
  // Official Instagram Link
  instagramUrl?: string;
  // AdsLab Monetization SDK & Ad Placements
  enableAdsLab?: boolean;
  adslabIntPlacement?: string;
  adslabRewPlacement?: string;
  adslabUserId?: string;
  adslabAutoInterstitial?: boolean;
  adslabRewardedSkip?: boolean;
  adslabBannerCode?: string;
  // Public Counter Metric Boosts
  fakeExtraViews?: number;
  fakeExtraWithdrawn?: number;
  fakeExtraUsers?: number;
  fakeExtraLinks?: number;
}

export interface DepositRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  method: 'faucetpay' | 'oxapay' | 'upi';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  txnId?: string;
  screenshotUrl?: string;
  adminNote?: string;
  gatewayTxnId?: string;
}

export interface AdvertiserCampaign {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  type: 
    | 'offerwall'
    | 'sponsored_popup'
    | 'banner_728x90'
    | 'banner_468x60'
    | 'banner_300x250'
    | 'banner_320x50'
    | 'banner_300x600'
    | 'banner_left'
    | 'banner_right';
  targetUrl?: string;
  bannerImageUrl?: string;
  adCode?: string;
  cpm: number;
  totalBudget: number;
  spent: number;
  impressions: number;
  clicks: number;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
}

export interface DashboardStats {
  totalViews: number;
  totalEarnings: number;
  todayViews: number;
  todayEarnings: number;
  monthViews: number;
  monthEarnings: number;
  averageCpm: number;
  dailyStats: {
    date: string;
    views: number;
    earnings: number;
  }[];
  dailyReports?: {
    date: string;
    views: number;
    earnings: number;
    cpm: number;
  }[];
  monthlyReports?: {
    month: string;
    views: number;
    earnings: number;
    cpm: number;
  }[];
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'open' | 'replied' | 'closed';
  createdAt: string;
  updatedAt: string;
  adminReply?: string;
}
