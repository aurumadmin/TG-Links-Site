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
  customCpm?: number; // Custom CPM set by admin for this user
  apiToken: string; // Dynamic API Token for programmatic integration
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
}

export interface AdFlyShortener {
  id: string;
  name: string;
  apiUrl: string;
  apiToken: string;
  enabled: boolean;
  priority: number; // For prioritizing which API to use
}

export interface ClickLog {
  id: string;
  linkId: string;
  userId: string;
  timestamp: string;
  ip: string;
  earning: number;
  country: string;
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
