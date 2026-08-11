import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import fetch from "node-fetch";
import nodemailer from "nodemailer";
import zlib from "zlib";

import { 
  User, 
  Link, 
  AdFlyShortener, 
  ClickLog, 
  Withdrawal, 
  SystemSettings 
} from "./src/types";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isVercel = !!process.env.VERCEL;

// We check multiple locations to locate the read-only template data.json in serverless or bundled environments
const potentialTemplates = [
  path.join(process.cwd(), "data.json"),
  path.join(process.cwd(), "..", "data.json"),
  path.resolve("data.json"),
  path.resolve("../data.json")
];

let BASE_DB_FILE = path.join(process.cwd(), "data.json");
for (const p of potentialTemplates) {
  try {
    if (fs.existsSync(p)) {
      BASE_DB_FILE = p;
      break;
    }
  } catch (e) {
    // Ignore potential permission errors checking exists
  }
}

// Dynamically determine the database file path based on write accessibility or environment configuration
let DB_FILE = process.env.DB_PATH || BASE_DB_FILE;

if (process.env.DB_PATH) {
  console.log("[TG Links] Custom database path requested via DB_PATH:", process.env.DB_PATH);
  // Ensure parent directory exists
  const parentDir = path.dirname(process.env.DB_PATH);
  try {
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    // Copy base database to custom DB path if it does not exist
    if (!fs.existsSync(process.env.DB_PATH) && fs.existsSync(BASE_DB_FILE)) {
      fs.copyFileSync(BASE_DB_FILE, process.env.DB_PATH);
      console.log("[TG Links] Copied initial database template from", BASE_DB_FILE, "to custom DB_PATH", process.env.DB_PATH);
    }
  } catch (err) {
    console.error("[TG Links] Error preparing custom DB_PATH directory/file:", err);
  }
} else {
  // Standard dynamic fallback for serverless or container environments
  try {
    if (fs.existsSync(BASE_DB_FILE)) {
      // Check if writable
      fs.accessSync(BASE_DB_FILE, fs.constants.W_OK);
    } else {
      // Attempt to write a tiny test file to verify write access to directory
      const testFile = path.join(process.cwd(), ".db-write-test");
      fs.writeFileSync(testFile, "1");
      fs.unlinkSync(testFile);
    }
  } catch (e) {
    // If not writable, fall back to /tmp directory which is always writable on serverless platforms
    DB_FILE = "/tmp/data.json";
  }

  // Copy template data.json to writable path if needed
  if (DB_FILE === "/tmp/data.json") {
    try {
      if (!fs.existsSync(DB_FILE) && fs.existsSync(BASE_DB_FILE)) {
        fs.copyFileSync(BASE_DB_FILE, DB_FILE);
        console.log("[TG Links] Copied initial database template from", BASE_DB_FILE, "to", DB_FILE);
      }
    } catch (err) {
      console.error("[TG Links] Failed to copy initial database to /tmp:", err);
    }
  }
}

const app = express();

// Define Admin list
const ADMIN_EMAILS = [
  "teamthunderofficialyt@gmail.com",
  "freefiregtamcpe@gmail.com"
];

// Helper to generate dynamic API tokens for users
function generateApiToken() {
  const chars = "0123456789abcdef";
  let token = "";
  for (let i = 0; i < 40; i++) {
    token += chars[Math.floor(Math.random() * 16)];
  }
  return token;
}

// Request helpers to correctly fetch protocol and host when run under cloud run reverse proxies
function getRequestProtocol(req: express.Request): string {
  const host = getRequestHost(req);
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    return "https";
  }
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (forwardedProto) {
    if (Array.isArray(forwardedProto)) {
      return forwardedProto[0];
    }
    return forwardedProto.split(",")[0].trim();
  }
  return req.secure ? "https" : "http";
}

function getRequestHost(req: express.Request): string {
  const hostHeader = req.get("host") || "";
  const isProd = !hostHeader.includes("localhost") && !hostHeader.includes("127.0.0.1") && !hostHeader.includes("ais-dev") && !hostHeader.includes("ais-pre");
  
  if (isProd) {
    return "tglinks.eu.cc";
  }

  const forwardedHost = req.headers["x-forwarded-host"];
  if (forwardedHost) {
    if (Array.isArray(forwardedHost)) {
      return forwardedHost[0];
    }
    return forwardedHost.split(",")[0].trim();
  }
  return hostHeader || "tglinks.eu.cc";
}

function getCpmFromRequest(req: express.Request, user: any, dbSettings: any): number {
  const xVal = req.query.x || req.body?.x || req.query.cpm || req.body?.cpm;
  if (xVal !== undefined && xVal !== null && xVal !== "") {
    const parsed = Number(xVal);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return (user && user.customCpm) ? user.customCpm : dbSettings.globalCpm;
}

function getCurrentCpmForLink(link: any, db: any): number {
  if (!link) return db.settings.globalCpm;
  if (link.userId && link.userId !== "guest") {
    const user = db.users.find((u: any) => u.id === link.userId);
    if (user) {
      if (user.customCpm !== undefined && user.customCpm !== null && user.customCpm > 0) {
        return user.customCpm;
      }
    }
  }
  return db.settings.globalCpm;
}

// Helper to syndicate a link with external AdLinkFly shortener APIs dynamically
async function getExternalShortenedUrl(
  finalDestinationUrl: string, 
  db: any, 
  user?: any,
  isFaucetModeOverride?: boolean
): Promise<{ id: string; url: string } | null> {
  // Determine if this request is for Faucet traffic
  const isFaucetUser = isFaucetModeOverride !== undefined 
    ? !!isFaucetModeOverride 
    : !!user?.enableFaucetMode;

  const enabledApis = (db.adFlyShorteners || []).filter((api: any) => {
    if (!api.enabled) return false;
    // Strict separation: Faucet shorteners ONLY for Faucet users/traffic, Normal shorteners ONLY for Normal users/traffic
    const apiIsFaucet = !!api.isFaucetApi;
    return apiIsFaucet === isFaucetUser;
  });

  if (enabledApis.length === 0) return null;

  // Sort by priority/rank order (highest priority first). If equal, maintain set order (Rank #1, Rank #2, etc.)
  const sortedApis = [...enabledApis].sort((a: any, b: any) => {
    const pA = Number(a.priority || 0);
    const pB = Number(b.priority || 0);
    if (pB !== pA) {
      return pB - pA;
    }
    return 0;
  });

  const fetchFn = typeof globalThis.fetch === "function" 
    ? globalThis.fetch 
    : async (...args: any[]) => {
        const { default: f } = await import("node-fetch");
        return (f as any)(...args);
      };

  // Chain active shorteners in sequence from Rank #1 down to the last Rank so visitor completes:
  // Rank #1 -> Rank #2 -> Rank #3 ... -> finalDestinationUrl (/go-final/{code})
  // To achieve this, we wrap starting from the last rank towards the first rank.
  let currentTargetUrl = finalDestinationUrl;
  let topSuccessfulApiId = "";
  let hasChainedAny = false;

  const reversedApis = [...sortedApis].reverse();

  for (const selectedApi of reversedApis) {
    try {
      let cleanApiUrl = selectedApi.apiUrl.trim();
      if (!cleanApiUrl.startsWith("http://") && !cleanApiUrl.startsWith("https://")) {
        cleanApiUrl = "https://" + cleanApiUrl;
      }
      if (cleanApiUrl.endsWith("/")) {
        cleanApiUrl = cleanApiUrl.slice(0, -1);
      }
      if (!cleanApiUrl.includes("/api") && !cleanApiUrl.endsWith("/api")) {
        cleanApiUrl += "/api";
      }
      const apiRequestUrl = `${cleanApiUrl}?api=${selectedApi.apiToken}&url=${encodeURIComponent(currentTargetUrl)}`;

      // Use AbortController for an 8 seconds timeout per shortener API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetchFn(apiRequestUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      const text = await response.text();
      let shortenedUrl = "";

      try {
        const json = JSON.parse(text);
        if (json && json.status !== "error") {
          if (json.status === "success" || json.shortenedUrl || json.url) {
            shortenedUrl = json.shortenedUrl || json.url || "";
          }
        }
      } catch (e) {
        // Not valid JSON, check if plain-text URL
        const trimmedText = text.trim();
        if (/^https?:\/\//i.test(trimmedText)) {
          shortenedUrl = trimmedText;
        }
      }

      if (shortenedUrl && /^https?:\/\//i.test(shortenedUrl)) {
        currentTargetUrl = shortenedUrl;
        topSuccessfulApiId = selectedApi.id;
        hasChainedAny = true;
      } else {
        console.warn(`External shortener API ${selectedApi.name} returned an invalid or empty response:`, text);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.error(`Failed to syndicate with external shortener API ${selectedApi.name} (Request Timeout)`);
      } else {
        console.error(`Failed to syndicate with external shortener API ${selectedApi.name}:`, err);
      }
    }
  }

  if (hasChainedAny) {
    return { id: topSuccessfulApiId, url: currentTargetUrl };
  }

  return null;
}

// Verification Token Store for strictly counting views only when shortener chain is fully completed
interface PendingVerification {
  code: string;
  ip: string;
  createdAt: number;
  used: boolean;
}

const pendingVerificationsMap = new Map<string, PendingVerification>();

function createVerificationToken(code: string, ip: string): string {
  const vtok = "vtok_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
  pendingVerificationsMap.set(vtok, {
    code,
    ip,
    createdAt: Date.now(),
    used: false
  });
  
  // Clean up tokens older than 1 hour
  const now = Date.now();
  for (const [key, value] of pendingVerificationsMap.entries()) {
    if (now - value.createdAt > 60 * 60 * 1000) {
      pendingVerificationsMap.delete(key);
    }
  }

  return vtok;
}

function verifyAndConsumeToken(vtok: string | undefined, code: string): boolean {
  if (!vtok || typeof vtok !== "string") return false;
  const entry = pendingVerificationsMap.get(vtok);
  if (!entry) return false;
  if (entry.code !== code) return false;
  if (entry.used) return false;
  // 30-minute expiry window
  if (Date.now() - entry.createdAt > 30 * 60 * 1000) return false;

  entry.used = true;
  return true;
}

// --- GOOGLE DRIVE DATABASE SYNC INTEGRATION ---
let gdriveSyncEnabled = false;
let gdriveFileId = process.env.GOOGLE_DRIVE_FILE_ID || "";
let serviceAccountEmail = "";
let syncPromise: Promise<any> = Promise.resolve();
let cachedDbInMemory: any = null;

// Clean fetch helper with a strict timeout to prevent hanging the event loop
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs: number = 3500): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal as any
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

// Helper to sign service account JWT using RS256 with Node's crypto library
function signServiceAccountJwt(key: any, scope: string): string {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: key.client_email,
    scope: scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const base64ClaimSet = Buffer.from(JSON.stringify(claimSet)).toString("base64url");
  
  let privateKey = key.private_key || "";
  if (typeof privateKey === "string") {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${base64Header}.${base64ClaimSet}`);
  const signature = sign.sign(privateKey, "base64url");
  
  return `${base64Header}.${base64ClaimSet}.${signature}`;
}

// Get access token for service account
async function getServiceAccountToken(): Promise<string> {
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY env variable is not set");
  }
  
  let key: any;
  try {
    key = JSON.parse(rawKey.trim());
  } catch (err) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON: " + (err as Error).message);
  }
  
  serviceAccountEmail = key.client_email || "";
  const jwt = signServiceAccountJwt(key, "https://www.googleapis.com/auth/drive");
  
  const params = new URLSearchParams();
  params.append("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  params.append("assertion", jwt);
  
  const res = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  }, 3500);
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth token exchange failed: ${text}`);
  }
  
  const data: any = await res.json();
  return data.access_token;
}

// Initialize sync if key is provided
// Initialize sync if key is provided
if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  gdriveSyncEnabled = false; // Explicitly disabled per user request
  console.log("[TG Links] Google Drive cloud database persistence is disabled per user request");
  try {
    const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY.trim());
    serviceAccountEmail = key.client_email || "";
  } catch (e) {}
}

async function loadDbFromGoogleDrive(): Promise<any> {
  if (!gdriveSyncEnabled) return null;
  
  try {
    const token = await getServiceAccountToken();
    
    // If we don't have a file ID, let's search for a file named "tglinks_db.json"
    if (!gdriveFileId) {
      console.log("[TG Links] Google Drive File ID not specified. Searching for 'tglinks_db.json'...");
      const searchRes = await fetchWithTimeout(
        "https://www.googleapis.com/drive/v3/files?q=name='tglinks_db.json'+and+trashed=false&fields=files(id)",
        {
          headers: { Authorization: `Bearer ${token}` }
        },
        3500
      );
      
      if (searchRes.ok) {
        const searchData: any = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          gdriveFileId = searchData.files[0].id;
          console.log("[TG Links] Found existing Google Drive database file ID:", gdriveFileId);
        }
      }
    }
    
    // If still no file ID, we will create the file in saveDbToGoogleDrive when it writes
    if (!gdriveFileId) {
      console.log("[TG Links] No existing database file found on Google Drive. Will create one on next save.");
      return null;
    }
    
    // Fetch file content
    console.log(`[TG Links] Downloading database from Google Drive file: ${gdriveFileId}...`);
    const downloadRes = await fetchWithTimeout(
      `https://www.googleapis.com/drive/v3/files/${gdriveFileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` }
      },
      4000
    );
    
    if (!downloadRes.ok) {
      if (downloadRes.status === 404) {
        console.warn("[TG Links] Google Drive database file not found (404), resetting file ID");
        gdriveFileId = "";
        return null;
      }
      const errText = await downloadRes.text();
      throw new Error(`Failed to download database file (HTTP ${downloadRes.status}): ${errText}`);
    }
    
    const dbContent = await downloadRes.text();
    if (!dbContent || !dbContent.trim()) {
      console.warn("[TG Links] Google Drive database file is empty.");
      return null;
    }

    const parsed = JSON.parse(dbContent.trim());
    console.log("[TG Links] Successfully synchronized database from Google Drive!");
    cachedDbInMemory = parsed;
    
    // Write locally as backup
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
    } catch (e) {}
    
    return parsed;
  } catch (err: any) {
    console.error("[TG Links] Error synchronizing database from Google Drive:", err.message);
    throw err;
  }
}

async function saveDbToGoogleDrive(data: any): Promise<void> {
  if (!gdriveSyncEnabled) return;
  
  try {
    const token = await getServiceAccountToken();
    const bodyStr = JSON.stringify(data, null, 2);
    
    if (gdriveFileId) {
      // Update existing file
      console.log(`[TG Links] Uploading database updates to Google Drive: ${gdriveFileId}...`);
      const updateRes = await fetchWithTimeout(
        `https://www.googleapis.com/upload/drive/v3/files/${gdriveFileId}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: bodyStr
        },
        5000
      );
      
      if (!updateRes.ok) {
        const errText = await updateRes.text();
        throw new Error(`Failed to update Google Drive file: ${errText}`);
      }
      console.log("[TG Links] Successfully uploaded database updates to Google Drive!");
    } else {
      // Create new file
      console.log("[TG Links] Creating new database file 'tglinks_db.json' on Google Drive...");
      
      // Step 1: Create file metadata
      const createMetaRes = await fetchWithTimeout(
        "https://www.googleapis.com/drive/v3/files",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: "tglinks_db.json",
            mimeType: "application/json"
          })
        },
        3500
      );
      
      if (!createMetaRes.ok) {
        const errText = await createMetaRes.text();
        throw new Error(`Failed to create file metadata: ${errText}`);
      }
      
      const fileMeta: any = await createMetaRes.json();
      gdriveFileId = fileMeta.id;
      console.log(`[TG Links] Created file ID: ${gdriveFileId}. Now uploading content...`);
      
      // Step 2: Upload content to the newly created file
      const uploadRes = await fetchWithTimeout(
        `https://www.googleapis.com/upload/drive/v3/files/${gdriveFileId}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: bodyStr
        },
        5000
      );
      
      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Failed to upload file content: ${errText}`);
      }
      console.log("[TG Links] Successfully created and saved database to Google Drive!");
    }
  } catch (err: any) {
    console.error("[TG Links] Error saving database to Google Drive:", err.message);
    throw err;
  }
}

// Helper functions to format ISO date strings in Indian Standard Time (IST, UTC+5:30)
function getISTDateString(dateInput: Date | string | number = new Date()): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
  
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(d);
}

function getISTMonthString(dateInput: Date | string | number = new Date()): string {
  return getISTDateString(dateInput).substring(0, 7);
}

// Helper to load/save database
function loadDb() {
  let db: any = null;
  let initialDbSeedNeeded = false;

  if (cachedDbInMemory) {
    db = cachedDbInMemory;
  } else {
    let dbContent = "";
    try {
      if (!fs.existsSync(DB_FILE)) {
        initialDbSeedNeeded = true;
      } else {
        dbContent = fs.readFileSync(DB_FILE, "utf-8").trim();
        if (!dbContent) {
          initialDbSeedNeeded = true;
        }
      }
    } catch (err) {
      console.error("[TG Links] Error checking/reading database file:", err);
      initialDbSeedNeeded = true;
    }

    if (!initialDbSeedNeeded) {
      try {
        db = JSON.parse(dbContent);
      } catch (err) {
        console.error("[TG Links] Failed to parse database JSON, falling back to seed:", err);
        initialDbSeedNeeded = true;
      }
    }
  }

  // Define Initial Seed Data
  const initialDb = {
    users: [
      {
        id: "admin-1",
        email: "freefiregtamcpe@gmail.com",
        role: "admin",
        balance: 100.0,
        totalEarned: 100.0,
        withdrawalMethod: "PayPal",
        withdrawalAccount: "admin_paypal@example.com",
        createdAt: new Date().toISOString(),
        banned: false,
        password: "Thunderffyt123@", // Default password
        apiToken: "d2c8261beff4b98ff674d7f306f2fe205bb5c25d"
      },
      {
        id: "admin-2",
        email: "teamthunderofficialyt@gmail.com",
        role: "admin",
        balance: 0.0,
        totalEarned: 0.0,
        withdrawalMethod: "PayPal",
        withdrawalAccount: "teamthunder@example.com",
        createdAt: new Date().toISOString(),
        banned: false,
        password: "Thunderffyt123@", // Default password
        apiToken: "c1b7250aeef3b88ee673d7e29ea5dc14aa4b14e1"
      }
    ],
    links: [],
    deletedLinksCount: 0,
    adFlyShorteners: [],
    clicksLog: [],
    withdrawals: [],
    settings: {
      siteName: "TG LINKS",
      siteTitle: "Shorten Links and Earn Money",
      siteDescription: "Unlock the power of shortened URLs. Monetize your traffic by sharing links with high-paying CPM rates.",
      globalCpm: 5.0, // $5 per 1000 clicks
      minWithdrawal: 2.0,
      withdrawalMethods: ["PayPal", "Payeer", "Bitcoin", "Bank Transfer", "UPI"],
      adPagesCount: 1,
      bannerAd728x90: `<div class="w-full h-24 bg-gradient-to-r from-blue-500 to-indigo-600 flex flex-col items-center justify-center border border-indigo-300 text-white rounded-lg shadow-sm px-4 text-center">
  <span class="text-xs uppercase tracking-widest font-bold opacity-75">Sponsor Banner (728x90)</span>
  <span class="font-medium text-sm md:text-base mt-1">Ready to scale your online presence? Partner with TG Links today!</span>
</div>`,
      bannerAd300x250: `<div class="w-[300px] h-[250px] bg-gradient-to-br from-purple-500 to-pink-500 flex flex-col items-center justify-center border border-purple-300 text-white rounded-lg shadow-sm p-6 text-center mx-auto">
  <span class="text-xs uppercase tracking-widest font-bold opacity-75">Premium Space (300x250)</span>
  <span class="font-semibold text-lg mt-2">Get 50% Off VPS Hosting</span>
  <p class="text-xs opacity-90 mt-2">High-speed SSD, unmetered bandwidth, and 24/7 dedicated tech support.</p>
  <button class="mt-4 px-4 py-2 bg-white text-purple-700 text-xs font-bold rounded shadow hover:bg-opacity-90 transition">Learn More</button>
</div>`,
      bannerAd320x50: `<div class="w-80 h-12 bg-gradient-to-r from-teal-500 to-emerald-600 flex items-center justify-between border border-teal-300 text-white rounded-lg shadow-sm px-4 mx-auto">
  <span class="text-xs font-bold uppercase tracking-wide">Ad: Secure VPN</span>
  <span class="text-xs bg-white text-teal-800 px-2 py-1 rounded font-semibold hover:bg-opacity-95 cursor-pointer">Get 3 Months Free</span>
</div>`,
      popunderCode: `<script>
  console.log("Popunder advertisement code loaded for Redirection Page");
</script>`,
      globalHeaderCode: `<script>
  console.log("Global site verification script loaded in site header");
</script>`,
      faviconUrl: "",
      logoUrl: "",
      enableOwnAds: true,
      enableNeonAdGate: false,
      neonTodayAdCode: `<iframe scrolling="no" src="https://neon.today/show/surf/21651" style="width: 100%; height: 250px; padding: 0; border: 1px dotted grey;" frameborder="0"></iframe>`,
      enableSponsoredAd1: true,
      sponsoredAd1Url: "https://www.rotate4all.com/promote/pt13azaa9mf1",
      sponsoredAd1Timer: 12,
      enableSponsoredAd2: true,
      sponsoredAd2Url: "https://www.rotate4all.com/promote/pt13azaa9mf1",
      sponsoredAd2Timer: 12
    }
  };

  if (initialDbSeedNeeded || !db) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
    } catch (err) {
      console.error("[TG Links] Failed to write initial database:", err);
    }
    cachedDbInMemory = initialDb;
    return initialDb;
  }

  let changed = false;
  
  if (!db.users) {
    db.users = initialDb.users;
    changed = true;
  } else {
    const originalLength = db.users.length;
    db.users = db.users.filter(Boolean);
    if (db.users.length !== originalLength) changed = true;
  }
  if (!db.links) {
    db.links = [];
    changed = true;
  } else {
    const originalLength = db.links.length;
    db.links = db.links.filter(Boolean);
    if (db.links.length !== originalLength) changed = true;
  }
  if (db.deletedLinksCount === undefined) {
    db.deletedLinksCount = 0;
    changed = true;
  }
  if (!db.adFlyShorteners || db.adFlyShorteners.length === 0) {
    db.adFlyShorteners = [
      {
        id: "api-shortxlinks-1",
        name: "ShortXLinks",
        apiUrl: "https://shortxlinks.com/",
        apiToken: "b6ac099187a0572e9d24ce4a679e9eb10115b02d",
        enabled: false,
        priority: 6,
        isFaucetApi: false
      },
      {
        id: "api-easysky-2",
        name: "EasySky",
        apiUrl: "https://easysky.in/",
        apiToken: "c74c424d10103b41dff815bcad304dce1f6050b1",
        enabled: false,
        priority: 5,
        isFaucetApi: false
      },
      {
        id: "api-shortxlinks-faucet-3",
        name: "ShortXLinks-Faucet",
        apiUrl: "https://shortxlinks.com/",
        apiToken: "b6ac099187a0572e9d24ce4a679e9eb10115b02d",
        enabled: false,
        priority: 4,
        isFaucetApi: true
      },
      {
        id: "api-easysky-faucet-4",
        name: "EasySky-Faucet",
        apiUrl: "https://easysky.in/",
        apiToken: "c74c424d10103b41dff815bcad304dce1f6050b1",
        enabled: false,
        priority: 3,
        isFaucetApi: true
      },
      {
        id: "api-oii-5",
        name: "Oii",
        apiUrl: "https://oii.io/",
        apiToken: "1edc96d59f77f395d8efd79d5feebbc1f2e82bc2",
        enabled: false,
        priority: 2,
        isFaucetApi: true
      },
      {
        id: "api-linknext-6",
        name: "LinkNext",
        apiUrl: "https://linknext.io/",
        apiToken: "cbc6cb0ca4ebfc65f8bc87556094cf5e2fafeaee",
        enabled: false,
        priority: 1,
        isFaucetApi: true
      }
    ];
    changed = true;
  } else {
    const originalLength = db.adFlyShorteners.length;
    db.adFlyShorteners = db.adFlyShorteners.filter(Boolean);
    if (db.adFlyShorteners.length !== originalLength) changed = true;
  }
  if (!db.clicksLog) {
    db.clicksLog = [];
    changed = true;
  } else {
    const originalLength = db.clicksLog.length;
    db.clicksLog = db.clicksLog.filter(Boolean);
    if (db.clicksLog.length !== originalLength) changed = true;
  }
  if (!db.withdrawals) {
    db.withdrawals = [];
    changed = true;
  } else {
    const originalLength = db.withdrawals.length;
    db.withdrawals = db.withdrawals.filter(Boolean);
    if (db.withdrawals.length !== originalLength) changed = true;
  }
  if (!db.tickets) {
    db.tickets = [];
    changed = true;
  } else {
    const originalLength = db.tickets.length;
    db.tickets = db.tickets.filter(Boolean);
    if (db.tickets.length !== originalLength) changed = true;
  }

  if (db.settings) {
    if (db.settings.enableNeonAdGate === undefined) {
      db.settings.enableNeonAdGate = false;
      changed = true;
    }
    if (db.settings.neonTodayIframeUrl !== undefined) {
      delete db.settings.neonTodayIframeUrl;
      changed = true;
    }
    if (db.settings.neonTodayAdCode === undefined) {
      db.settings.neonTodayAdCode = `<iframe scrolling="no" src="https://neon.today/show/surf/21651" style="width: 100%; height: 250px; padding: 0; border: 1px dotted grey;" frameborder="0"></iframe>`;
      changed = true;
    }
    if (db.settings.enableSponsoredAd1 === undefined) {
      db.settings.enableSponsoredAd1 = true;
      changed = true;
    }
    if (!db.settings.sponsoredAd1Url) {
      db.settings.sponsoredAd1Url = "https://www.rotate4all.com/promote/pt13azaa9mf1";
      changed = true;
    }
    if (!db.settings.sponsoredAd1Timer) {
      db.settings.sponsoredAd1Timer = 12;
      changed = true;
    }
    if (db.settings.enableSponsoredAd2 === undefined) {
      db.settings.enableSponsoredAd2 = true;
      changed = true;
    }
    if (!db.settings.sponsoredAd2Url) {
      db.settings.sponsoredAd2Url = "https://www.rotate4all.com/promote/pt13azaa9mf1";
      changed = true;
    }
    if (!db.settings.sponsoredAd2Timer) {
      db.settings.sponsoredAd2Timer = 12;
      changed = true;
    }
    if (db.settings.advCpmOfferWall === undefined) { db.settings.advCpmOfferWall = 3.0; changed = true; }
    if (db.settings.advCpmSponsoredPopup === undefined) { db.settings.advCpmSponsoredPopup = 4.0; changed = true; }
    if (db.settings.advCpmBanner728x90 === undefined) { db.settings.advCpmBanner728x90 = 1.5; changed = true; }
    if (db.settings.advCpmBanner468x60 === undefined) { db.settings.advCpmBanner468x60 = 1.2; changed = true; }
    if (db.settings.advCpmBanner300x250 === undefined) { db.settings.advCpmBanner300x250 = 2.0; changed = true; }
    if (db.settings.advCpmBanner320x50 === undefined) { db.settings.advCpmBanner320x50 = 1.0; changed = true; }
    if (db.settings.advCpmBanner300x600 === undefined) { db.settings.advCpmBanner300x600 = 2.5; changed = true; }
    if (db.settings.advCpmBannerLeft === undefined) { db.settings.advCpmBannerLeft = 1.5; changed = true; }
    if (db.settings.advCpmBannerRight === undefined) { db.settings.advCpmBannerRight = 1.5; changed = true; }
    if (db.settings.enableFaucetPayDeposit === undefined) { db.settings.enableFaucetPayDeposit = true; changed = true; }
    if (db.settings.faucetPayMerchant === undefined) { db.settings.faucetPayMerchant = ""; changed = true; }
    if (db.settings.faucetPaySecret === undefined) { db.settings.faucetPaySecret = ""; changed = true; }
    if (db.settings.enableOxaPayDeposit === undefined) { db.settings.enableOxaPayDeposit = true; changed = true; }
    if (db.settings.oxaPayMerchantKey === undefined) { db.settings.oxaPayMerchantKey = ""; changed = true; }
    if (db.settings.enableUpiDeposit === undefined) { db.settings.enableUpiDeposit = true; changed = true; }
    if (db.settings.upiId === undefined) { db.settings.upiId = "pay@upi"; changed = true; }
    if (db.settings.upiQrUrl === undefined) { db.settings.upiQrUrl = ""; changed = true; }
    if (db.settings.upiAccountHolderName === undefined) { db.settings.upiAccountHolderName = "TG Links Ads"; changed = true; }
    if (db.settings.enableEmailBackup === undefined) { db.settings.enableEmailBackup = false; changed = true; }
  } else {
    db.settings = initialDb.settings;
    changed = true;
  }

  if (!db.depositRequests) {
    db.depositRequests = [];
    changed = true;
  } else {
    const originalLength = db.depositRequests.length;
    db.depositRequests = db.depositRequests.filter(Boolean);
    if (db.depositRequests.length !== originalLength) changed = true;
  }

  if (!db.advertiserCampaigns) {
    db.advertiserCampaigns = [];
    changed = true;
  } else {
    const originalLength = db.advertiserCampaigns.length;
    db.advertiserCampaigns = db.advertiserCampaigns.filter(Boolean);
    if (db.advertiserCampaigns.length !== originalLength) changed = true;
  }

  db.users = (db.users || []).filter(Boolean).map((u: any) => {
    if (!u.apiToken) {
      u.apiToken = generateApiToken();
      changed = true;
    }
    if (u.advertiserBalance === undefined) {
      u.advertiserBalance = 0;
      changed = true;
    }
    return u;
  });

  if (changed) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (err) {
      console.error("[TG Links] Failed to update database on disk:", err);
    }
  }

  // Auto-cleanup API generated links with no new views in 3 days
  if (cleanupInactiveApiLinks(db)) {
    saveDb(db);
  }

  cachedDbInMemory = db;
  return db;
}

function cleanupInactiveApiLinks(db: any): boolean {
  if (!db || !Array.isArray(db.links)) return false;
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in ms
  const now = Date.now();
  let changed = false;

  const initialCount = db.links.length;
  let deletedNow = 0;
  db.links = db.links.filter((link: any) => {
    // Only check links generated programmatically via Developer API
    if (!link || !link.isApiGenerated) {
      return true;
    }

    const lastActivityStr = link.lastViewedAt || link.createdAt;
    if (!lastActivityStr) return true;

    const activityTime = new Date(lastActivityStr).getTime();
    if (isNaN(activityTime)) return true;

    // Auto delete if no new views/clicks in 3 days
    if (now - activityTime > THREE_DAYS_MS) {
      changed = true;
      deletedNow++;
      return false;
    }
    return true;
  });

  if (deletedNow > 0) {
    db.deletedLinksCount = (db.deletedLinksCount || 0) + deletedNow;
    console.log(`[Auto Cleanup] Successfully deleted ${deletedNow} API-generated links with no new views in 3 days. Total deleted links tracked: ${db.deletedLinksCount}`);
  }

  return changed;
}

function saveDb(data: any) {
  cachedDbInMemory = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[TG Links] Failed to save database file:", err);
  }

  if (gdriveSyncEnabled) {
    // Chain background sync
    syncPromise = syncPromise.then(() => saveDbToGoogleDrive(data)).catch((err) => {
      console.error("[TG Links] Background Google Drive sync failed:", err);
    });
  }
}

// Helper to send general emails via SMTP
async function sendSmtpEmail(options: { to?: string; subject: string; text: string; html?: string }): Promise<{ success: boolean; error?: string }> {
  const db = loadDb();
  const settings = db.settings || {};
  const {
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    backupSenderEmail,
    backupReceiverEmail
  } = settings;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.warn("[TG Links SMTP] Cannot send email: SMTP credentials are not configured in Admin Settings.");
    return { success: false, error: "SMTP host, port, user or pass is not configured in admin settings." };
  }

  const sender = backupSenderEmail || smtpUser;
  const recipient = options.to || backupReceiverEmail || ADMIN_EMAILS[0] || smtpUser;

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: smtpSecure === true || smtpSecure === "true" || Number(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000
    });

    const mailOptions = {
      from: `"${settings.siteName || 'TG Links'} Support" <${sender}>`,
      to: recipient,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    await transporter.sendMail(mailOptions);
    console.log(`[TG Links SMTP] Email sent successfully to ${recipient}`);
    return { success: true };
  } catch (err: any) {
    console.error("[TG Links SMTP] Failed to send email:", err);
    return { success: false, error: err.message || String(err) };
  }
}

// SMTP Database Backup Functions
async function sendEmailBackup(settings: any, isTest: boolean = false): Promise<{ success: boolean; error?: string }> {
  const {
    enableEmailBackup,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    backupSenderEmail,
    backupReceiverEmail
  } = settings || {};

  if (!isTest && !enableEmailBackup) {
    return { success: false, error: "Email backup is disabled in settings" };
  }

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !backupSenderEmail || !backupReceiverEmail) {
    return { success: false, error: "SMTP configuration is incomplete" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: smtpSecure === true || smtpSecure === "true" || Number(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000
    });

    if (!fs.existsSync(DB_FILE)) {
      return { success: false, error: "Database file does not exist to backup" };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const attachmentName = `tglinks_db_backup_${timestamp}.json.gz`;
    const dbRaw = fs.readFileSync(DB_FILE);
    const compressedDb = zlib.gzipSync(dbRaw);

    const originalSizeKb = (dbRaw.length / 1024).toFixed(2);
    const compressedSizeKb = (compressedDb.length / 1024).toFixed(2);
    const compressionRatio = ((1 - compressedDb.length / dbRaw.length) * 100).toFixed(1);

    const mailOptions = {
      from: backupSenderEmail,
      to: backupReceiverEmail,
      subject: isTest
        ? `[TG Links] Test SMTP Database Backup`
        : `[TG Links] Hourly Database Auto-Backup`,
      text: isTest
        ? `Hello!\n\nThis is a test backup to confirm your SMTP configuration on TG Links is working properly.\n\nTime of Send: ${new Date().toISOString()}\n\nDatabase Size: ${originalSizeKb} KB\nCompressed Backup Size: ${compressedSizeKb} KB (Gzip compressed: saved ${compressionRatio}%)\n\nPlease find the gzipped backup file (.json.gz) attached.`
        : `Hello!\n\nThis is your automated hourly database backup from TG Links.\n\nTimestamp: ${new Date().toISOString()}\nDatabase File Path: ${DB_FILE}\nDatabase Size: ${originalSizeKb} KB\nCompressed Backup Size: ${compressedSizeKb} KB (Gzip compressed: saved ${compressionRatio}%)\n\nNote: The database is compressed using standard gzip format to save your email storage space and bypass SMTP size limits (under 25MB limit). You can open this file using standard tools like 7-Zip, WinRAR, or the gzip command-line.\n\nPlease keep this copy safe to protect against data loss.`,
      attachments: [
        {
          filename: attachmentName,
          content: compressedDb
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`[TG Links] Database backup email successfully sent to ${backupReceiverEmail}`);
    return { success: true };
  } catch (err: any) {
    console.error("[TG Links] Failed to send database backup email:", err);
    return { success: false, error: err.message || String(err) };
  }
}

let emailBackupInterval: NodeJS.Timeout | null = null;

function startEmailBackupScheduler() {
  if (emailBackupInterval) {
    clearInterval(emailBackupInterval);
    emailBackupInterval = null;
  }

  const HOURLY_MS = 60 * 60 * 1000;
  
  emailBackupInterval = setInterval(async () => {
    try {
      const db = loadDb();
      if (db.settings?.enableEmailBackup) {
        console.log("[TG Links] Executing scheduled hourly database backup via SMTP...");
        await sendEmailBackup(db.settings, false);
      }
    } catch (err) {
      console.error("[TG Links] Error in background email backup scheduler:", err);
    }
  }, HOURLY_MS);

  console.log("[TG Links] Background hourly SMTP database backup scheduler initialized.");
}

function setupRoutes() {
  app.set("trust proxy", true);

  // Google Drive Sync Middleware
  app.use(async (req, res, next) => {
    if (!gdriveSyncEnabled) {
      return next();
    }

    // Capture initial syncPromise state for the current request
    res.locals.gdriveStartPromise = syncPromise;

    // If Google Drive Sync is enabled and our cache is empty (e.g. cold start), block and fetch it first
    if (!cachedDbInMemory) {
      console.log("[TG Links] Cold start detected, loading database from Google Drive before processing request...");
      try {
        await loadDbFromGoogleDrive();
      } catch (err: any) {
        console.error("[TG Links] Failed to load database from Google Drive on cold start:", err.message);
      }
    }

    // Intercept res.send to ensure pending Google Drive writes complete before returning.
    // Since Express's res.json() internally calls res.send(), intercepting only res.send is sufficient and prevents recursion.
    const originalSend = res.send;

    res.send = function(...args: any[]) {
      // Only delay the response if a database write occurred DURING this specific request
      if (syncPromise !== res.locals.gdriveStartPromise) {
        syncPromise.then(() => {
          originalSend.apply(this, args);
        }).catch(err => {
          console.error("[TG Links] Error waiting for syncPromise in res.send:", err);
          originalSend.apply(this, args);
        });
      } else {
        originalSend.apply(this, args);
      }
      return this;
    };

    next();
  });

  // Enable dynamic Cross-Origin Resource Sharing (CORS) for external static hosts (like Cloudflare Pages)
  app.use((req, res, next) => {
    const origin = req.headers.origin || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (origin !== "*") {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));
  app.use(express.static(path.join(process.cwd(), "public")));

  // Explicit route handler for /ads.txt
  app.get("/ads.txt", (req, res) => {
    const adsTxtPath = path.join(process.cwd(), "public", "ads.txt");
    if (fs.existsSync(adsTxtPath)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.sendFile(adsTxtPath);
    }
    return res.status(404).type("text/plain").send("ads.txt not found");
  });

  // API Middleware to retrieve and log requests
  app.use((req, res, next) => {
    // Basic API request logging
    next();
  });

  // Auth Helper to extract user ID from headers (simple token system)
  const getAuthUser = (req: express.Request): User | null => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const userId = authHeader.substring(7);
    const db = loadDb();
    return db.users.find((u: any) => u.id === userId && !u.banned) || null;
  };

  // --- DIAGNOSTICS ENDPOINT ---
  app.get("/api/debug-db", (req, res) => {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      isVercel: !!process.env.VERCEL,
      node_env: process.env.NODE_ENV,
      cwd: process.cwd(),
      BASE_DB_FILE,
      DB_FILE,
      base_exists: false,
      db_exists: false,
      gdrive_sync_enabled: gdriveSyncEnabled,
      gdrive_file_id: gdriveFileId,
      service_account_email: serviceAccountEmail,
    };

    try {
      diagnostics.base_exists = fs.existsSync(BASE_DB_FILE);
    } catch (e: any) {
      diagnostics.base_exists_error = e.message;
    }

    try {
      diagnostics.db_exists = fs.existsSync(DB_FILE);
    } catch (e: any) {
      diagnostics.db_exists_error = e.message;
    }

    try {
      const db = loadDb();
      diagnostics.load_db_success = true;
      diagnostics.db_keys = Object.keys(db);
      diagnostics.users_count = db.users ? db.users.length : 0;
      diagnostics.admins = db.users ? db.users.filter((u: any) => u.role === "admin").map((u: any) => ({ email: u.email, id: u.id })) : [];
    } catch (e: any) {
      diagnostics.load_db_success = false;
      diagnostics.load_db_error = e.message;
      diagnostics.load_db_stack = e.stack;
    }

    res.json(diagnostics);
  });

  // --- AUTH ENDPOINTS ---
  
  app.post("/api/auth/register", (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const db = loadDb();
      const existing = db.users.find((u: any) => u && u.email && u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Determine role based on admin emails list
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      
      const newUser: User & { password: string } = {
        id: "u-" + Math.random().toString(36).substring(2, 9),
        email: email.toLowerCase(),
        role: isAdmin ? "admin" : "user",
        balance: 0.0,
        totalEarned: 0.0,
        withdrawalMethod: "",
        withdrawalAccount: "",
        createdAt: new Date().toISOString(),
        banned: false,
        password: password,
        apiToken: generateApiToken()
      };

      db.users.push(newUser);
      saveDb(db);

      // Send welcome email notification
      sendSmtpEmail({
        to: newUser.email,
        subject: `Welcome to ${db.settings?.siteName || "TG Links"}!`,
        text: `Hello,\n\nWelcome to ${db.settings?.siteName || "TG Links"}! Your account has been successfully created.\n\nYou can now start shortening links and monetizing your traffic.\n\nThank you for joining us!`,
        html: `<div style="font-family: system-ui, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #4f46e5; margin-top: 0;">🎉 Welcome to ${db.settings?.siteName || "TG Links"}!</h2>
          <p>Your account (<strong>${newUser.email}</strong>) has been successfully created.</p>
          <p>Start creating shortened links in your dashboard and earn money with high CPM rates.</p>
          <p style="font-size: 12px; color: #64748b; margin-top: 24px;">If you did not register for this account, please contact support immediately.</p>
        </div>`
      }).catch((e: any) => console.error("[SMTP Notification Error] Welcome email:", e));

      const { password: _, ...userSafe } = newUser;
      res.json({ user: userSafe });
    } catch (err: any) {
      console.error("[TG Links] Registration Error:", err);
      res.status(500).json({ error: `Registration error: ${err.message}`, stack: err.stack });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const db = loadDb();
      const user = db.users.find(
        (u: any) => u && u.email && u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (!user) {
        return res.status(400).json({ error: "Invalid email or password" });
      }

      if (user.banned) {
        return res.status(403).json({ error: "This account has been banned" });
      }

      const { password: _, ...userSafe } = user;
      res.json({ user: userSafe });
    } catch (err: any) {
      console.error("[TG Links] Login Error:", err);
      res.status(500).json({ error: `Login error: ${err.message}`, stack: err.stack });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    res.json({ user });
  });

  // --- DEVELOPER PROGRAMMATIC SHORTENING API (GET & POST) ---
  app.all(["/api", "/api/"], async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    const api = String(req.query.api || req.body?.api || req.query.api_token || req.body?.api_token || "").trim();
    const url = String(req.query.url || req.body?.url || "").trim();
    const alias = String(req.query.alias || req.body?.alias || "").trim();
    const format = String(req.query.format || req.body?.format || "json").toLowerCase().trim();

    if (!api) {
      if (format === "text") return res.status(400).send("");
      return res.status(400).json({ status: "error", message: "API token is required" });
    }

    if (!url) {
      if (format === "text") return res.status(400).send("");
      return res.status(400).json({ status: "error", message: "Destination URL is required" });
    }

    const db = loadDb();
    let user = db.users.find((u: any) => u.apiToken === api && !u.banned);
    if (!user && api === "d2c8261beff4b98ff674d7f306f2fe205bb5c25d") {
      // Fallback/legacy support for external shortener token to first admin user
      user = db.users.find((u: any) => u.role === "admin" && !u.banned);
    }
    if (!user) {
      if (format === "text") return res.status(401).send("");
      return res.status(401).json({ status: "error", message: "Invalid or inactive API token" });
    }

    const originalUrl = url;

    // Generate unique short code
    let code = "";
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let isUnique = false;

    if (alias) {
      if (alias.length < 3) {
        if (format === "text") return res.status(400).send("");
        return res.status(400).json({ status: "error", message: "Custom alias must be at least 3 characters" });
      }
      const alreadyExists = db.links.some((l: any) => l.code.toLowerCase() === alias.toLowerCase());
      if (alreadyExists) {
        if (format === "text") return res.status(400).send("");
        return res.status(400).json({ status: "error", message: "Custom alias already exists" });
      }
      code = alias;
    } else {
      while (!isUnique) {
        code = "";
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        isUnique = !db.links.some((l: any) => l.code === code);
      }
    }

    // Determine CPM
    const linkCpm = getCpmFromRequest(req, user, db.settings);

    const protocol = getRequestProtocol(req);
    const host = getRequestHost(req);

    // Delegate to external AdLinkFly API if enabled
    let adFlyShortenerId = undefined;
    let adFlyShortenedUrl = undefined;

    const intermediateUrl = `${protocol}://${host}/go-final/${code}`;

    const isFaucetMode = !!user?.enableFaucetMode;
    const external = await getExternalShortenedUrl(intermediateUrl, db, user, isFaucetMode);
    if (external) {
      adFlyShortenerId = external.id;
      adFlyShortenedUrl = external.url;
    }

    const nowIso = new Date().toISOString();
    const newLink: Link = {
      id: "l-" + Math.random().toString(36).substring(2, 9),
      code,
      originalUrl,
      userId: user.id,
      userEmail: user.email,
      cpm: linkCpm,
      clicks: 0,
      earnings: 0.0,
      createdAt: nowIso,
      lastViewedAt: nowIso,
      isApiGenerated: true,
      status: "active",
      adFlyShortenerId,
      adFlyShortenedUrl
    };

    db.links.push(newLink);
    saveDb(db);

    const shortenedUrl = `${protocol}://${host}/go/${code}`;

    if (format === "text") {
      return res.send(shortenedUrl);
    }

    // Standard AdLinkFly API JSON Response
    return res.json({
      status: "success",
      shortenedUrl: shortenedUrl
    });
  });

  // --- ADVERTISER SYSTEM ENDPOINTS ---

  function getActiveAdvertiserAds(db: any, userIp?: string) {
    if (!db.advertiserImpressionsLog) db.advertiserImpressionsLog = [];
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    const activeCampaigns = (db.advertiserCampaigns || []).filter((c: any) => {
      if (!c || c.status !== "active") return false;
      if (Number(c.spent || 0) >= Number(c.totalBudget || 0)) return false;
      if (c.targetViews && Number(c.viewsDelivered || 0) >= Number(c.targetViews)) return false;

      // Filter out campaigns that the user with userIp has already viewed in the last 24 hours
      if (userIp) {
        const viewedIn24h = db.advertiserImpressionsLog.some((log: any) => {
          let logIp = log.ip;
          if (typeof logIp === "string" && logIp.includes(",")) {
            logIp = logIp.split(",")[0].trim();
          }
          const logTime = new Date(log.timestamp).getTime();
          return log.campaignId === c.id && logIp === userIp && logTime > twentyFourHoursAgo;
        });
        if (viewedIn24h) return false;
      }

      return true;
    });

    const getActiveForType = (type: string) => {
      return activeCampaigns.filter((c: any) => c.type === type);
    };

    const pickRandom = (list: any[]) => {
      if (!list || list.length === 0) return null;
      const idx = Math.floor(Math.random() * list.length);
      return list[idx];
    };

    // Offer Wall
    const offerWallList = getActiveForType("offerwall");
    const extraOfferWallAd = pickRandom(offerWallList);

    // Sponsored Popup
    const popupList = getActiveForType("sponsored_popup");
    const extraSponsoredPopupAd = pickRandom(popupList);

    // Banners
    const bannerSizes = [
      "banner_728x90",
      "banner_468x60",
      "banner_300x250",
      "banner_320x50",
      "banner_300x600",
      "banner_left",
      "banner_right"
    ];

    const activeBanners: Record<string, any> = {};
    for (const size of bannerSizes) {
      const list = getActiveForType(size);
      const chosen = pickRandom(list);
      if (chosen) {
        activeBanners[size] = {
          id: chosen.id,
          title: chosen.title,
          targetUrl: chosen.targetUrl || "",
          bannerImageUrl: chosen.bannerImageUrl || "",
          adCode: chosen.adCode || ""
        };
      }
    }

    return {
      offerWallAds: offerWallList.map((c: any) => ({
        id: c.id,
        title: c.title,
        targetUrl: c.targetUrl || ""
      })),
      extraOfferWallAd: extraOfferWallAd ? {
        id: extraOfferWallAd.id,
        title: extraOfferWallAd.title,
        targetUrl: extraOfferWallAd.targetUrl || ""
      } : null,
      extraSponsoredPopupAd: extraSponsoredPopupAd ? {
        id: extraSponsoredPopupAd.id,
        title: extraSponsoredPopupAd.title,
        targetUrl: extraSponsoredPopupAd.targetUrl || ""
      } : null,
      activeBanners
    };
  }

  // Get user campaigns
  app.get("/api/advertiser/campaigns", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const db = loadDb();
    const userCampaigns = (db.advertiserCampaigns || []).filter((c: any) => c.userId === user.id);
    res.json({ campaigns: userCampaigns });
  });

  // Convert publisher balance to advertiser balance
  app.post("/api/advertiser/convert-balance", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { amount } = req.body;
    const convertAmount = Number(amount);

    if (isNaN(convertAmount) || convertAmount <= 0) {
      return res.status(400).json({ error: "Please enter a valid positive conversion amount" });
    }

    const db = loadDb();
    const dbUser = db.users.find((u: any) => u.id === user.id);
    if (!dbUser) return res.status(404).json({ error: "User not found" });

    const userBal = Number(dbUser.balance || 0);
    if (convertAmount > userBal + 0.00001) {
      return res.status(400).json({ error: `Insufficient publisher balance. Available: $${userBal.toFixed(4)}` });
    }

    // Deduct publisher balance, add to advertiser balance
    dbUser.balance = Number(Math.max(0, userBal - convertAmount).toFixed(6));
    dbUser.advertiserBalance = Number(((dbUser.advertiserBalance || 0) + convertAmount).toFixed(6));

    saveDb(db);

    // Send email notification for balance conversion
    sendSmtpEmail({
      to: dbUser.email,
      subject: `[${db.settings?.siteName || "TG Links"}] Publisher Balance Converted ($${convertAmount.toFixed(2)})`,
      text: `Hello,\n\nYou converted $${convertAmount.toFixed(2)} from your Publisher Balance to your Advertiser Balance.\n\nNew Publisher Balance: $${dbUser.balance.toFixed(2)}\nNew Advertiser Balance: $${dbUser.advertiserBalance.toFixed(2)}`,
      html: `<div style="font-family: system-ui, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0;">🔄 Balance Converted to Advertiser Account</h2>
        <p>You converted funds to run advertising campaigns on <strong>${db.settings?.siteName || "TG Links"}</strong>:</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Amount Converted:</strong> $${convertAmount.toFixed(2)}</p>
          <p style="margin: 4px 0;"><strong>Updated Publisher Balance:</strong> $${dbUser.balance.toFixed(2)}</p>
          <p style="margin: 4px 0;"><strong>Updated Advertiser Balance:</strong> $${dbUser.advertiserBalance.toFixed(2)}</p>
        </div>
      </div>`
    }).catch((e: any) => console.error("[SMTP Error] Balance convert email:", e));

    const { password: _, ...safeUser } = dbUser;
    res.json({
      success: true,
      message: `Successfully converted $${convertAmount.toFixed(2)} to Advertiser Balance!`,
      user: safeUser,
      balance: dbUser.balance,
      advertiserBalance: dbUser.advertiserBalance
    });
  });

  // Create new campaign
  app.post("/api/advertiser/campaigns", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { title, type, targetUrl, bannerImageUrl, adCode, targetViews } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Campaign title is required" });
    }

    const validTypes = [
      "offerwall",
      "sponsored_popup",
      "banner_728x90",
      "banner_468x60",
      "banner_300x250",
      "banner_320x50",
      "banner_300x600",
      "banner_left",
      "banner_right"
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid ad campaign type selected" });
    }

    const viewsNum = Number(targetViews);
    if (isNaN(viewsNum) || viewsNum < 100) {
      return res.status(400).json({ error: "Minimum target views for a campaign is 100 views" });
    }

    const db = loadDb();
    const s = db.settings || {};

    // Get CPM rate for type
    let cpm = 2.0;
    if (type === "offerwall") cpm = s.advCpmOfferWall ?? 3.0;
    else if (type === "sponsored_popup") cpm = s.advCpmSponsoredPopup ?? 4.0;
    else if (type === "banner_728x90") cpm = s.advCpmBanner728x90 ?? 1.5;
    else if (type === "banner_468x60") cpm = s.advCpmBanner468x60 ?? 1.2;
    else if (type === "banner_300x250") cpm = s.advCpmBanner300x250 ?? 2.0;
    else if (type === "banner_320x50") cpm = s.advCpmBanner320x50 ?? 1.0;
    else if (type === "banner_300x600") cpm = s.advCpmBanner300x600 ?? 2.5;
    else if (type === "banner_left") cpm = s.advCpmBannerLeft ?? 1.5;
    else if (type === "banner_right") cpm = s.advCpmBannerRight ?? 1.5;

    const totalBudget = Number(((viewsNum / 1000) * cpm).toFixed(4));

    if (totalBudget < 0.20) {
      return res.status(400).json({
        error: `Minimum ad campaign budget is $0.20. Your calculated campaign cost is $${totalBudget.toFixed(2)}. Please increase your target views.`
      });
    }

    const dbUser = db.users.find((u: any) => u.id === user.id);
    if (!dbUser) return res.status(404).json({ error: "User not found" });

    if ((dbUser.advertiserBalance || 0) < totalBudget) {
      return res.status(400).json({
        error: `Insufficient Advertiser Balance. Total campaign cost is $${totalBudget.toFixed(2)} (${viewsNum} views @ $${cpm.toFixed(2)} CPM). You have $${(dbUser.advertiserBalance || 0).toFixed(2)}.`
      });
    }

    // Deduct advertiser balance
    dbUser.advertiserBalance = Number(((dbUser.advertiserBalance || 0) - totalBudget).toFixed(6));

    const newCampaign = {
      id: "adv-" + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      userEmail: user.email,
      title: title.trim(),
      type,
      targetUrl: targetUrl ? targetUrl.trim() : "",
      bannerImageUrl: bannerImageUrl ? bannerImageUrl.trim() : "",
      adCode: adCode ? adCode.trim() : "",
      cpm,
      totalBudget,
      targetViews: viewsNum,
      spent: 0.0,
      impressions: 0,
      viewsDelivered: 0,
      clicks: 0,
      status: "active",
      createdAt: new Date().toISOString()
    };

    if (!db.advertiserCampaigns) db.advertiserCampaigns = [];
    db.advertiserCampaigns.push(newCampaign);

    saveDb(db);

    // Send email notification for campaign creation
    sendSmtpEmail({
      to: dbUser.email,
      subject: `[${db.settings?.siteName || "TG Links"}] Ad Campaign Created (${title.trim()})`,
      text: `Hello,\n\nYour ad campaign '${title.trim()}' (${type}) has been created!\n\nTarget Views: ${viewsNum}\nTotal Budget: $${totalBudget.toFixed(2)}\nCPM Rate: $${cpm.toFixed(2)}`,
      html: `<div style="font-family: system-ui, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #16a34a; margin-top: 0;">📣 Ad Campaign Live!</h2>
        <p>Your new advertising campaign has been launched on <strong>${db.settings?.siteName || "TG Links"}</strong>:</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Campaign Title:</strong> ${title.trim()}</p>
          <p style="margin: 4px 0;"><strong>Ad Type:</strong> ${type}</p>
          <p style="margin: 4px 0;"><strong>Target Views:</strong> ${viewsNum}</p>
          <p style="margin: 4px 0;"><strong>Total Budget:</strong> $${totalBudget.toFixed(2)}</p>
        </div>
      </div>`
    }).catch((e: any) => console.error("[SMTP Error] Campaign creation email:", e));

    const { password: _, ...safeUser } = dbUser;
    res.json({
      success: true,
      campaign: newCampaign,
      advertiserBalance: dbUser.advertiserBalance,
      user: safeUser
    });
  });

  // Toggle status (active / paused)
  app.post("/api/advertiser/campaigns/:id/status", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const { status } = req.body;

    const db = loadDb();
    const campaign = (db.advertiserCampaigns || []).find((c: any) => c.id === id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    if (campaign.userId !== user.id && user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (status === "active" || status === "paused") {
      campaign.status = status;
      saveDb(db);
    }

    res.json({ success: true, campaign });
  });

  // Delete campaign and refund unspent budget to advertiser balance
  app.delete("/api/advertiser/campaigns/:id", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const db = loadDb();

    if (!db.advertiserCampaigns) db.advertiserCampaigns = [];
    const idx = db.advertiserCampaigns.findIndex((c: any) => c.id === id);
    if (idx === -1) return res.status(404).json({ error: "Campaign not found" });

    const campaign = db.advertiserCampaigns[idx];
    if (campaign.userId !== user.id && user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Refund unspent budget if any
    const unspent = Math.max(0, Number(campaign.totalBudget || 0) - Number(campaign.spent || 0));
    if (unspent > 0) {
      const owner = db.users.find((u: any) => u.id === campaign.userId);
      if (owner) {
        owner.advertiserBalance = Number(((owner.advertiserBalance || 0) + unspent).toFixed(6));
      }
    }

    db.advertiserCampaigns.splice(idx, 1);
    saveDb(db);

    const updatedUser = db.users.find((u: any) => u.id === user.id);
    res.json({ success: true, advertiserBalance: updatedUser?.advertiserBalance || 0 });
  });

  // Record impression / view for advertiser campaign
  app.post("/api/advertiser/impression", (req, res) => {
    const { campaignId } = req.body;
    if (!campaignId) return res.status(400).json({ error: "campaignId is required" });

    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    if (typeof ip === "string" && ip.includes(",")) {
      ip = ip.split(",")[0].trim();
    }

    const db = loadDb();
    if (!db.advertiserCampaigns) db.advertiserCampaigns = [];
    if (!db.advertiserImpressionsLog) db.advertiserImpressionsLog = [];

    const campaign = db.advertiserCampaigns.find((c: any) => c.id === campaignId);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    if (campaign.status !== "active") {
      return res.json({ success: false, reason: "Campaign is not active" });
    }

    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const alreadyViewedIn24h = db.advertiserImpressionsLog.some((log: any) => {
      let logIp = log.ip;
      if (typeof logIp === "string" && logIp.includes(",")) {
        logIp = logIp.split(",")[0].trim();
      }
      const logTime = new Date(log.timestamp).getTime();
      return log.campaignId === campaignId && logIp === ip && logTime > twentyFourHoursAgo;
    });

    if (alreadyViewedIn24h) {
      return res.json({
        success: false,
        reason: "Ad view already recorded for this IP within 24 hours",
        impressions: campaign.impressions || 0,
        viewsDelivered: campaign.viewsDelivered || 0,
        spent: campaign.spent || 0,
        status: campaign.status
      });
    }

    const currentSpent = Number(campaign.spent || 0);
    const totalBudget = Number(campaign.totalBudget || 0);
    if (currentSpent >= totalBudget) {
      campaign.status = "completed";
      saveDb(db);
      return res.json({ success: false, reason: "Campaign budget exhausted" });
    }

    // Log the impression with IP and timestamp
    db.advertiserImpressionsLog.push({
      campaignId,
      ip,
      timestamp: new Date().toISOString()
    });

    // Increment impressions & viewsDelivered
    campaign.impressions = (campaign.impressions || 0) + 1;
    campaign.viewsDelivered = (campaign.viewsDelivered || 0) + 1;

    // Calculate cost per view
    const targetViews = Number(campaign.targetViews || 1000);
    const cpm = Number(campaign.cpm || 2.0);
    const costPerView = totalBudget > 0 && targetViews > 0 ? (totalBudget / targetViews) : (cpm / 1000);

    const newSpent = Number((currentSpent + costPerView).toFixed(6));
    campaign.spent = newSpent;

    if (newSpent >= totalBudget || campaign.viewsDelivered >= targetViews) {
      campaign.status = "completed";
    }

    saveDb(db);
    res.json({
      success: true,
      impressions: campaign.impressions,
      viewsDelivered: campaign.viewsDelivered,
      spent: campaign.spent,
      status: campaign.status
    });
  });

  // --- DEPOSIT & PAYMENT GATEWAY ENDPOINTS ---
  app.get("/api/deposits/settings", (req, res) => {
    const db = loadDb();
    const s = db.settings || {};
    res.json({
      enableFaucetPayDeposit: s.enableFaucetPayDeposit !== false,
      faucetPayMerchant: s.faucetPayMerchant || "",
      enableOxaPayDeposit: s.enableOxaPayDeposit !== false,
      enableUpiDeposit: s.enableUpiDeposit !== false,
      upiId: s.upiId || "pay@upi",
      upiQrUrl: s.upiQrUrl || "",
      upiAccountHolderName: s.upiAccountHolderName || "TG Links Ads"
    });
  });

  app.get("/api/deposits/my", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const db = loadDb();
    const myDeposits = (db.depositRequests || [])
      .filter((d: any) => d.userId === user.id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ deposits: myDeposits });
  });

  // Manual UPI deposit request
  app.get("/api/deposits/my", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const db = loadDb();
    const userDeposits = (db.depositRequests || [])
      .filter((d: any) => d.userId === user.id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ deposits: userDeposits });
  });

  app.post("/api/deposits/upi", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { amount, screenshotUrl, txnId } = req.body;
    const depAmount = Number(amount);

    if (isNaN(depAmount) || depAmount < 0.1) {
      return res.status(400).json({ error: "Minimum deposit amount is $0.10" });
    }

    if (!screenshotUrl || !String(screenshotUrl).trim()) {
      return res.status(400).json({ error: "Payment screenshot URL / image proof is mandatory" });
    }

    const db = loadDb();
    if (db.settings?.enableUpiDeposit === false) {
      return res.status(400).json({ error: "Manual UPI deposits are currently disabled" });
    }

    const newDep = {
      id: "dep-" + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      userEmail: user.email,
      amount: depAmount,
      method: "upi",
      status: "pending",
      createdAt: new Date().toISOString(),
      screenshotUrl: String(screenshotUrl).trim(),
      txnId: txnId ? String(txnId).trim() : ""
    };

    if (!db.depositRequests) db.depositRequests = [];
    db.depositRequests.push(newDep);
    saveDb(db);

    // Notify Admin
    const adminEmail = db.settings?.backupReceiverEmail || db.settings?.smtpUser || ADMIN_EMAILS[0];
    sendSmtpEmail({
      to: adminEmail,
      subject: `[${db.settings?.siteName || "TG Links"} Admin] New Manual UPI Deposit ($${depAmount.toFixed(2)})`,
      text: `New manual UPI deposit submitted:\nUser: ${user.email}\nAmount: $${depAmount.toFixed(2)}\nTxn ID: ${newDep.txnId || 'N/A'}\nScreenshot: ${newDep.screenshotUrl}`,
      html: `<div style="font-family: system-ui, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h3 style="color: #4f46e5; margin-top: 0;">💳 New Manual UPI Deposit Request</h3>
        <p><strong>User:</strong> ${user.email}</p>
        <p><strong>Amount:</strong> $${depAmount.toFixed(2)}</p>
        <p><strong>Transaction / UTR ID:</strong> ${newDep.txnId || 'None provided'}</p>
        <p><strong>Screenshot:</strong> <a href="${newDep.screenshotUrl}" target="_blank">View Payment Screenshot</a></p>
      </div>`
    }).catch(e => console.error("Admin deposit email err:", e));

    res.json({ success: true, message: "UPI deposit submitted successfully for admin verification!", deposit: newDep });
  });

  // FaucetPay deposit request
  app.post("/api/deposits/faucetpay", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { amount } = req.body;
    const depAmount = Number(amount);

    if (isNaN(depAmount) || depAmount < 0.1) {
      return res.status(400).json({ error: "Minimum deposit amount is $0.10" });
    }

    const db = loadDb();
    const merchant = db.settings?.faucetPayMerchant;
    if (!merchant) {
      return res.status(400).json({ error: "FaucetPay merchant is not configured by Administrator in Admin Panel" });
    }

    const protocol = getRequestProtocol(req);
    const host = getRequestHost(req);

    const newDep = {
      id: "dep-fp-" + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      userEmail: user.email,
      amount: depAmount,
      method: "faucetpay",
      status: "pending",
      createdAt: new Date().toISOString()
    };

    if (!db.depositRequests) db.depositRequests = [];
    db.depositRequests.push(newDep);
    saveDb(db);

    const callbackUrl = `${protocol}://${host}/api/deposits/faucetpay/callback`;
    const successUrl = `${protocol}://${host}/dashboard?tab=advertiser&deposit=success`;
    const cancelUrl = `${protocol}://${host}/dashboard?tab=advertiser&deposit=cancel`;

    res.json({
      success: true,
      checkoutUrl: "https://faucetpay.io/merchant/webpay",
      params: {
        merchant_username: merchant,
        item_name: `Deposit to ${db.settings?.siteName || 'TG Links'} Advertiser Balance`,
        amount1: depAmount,
        currency1: "USD",
        custom: newDep.id,
        callback_url: callbackUrl,
        success_url: successUrl,
        cancel_url: cancelUrl
      }
    });
  });

  app.all("/api/deposits/faucetpay/callback", (req, res) => {
    const custom = req.body?.custom || req.query?.custom;
    const amount1 = req.body?.amount1 || req.query?.amount1;
    const token = req.body?.token || req.query?.token;

    const db = loadDb();
    const dep = (db.depositRequests || []).find((d: any) => d.id === custom);
    if (dep && dep.status === "pending") {
      dep.status = "approved";
      dep.gatewayTxnId = String(token || "");

      const dbUser = db.users.find((u: any) => u.id === dep.userId);
      if (dbUser) {
        dbUser.advertiserBalance = Number(((dbUser.advertiserBalance || 0) + dep.amount).toFixed(6));
      }
      saveDb(db);
    }
    res.send("OK");
  });

  // OxaPay deposit request
  app.post("/api/deposits/oxapay", async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { amount } = req.body;
    const depAmount = Number(amount);

    if (isNaN(depAmount) || depAmount < 0.1) {
      return res.status(400).json({ error: "Minimum deposit amount is $0.10" });
    }

    const db = loadDb();
    const apiKey = db.settings?.oxaPayMerchantKey || db.settings?.oxaPayApiKey;
    if (!apiKey) {
      return res.status(400).json({ error: "OxaPay Merchant API Key is not configured by Administrator in Admin Panel" });
    }

    const protocol = getRequestProtocol(req);
    const host = getRequestHost(req);

    const newDep = {
      id: "dep-oxa-" + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      userEmail: user.email,
      amount: depAmount,
      method: "oxapay",
      status: "pending",
      createdAt: new Date().toISOString()
    };

    if (!db.depositRequests) db.depositRequests = [];
    db.depositRequests.push(newDep);
    saveDb(db);

    try {
      const fetchFn = typeof globalThis.fetch === "function" ? globalThis.fetch : (await import("node-fetch")).default;
      const response = await fetchFn("https://api.oxapay.com/merchants/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant: apiKey,
          amount: depAmount,
          currency: "USD",
          orderId: newDep.id,
          callbackUrl: `${protocol}://${host}/api/deposits/oxapay/callback`,
          returnUrl: `${protocol}://${host}/dashboard?tab=advertiser&deposit=success`,
          description: `Deposit to ${db.settings?.siteName || 'TG Links'} Advertiser Balance`
        })
      });

      const data: any = await response.json();
      if (data.result === 100 && data.payLink) {
        return res.json({ success: true, payLink: data.payLink });
      } else {
        return res.status(400).json({ error: data.message || "Failed to generate OxaPay invoice" });
      }
    } catch (err: any) {
      return res.status(500).json({ error: "OxaPay API error: " + err.message });
    }
  });

  app.all("/api/deposits/oxapay/callback", (req, res) => {
    const { orderId, status, trackId } = req.body || req.query;

    if (status === "Paid" || status === "100" || status === 100) {
      const db = loadDb();
      const dep = (db.depositRequests || []).find((d: any) => d.id === orderId);
      if (dep && dep.status === "pending") {
        dep.status = "approved";
        dep.gatewayTxnId = String(trackId || "");

        const dbUser = db.users.find((u: any) => u.id === dep.userId);
        if (dbUser) {
          dbUser.advertiserBalance = Number(((dbUser.advertiserBalance || 0) + dep.amount).toFixed(6));
        }
        saveDb(db);
      }
    }
    res.json({ result: 100 });
  });

  // Admin deposits list and approval endpoint
  app.get("/api/admin/deposits", (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    const db = loadDb();
    const sortedDeps = (db.depositRequests || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ deposits: sortedDeps });
  });

  app.post("/api/admin/deposits/:id/status", (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status parameter" });
    }

    const db = loadDb();
    const dep = (db.depositRequests || []).find((d: any) => d.id === id);
    if (!dep) return res.status(404).json({ error: "Deposit request not found" });

    if (dep.method !== "upi") {
      return res.status(400).json({ error: "FaucetPay and OxaPay deposits are automatically processed by payment gateways and cannot be manually modified." });
    }

    if (dep.status === "pending" && status === "approved") {
      dep.status = "approved";
      dep.adminNote = adminNote || "";

      const dbUser = db.users.find((u: any) => u.id === dep.userId);
      if (dbUser) {
        dbUser.advertiserBalance = Number(((dbUser.advertiserBalance || 0) + dep.amount).toFixed(6));
      }

      sendSmtpEmail({
        to: dep.userEmail,
        subject: `[${db.settings?.siteName || "TG Links"}] Deposit Request Approved! ($${dep.amount.toFixed(2)})`,
        text: `Your deposit of $${dep.amount.toFixed(2)} (${dep.method.toUpperCase()}) has been approved and credited to your Advertiser Balance!`,
        html: `<div style="font-family: system-ui, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #16a34a; margin-top: 0;">✅ Deposit Approved!</h2>
          <p>Your deposit of <strong>$${dep.amount.toFixed(2)}</strong> via <strong>${dep.method.toUpperCase()}</strong> has been verified and approved.</p>
          <p>Your advertiser balance is now credited with <strong>+$${dep.amount.toFixed(2)}</strong> and ready to create ad campaigns!</p>
        </div>`
      }).catch(e => console.error("Deposit approval email err:", e));
    } else if (dep.status === "pending" && status === "rejected") {
      dep.status = "rejected";
      dep.adminNote = adminNote || "";

      sendSmtpEmail({
        to: dep.userEmail,
        subject: `[${db.settings?.siteName || "TG Links"}] Deposit Request Update`,
        text: `Your deposit request of $${dep.amount.toFixed(2)} (${dep.method.toUpperCase()}) was rejected. Note: ${adminNote || "Verification failed."}`,
        html: `<div style="font-family: system-ui, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #dc2626; margin-top: 0;">❌ Deposit Request Rejected</h2>
          <p>Your deposit request of <strong>$${dep.amount.toFixed(2)}</strong> via <strong>${dep.method.toUpperCase()}</strong> was rejected.</p>
          <p><strong>Admin Note:</strong> ${adminNote || "Verification failed. Please contact support if you need assistance."}</p>
        </div>`
      }).catch(e => console.error("Deposit rejection email err:", e));
    }

    saveDb(db);
    res.json({ success: true, deposit: dep });
  });

  // Guard middleware for Admin
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = getAuthUser(req);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin privilege required" });
    }
    next();
  };

  // Admin endpoints for Advertiser management
  app.get("/api/admin/advertiser-campaigns", requireAdmin, (req, res) => {
    const db = loadDb();
    res.json({ campaigns: db.advertiserCampaigns || [] });
  });

  app.post("/api/admin/users/:id/advertiser-balance", requireAdmin, (req, res) => {
    const { id } = req.params;
    const { advertiserBalance } = req.body;

    const db = loadDb();
    const user = db.users.find((u: any) => u.id === id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.advertiserBalance = Number(cleanNumber(advertiserBalance, 0).toFixed(6));
    saveDb(db);

    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  });

  // --- SYSTEM SETTINGS ---
  
  app.get("/api/settings", (req, res) => {
    const db = loadDb();
    // Return only public non-sensitive settings to client
    const { siteName, siteTitle, siteDescription, globalCpm, minWithdrawal, withdrawalMethods, faviconUrl, logoUrl, enableOwnAds } = db.settings;
    res.json({ siteName, siteTitle, siteDescription, globalCpm, minWithdrawal, withdrawalMethods, faviconUrl, logoUrl, enableOwnAds });
  });

  app.get("/api/public/stats", (req, res) => {
    const db = loadDb();
    const totalUsers = db.users.length;
    const totalLinks = (db.links ? db.links.length : 0) + (db.deletedLinksCount || 0);
    const totalClicks = db.clicksLog.length;
    res.json({
      totalUsers,
      totalLinks,
      totalClicks,
      globalCpm: db.settings.globalCpm || 5.0
    });
  });

  // --- SEO ROUTES (robots.txt & sitemap.xml) ---
  app.get("/robots.txt", (req, res) => {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "tglinks.eu.cc";
    const baseUrl = `${protocol}://${host}`;

    res.type("text/plain");
    res.send(
`User-agent: *
Allow: /
Allow: /rates
Allow: /auth
Allow: /login
Allow: /register
Allow: /privacy
Allow: /terms
Allow: /dmca
Disallow: /admin
Disallow: /dashboard
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml`
    );
  });

  app.get("/sitemap.xml", (req, res) => {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "tglinks.eu.cc";
    const baseUrl = `${protocol}://${host}`;
    const today = new Date().toISOString().split("T")[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/rates</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/auth</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/login</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/register</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/dmca</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

    res.type("application/xml");
    res.send(xml);
  });

  // --- LINKS ENDPOINTS ---
  
  app.post("/api/links/shorten", async (req, res) => {
    const { originalUrl, userId, customAlias, expiresAt } = req.body;
    if (!originalUrl) return res.status(400).json({ error: "Original URL is required" });

    const db = loadDb();
    const user = db.users.find((u: any) => u.id === userId);
    
    // Generate or validate short code
    let code = "";
    if (customAlias && customAlias.trim() !== "") {
      const trimmedAlias = customAlias.trim();
      // Format validation: alphanumeric plus dashes, underscores, and dots
      const aliasRegex = /^[a-zA-Z0-9_\-\.]+$/;
      if (!aliasRegex.test(trimmedAlias)) {
        return res.status(400).json({ error: "Custom alias can only contain letters, numbers, hyphens (-), underscores (_), and dots (.)" });
      }
      if (trimmedAlias.length < 3 || trimmedAlias.length > 50) {
        return res.status(400).json({ error: "Custom alias must be between 3 and 50 characters." });
      }
      
      // Prevent reserved namespace hijacking
      const reserved = ["admin", "login", "register", "dashboard", "go", "go-final", "api", "links", "withdrawals", "settings", "external", "profile"];
      if (reserved.includes(trimmedAlias.toLowerCase())) {
        return res.status(400).json({ error: "This custom alias is reserved and cannot be used." });
      }

      // Check unique constraint across all links
      const alreadyExists = db.links.some((l: any) => l.code.toLowerCase() === trimmedAlias.toLowerCase());
      if (alreadyExists) {
        return res.status(400).json({ error: "This custom alias is already taken by another shortened link." });
      }
      code = trimmedAlias;
    } else {
      // Generate unique random short code
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let isUnique = false;
      while (!isUnique) {
        code = "";
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        isUnique = !db.links.some((l: any) => l.code === code);
      }
    }

    // Determine CPM: User's custom CPM or system global CPM
    const linkCpm = getCpmFromRequest(req, user, db.settings);

    // Direct delegation to external AdLinkFly API check
    let adFlyShortenerId = undefined;
    let adFlyShortenedUrl = undefined;

    const protocol = getRequestProtocol(req);
    const host = getRequestHost(req);
    const intermediateUrl = `${protocol}://${host}/go-final/${code}`;

    const isFaucetMode = !!user?.enableFaucetMode;
    const external = await getExternalShortenedUrl(intermediateUrl, db, user, isFaucetMode);
    if (external) {
      adFlyShortenerId = external.id;
      adFlyShortenedUrl = external.url;
    }

    const nowIso = new Date().toISOString();
    const newLink: Link = {
      id: "l-" + Math.random().toString(36).substring(2, 9),
      code,
      originalUrl,
      userId: userId || "guest",
      userEmail: user ? user.email : "guest",
      cpm: linkCpm,
      clicks: 0,
      earnings: 0.0,
      createdAt: nowIso,
      lastViewedAt: nowIso,
      isApiGenerated: false,
      status: "active",
      adFlyShortenerId,
      adFlyShortenedUrl,
      expiresAt: expiresAt || undefined
    };

    db.links.push(newLink);
    saveDb(db);

    res.json({ link: newLink });
  });

  app.get("/api/links/user/:userId", (req, res) => {
    const { userId } = req.params;
    const db = loadDb();
    const userLinks = db.links
      .filter((l: any) => l.userId === userId)
      .map((l: any) => ({
        ...l,
        cpm: getCurrentCpmForLink(l, db)
      }));
    res.json({ links: userLinks });
  });

  app.delete("/api/links/:id", (req, res) => {
    const { id } = req.params;
    const db = loadDb();
    
    // Simple permission check: must be owner or admin
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Unauthorized" });

    const linkIdx = db.links.findIndex((l: any) => l.id === id);
    if (linkIdx === -1) return res.status(404).json({ error: "Link not found" });

    const link = db.links[linkIdx];
    if (link.userId !== authUser.id && authUser.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    db.deletedLinksCount = (db.deletedLinksCount || 0) + 1;
    db.links.splice(linkIdx, 1);
    saveDb(db);
    res.json({ success: true });
  });

  // --- REDIRECTION & CLICKS PORTAL ---
  
  app.get("/api/links/resolve/:code", (req, res) => {
    const { code } = req.params;
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    if (typeof ip === "string" && ip.includes(",")) {
      ip = ip.split(",")[0].trim();
    }
    const db = loadDb();
    const link = db.links.find((l: any) => l.code === code && l.status === "active");

    if (!link) {
      return res.status(404).json({ error: "Shortened link not found or suspended" });
    }

    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: "This shortened link has expired and is no longer available." });
    }

    // Refresh lastViewedAt timestamp whenever link is resolved
    link.lastViewedAt = new Date().toISOString();
    saveDb(db);

    const linkOwner = db.users.find((u: any) => u.id === link.userId);
    const isFaucetMode = !!(linkOwner?.enableFaucetMode || link.isFaucetApi || db.settings.enableFaucetMode);

    // Include ad configs in resolution (allow user to complete own shortener pages first)
    res.json({ 
      link: {
        code: link.code,
        originalUrl: link.originalUrl,
        adFlyShortenedUrl: link.adFlyShortenedUrl,
        adFlyShortenerId: link.adFlyShortenerId,
        cpm: getCurrentCpmForLink(link, db),
        userId: link.userId,
        isFaucetMode: isFaucetMode
      },
      faucetLimitReached: false,
      settings: {
        siteName: db.settings.siteName,
        enableOwnAds: db.settings.enableOwnAds,
        adPagesCount: db.settings.adPagesCount,
        bannerAd728x90: db.settings.bannerAd728x90,
        bannerAd300x250: db.settings.bannerAd300x250,
        bannerAd320x50: db.settings.bannerAd320x50,
        popunderCode: db.settings.popunderCode,
        globalHeaderCode: db.settings.globalHeaderCode,
        enableNeonAdGate: db.settings.enableNeonAdGate,
        neonTodayAdCode: db.settings.neonTodayAdCode,
        enableOfferWall: db.settings.enableOfferWall,
        offerWallSeconds: db.settings.offerWallSeconds,
        offerWallCount: db.settings.offerWallCount,
        offerWallUrl1: db.settings.offerWallUrl1,
        offerWallUrl2: db.settings.offerWallUrl2,
        offerWallUrl3: db.settings.offerWallUrl3,
        offerWallUrl4: db.settings.offerWallUrl4,
        enableThunderRedirect: db.settings.enableThunderRedirect,
        adTopLeftCode: db.settings.adTopLeftCode,
        adTopCenterCode: db.settings.adTopCenterCode,
        adTopRightCode: db.settings.adTopRightCode,
        adLeftCode: db.settings.adLeftCode,
        adBottomCenterCode: db.settings.adBottomCenterCode,
        adRightCode: db.settings.adRightCode,
        enableSponsoredAd1: db.settings.enableSponsoredAd1 ?? true,
        sponsoredAd1Url: db.settings.sponsoredAd1Url || "https://www.rotate4all.com/promote/pt13azaa9mf1",
        sponsoredAd1Timer: db.settings.sponsoredAd1Timer ?? 12,
        enableSponsoredAd2: db.settings.enableSponsoredAd2 ?? true,
        sponsoredAd2Url: db.settings.sponsoredAd2Url || "https://www.rotate4all.com/promote/pt13azaa9mf1",
        sponsoredAd2Timer: db.settings.sponsoredAd2Timer ?? 12,
        activeAdvertiserAds: getActiveAdvertiserAds(db, typeof ip === "string" ? ip : Array.isArray(ip) ? ip[0] : String(ip))
      }
    });
  });

  app.post("/api/links/click", async (req, res) => {
    const { code } = req.body;
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    if (typeof ip === "string" && ip.includes(",")) {
      ip = ip.split(",")[0].trim();
    }
    const db = loadDb();

    const link = db.links.find((l: any) => l.code === code);
    if (!link) return res.status(404).json({ error: "Link not found" });

    // Refresh lastViewedAt timestamp on click
    link.lastViewedAt = new Date().toISOString();

    if (link.status === "suspended") {
      return res.status(403).json({ error: "Link has been suspended" });
    }

    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: "This shortened link has expired and is no longer active." });
    }

    const linkOwner = db.users.find((u: any) => u.id === link.userId);
    const isFaucetMode = !!(linkOwner?.enableFaucetMode || link.isFaucetApi || db.settings.enableFaucetMode);

    const todayIST = getISTDateString();
    const hasCompletedToday = db.clicksLog.some(
      (c: any) => {
        let loggedIp = c.ip;
        if (typeof loggedIp === "string" && loggedIp.includes(",")) {
          loggedIp = loggedIp.split(",")[0].trim();
        }
        return loggedIp === ip && getISTDateString(c.timestamp) === todayIST;
      }
    );

    if (isFaucetMode && hasCompletedToday) {
      return res.status(429).json({ 
        error: "Faucet Mode Daily Limit Reached: Your IP address has already completed a shortener link today.",
        faucetLimitReached: true 
      });
    }

    const user = link.userId !== "guest" ? db.users.find((u: any) => u.id === link.userId) : null;
    const protocol = getRequestProtocol(req);
    const host = getRequestHost(req);
    const vtok = createVerificationToken(link.code, String(ip));
    const finalLandingUrl = `${protocol}://${host}/go-final/${link.code}?vtok=${vtok}`;

    // Dynamically retrieve or re-evaluate the external shortened URL
    let adFlyShortenedUrl = link.adFlyShortenedUrl;
    
    // Check if cached shortener matches the link's current faucet mode and is still enabled
    let needRegenerate = !adFlyShortenedUrl;
    if (adFlyShortenedUrl && link.adFlyShortenerId) {
      const existingShortener = (db.adFlyShorteners || []).find((s: any) => s.id === link.adFlyShortenerId);
      if (existingShortener) {
        const isFaucetShortener = !!existingShortener.isFaucetApi;
        if (isFaucetShortener !== isFaucetMode || !existingShortener.enabled) {
          needRegenerate = true;
        }
      } else {
        needRegenerate = true;
      }
    }

    if (needRegenerate) {
      const external = await getExternalShortenedUrl(finalLandingUrl, db, user, isFaucetMode);
      if (external) {
        adFlyShortenedUrl = external.url;
        link.adFlyShortenedUrl = external.url;
        link.adFlyShortenerId = external.id;
      } else {
        adFlyShortenedUrl = undefined;
        link.adFlyShortenedUrl = undefined;
        link.adFlyShortenerId = undefined;
      }
    }

    saveDb(db);

    const targetUrl = adFlyShortenedUrl || finalLandingUrl;

    res.json({ 
      success: true, 
      targetUrl: targetUrl,
      originalUrl: link.originalUrl,
      adFlyShortenedUrl: adFlyShortenedUrl
    });
  });

  // --- GATEWAY AND REFERRER REDIRECTIONS ---
  
  // Redirect visitors from the main domain (tglinks.eu.cc) to the own page domain (url.thunder-appz.eu.org)
  app.get("/go/:code", (req, res, next) => {
    const hostHeader = req.get("host") || "";
    const isProd = !hostHeader.includes("localhost") && !hostHeader.includes("127.0.0.1") && !hostHeader.includes("ais-dev") && !hostHeader.includes("ais-pre");
    
    if (isProd && !hostHeader.includes("url.thunder-appz.eu.org")) {
      const { code } = req.params;
      return res.redirect(`https://url.thunder-appz.eu.org/go/${code}`);
    }
    
    next();
  });

  // Referrer cloak redirector - forces referrer to be exactly thunder-appz.eu.org
  app.get("/r", (req, res) => {
    const to = req.query.to;
    if (!to || typeof to !== "string") {
      return res.redirect("/");
    }

    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="unsafe-url">
  <title>Redirecting...</title>
  <script>
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const toUrl = urlParams.get('to');
      if (toUrl) {
        window.location.replace(toUrl);
      } else {
        window.location.replace('/');
      }
    } catch (e) {
      window.location.replace('/');
    }
  </script>
</head>
<body>
  <p style="font-family: sans-serif; text-align: center; margin-top: 100px; color: #666;">Redirecting...</p>
</body>
</html>`);
  });

  // --- EXTERNAL SHORTENER CALLBACK AND LANDING ENDPOINT ---
  app.get("/go-final/:code", async (req, res) => {
    const { code } = req.params;
    const vtok = req.query.vtok as string;
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    if (typeof ip === "string" && ip.includes(",")) {
      ip = ip.split(",")[0].trim();
    }
    const db = loadDb();

    const link = db.links.find((l: any) => l.code === code);
    if (!link) {
      return res.status(404).send("Destination link not found");
    }

    if (link.status === "suspended") {
      return res.status(403).send("This link has been suspended");
    }

    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      return res.status(410).send("This shortened link has expired and is no longer active.");
    }

    let targetUrl = link.originalUrl;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    // Record view and process earnings for all visits reaching /go-final
    if (vtok) {
      verifyAndConsumeToken(vtok, code);
    }

    const linkOwner = db.users.find((u: any) => u.id === link.userId);
    const isFaucetMode = !!(linkOwner?.enableFaucetMode || link.isFaucetApi || db.settings.enableFaucetMode);

    const todayIST = getISTDateString();
    const hasCompletedToday = db.clicksLog.some(
      (c: any) => {
        let loggedIp = c.ip;
        if (typeof loggedIp === "string" && loggedIp.includes(",")) {
          loggedIp = loggedIp.split(",")[0].trim();
        }
        return loggedIp === ip && getISTDateString(c.timestamp) === todayIST;
      }
    );

    if (isFaucetMode && hasCompletedToday) {
      return res.status(429).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>429 - Faucet Mode Daily Limit Reached</title>
          <style>
            body { background-color: #020617; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; text-align: center; }
            .card { background: #0f172a; border: 1px solid #1e293b; padding: 32px; border-radius: 16px; max-width: 440px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            h2 { color: #f59e0b; margin-top: 0; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
            .badge { background: #78350f33; border: 1px solid #b4530944; color: #fcd34d; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: bold; margin-top: 16px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Faucet Mode Daily Limit Reached</h2>
            <p>Your IP address has already completed a shortener link today.</p>
            <div class="badge">1 Completion Per IP / Daily Limit Enforced (Resets 00:00 IST)</div>
            <p style="margin-top: 16px; font-size: 12px; color: #64748b;">In Faucet Mode, access to additional shortener links is blocked until 00:00 IST to ensure valid advertiser view counting.</p>
          </div>
        </body>
        </html>
      `);
    }

    const hasPaidClickToday = db.clicksLog.some(
      (c: any) => {
        let loggedIp = c.ip;
        if (typeof loggedIp === "string" && loggedIp.includes(",")) {
          loggedIp = loggedIp.split(",")[0].trim();
        }
        return loggedIp === ip && getISTDateString(c.timestamp) === todayIST && c.earning > 0;
      }
    );

    const currentCpm = getCurrentCpmForLink(link, db);
    const earningAmount = hasPaidClickToday ? 0 : (currentCpm / 1000);

    const rawReferrer = (req.headers["referer"] || req.headers["referrer"] || req.query.ref || req.query.referrer || "Direct / Unknown") as string;

    // Save click log
    const clickId = "c-" + Math.random().toString(36).substring(2, 9);
    const click: ClickLog = {
      id: clickId,
      linkId: link.id,
      userId: link.userId,
      timestamp: new Date().toISOString(),
      ip: String(ip),
      earning: earningAmount,
      country: "Global",
      referrer: rawReferrer
    };
    db.clicksLog.push(click);

    // Update Link stats
    link.clicks += 1;
    link.earnings += earningAmount;

    // Update User Wallet balance & earnings
    if (link.userId !== "guest") {
      const user = db.users.find((u: any) => u.id === link.userId);
      if (user && !user.banned) {
        user.balance = Number((user.balance + earningAmount).toFixed(6));
        user.totalEarned = Number((user.totalEarned + earningAmount).toFixed(6));
      }
    }

    saveDb(db);

    // Re-verify URL has protocol
    targetUrl = link.originalUrl;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    res.setHeader("Referrer-Policy", "no-referrer");
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="referrer" content="no-referrer">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>View Completed - Redirecting...</title>
        <style>
          * { box-sizing: border-box; }
          body { background-color: #020617; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; text-align: center; }
          .card { background: #0f172a; border: 1px solid #1e293b; padding: 40px; border-radius: 24px; max-width: 480px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); }
          .icon-wrap { width: 72px; height: 72px; margin: 0 auto 20px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: bold; }
          h2 { color: #f8fafc; font-size: 22px; font-weight: 800; margin: 0 0 10px; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
          .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 15px 24px; background: #6366f1; color: white; border-radius: 14px; text-decoration: none; font-weight: bold; font-size: 15px; transition: all 0.2s; box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4); }
          .btn:hover { background-color: #4f46e5; transform: translateY(-1px); }
          .badge { display: inline-block; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); color: #a5b4fc; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
        </style>
        <script>
          let seconds = 2;
          function tick() {
            seconds--;
            if (seconds <= 0) {
              window.location.replace("${targetUrl.replace(/"/g, '&quot;').trim()}");
            } else {
              const el = document.getElementById('timer');
              if (el) el.innerText = seconds;
              setTimeout(tick, 1000);
            }
          }
          setTimeout(tick, 1000);
        </script>
      </head>
      <body>
        <div class="card">
          <div class="badge">1 View Successfully Completed</div>
          <div class="icon-wrap">✓</div>
          <h2>Shorteners Fully Completed!</h2>
          <p>Your visit has been verified and recorded. Redirecting to your destination in <span id="timer" style="color: #6366f1; font-weight: bold;">2</span> seconds...</p>
          <a href="${targetUrl.replace(/"/g, '&quot;')}" rel="noreferrer" class="btn">
            Continue to Destination →
          </a>
        </div>
      </body>
      </html>
    `);
  });

  // --- USER DASHBOARD STATS ---
  
  app.get("/api/dashboard/stats/:userId", (req, res) => {
    const { userId } = req.params;
    const db = loadDb();

    const userLinks = db.links.filter((l: any) => l.userId === userId);
    const userClicks = db.clicksLog.filter((c: any) => c.userId === userId);
    const user = db.users.find((u: any) => u.id === userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    const totalViews = userClicks.length;
    const totalEarnings = user.totalEarned;
    const avgCpm = totalViews > 0 ? Number(((totalEarnings / totalViews) * 1000).toFixed(2)) : db.settings.globalCpm;

    const now = new Date();
    const todayStr = getISTDateString(now);
    const currentMonthStr = getISTMonthString(now);

    // 1. Calculate today's stats
    let todayViews = 0;
    let todayEarnings = 0;
    // 2. Calculate current month's stats
    let monthViews = 0;
    let monthEarnings = 0;

    userClicks.forEach((c: any) => {
      const clickDate = getISTDateString(c.timestamp);
      const clickMonth = getISTMonthString(c.timestamp);

      if (clickDate === todayStr) {
        todayViews += 1;
        todayEarnings += c.earning;
      }
      if (clickMonth === currentMonthStr) {
        monthViews += 1;
        monthEarnings += c.earning;
      }
    });

    // 3. Generate daily reports for the last 30 days
    const dailyReportsMap = new Map<string, { views: number; earnings: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateString = getISTDateString(d);
      dailyReportsMap.set(dateString, { views: 0, earnings: 0 });
    }

    userClicks.forEach((c: any) => {
      const dateString = getISTDateString(c.timestamp);
      if (dailyReportsMap.has(dateString)) {
        const current = dailyReportsMap.get(dateString)!;
        dailyReportsMap.set(dateString, {
          views: current.views + 1,
          earnings: current.earnings + c.earning
        });
      } else {
        // If older but belongs to user, let's keep it dynamically
        dailyReportsMap.set(dateString, { views: 1, earnings: c.earning });
      }
    });

    const dailyReports = Array.from(dailyReportsMap.entries())
      .map(([date, data]) => {
        const cpm = data.views > 0 ? (data.earnings / data.views) * 1000 : 0;
        return {
          date,
          views: data.views,
          earnings: Number(data.earnings.toFixed(4)),
          cpm: Number(cpm.toFixed(2))
        };
      })
      .filter(item => item.views > 0 || (new Date(item.date).getTime() >= new Date(todayStr).getTime() - 29 * 24 * 60 * 60 * 1000))
      .sort((a, b) => b.date.localeCompare(a.date));

    // 4. Generate monthly reports for the last 12 months
    const monthlyReportsMap = new Map<string, { views: number; earnings: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthString = getISTMonthString(d);
      monthlyReportsMap.set(monthString, { views: 0, earnings: 0 });
    }

    userClicks.forEach((c: any) => {
      const monthString = getISTMonthString(c.timestamp);
      if (monthlyReportsMap.has(monthString)) {
        const current = monthlyReportsMap.get(monthString)!;
        monthlyReportsMap.set(monthString, {
          views: current.views + 1,
          earnings: current.earnings + c.earning
        });
      } else {
        monthlyReportsMap.set(monthString, { views: 1, earnings: c.earning });
      }
    });

    const monthlyReports = Array.from(monthlyReportsMap.entries())
      .map(([month, data]) => {
        const cpm = data.views > 0 ? (data.earnings / data.views) * 1000 : 0;
        return {
          month,
          views: data.views,
          earnings: Number(data.earnings.toFixed(4)),
          cpm: Number(cpm.toFixed(2))
        };
      })
      .filter(item => item.views > 0 || (new Date(item.month + "-02").getTime() >= new Date().getTime() - 365 * 24 * 60 * 60 * 1000))
      .sort((a, b) => b.month.localeCompare(a.month));

    // Keep the dailyStats array (last 15 days, ascending) for the chart
    const dailyStatsMap = new Map<string, { views: number; earnings: number }>();
    for (let i = 14; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateString = getISTDateString(d);
      dailyStatsMap.set(dateString, { views: 0, earnings: 0 });
    }

    userClicks.forEach((c: any) => {
      const dateString = getISTDateString(c.timestamp);
      if (dailyStatsMap.has(dateString)) {
        const current = dailyStatsMap.get(dateString)!;
        dailyStatsMap.set(dateString, {
          views: current.views + 1,
          earnings: Number((current.earnings + c.earning).toFixed(6))
        });
      }
    });

    const dailyStats = Array.from(dailyStatsMap.entries()).map(([date, data]) => ({
      date,
      views: data.views,
      earnings: Number(data.earnings.toFixed(4))
    }));

    res.json({
      totalViews,
      totalEarnings,
      todayViews,
      todayEarnings: Number(todayEarnings.toFixed(4)),
      monthViews,
      monthEarnings: Number(monthEarnings.toFixed(4)),
      balance: user.balance,
      averageCpm: avgCpm,
      dailyStats,
      dailyReports,
      monthlyReports
    });
  });

  // --- WITHDRAWALS ENDPOINTS ---
  
  app.get("/api/withdrawals/user/:userId", (req, res) => {
    const { userId } = req.params;
    const db = loadDb();
    const userWithdrawals = db.withdrawals.filter((w: any) => w.userId === userId);
    res.json({ withdrawals: userWithdrawals });
  });

  app.post("/api/withdrawals/request", (req, res) => {
    const { userId, amount, method, account } = req.body;
    if (!userId || !amount || !method || !account) {
      return res.status(400).json({ error: "All withdrawal request fields are required" });
    }

    const db = loadDb();
    const user = db.users.find((u: any) => u.id === userId && !u.banned);
    if (!user) return res.status(404).json({ error: "User not found or banned" });

    const reqAmount = Number(amount);
    if (isNaN(reqAmount) || reqAmount <= 0) {
      return res.status(400).json({ error: "Invalid withdrawal amount" });
    }

    if (reqAmount < db.settings.minWithdrawal) {
      return res.status(400).json({ 
        error: `Minimum withdrawal limit is $${db.settings.minWithdrawal.toFixed(2)}` 
      });
    }

    if (user.balance < reqAmount) {
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    // Deduct balance and create request
    user.balance = Number((user.balance - reqAmount).toFixed(6));

    const newWithdrawal: Withdrawal = {
      id: "w-" + Math.random().toString(36).substring(2, 9),
      userId,
      userEmail: user.email,
      amount: reqAmount,
      method,
      account,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    db.withdrawals.push(newWithdrawal);
    saveDb(db);

    // 1. Send confirmation email to user
    sendSmtpEmail({
      to: user.email,
      subject: `[${db.settings?.siteName || "TG Links"}] Withdrawal Request Received ($${reqAmount.toFixed(2)})`,
      text: `Hello,\n\nWe have received your withdrawal request:\n\nAmount: $${reqAmount.toFixed(2)}\nMethod: ${method}\nAccount: ${account}\nStatus: Pending Review\nDate: ${newWithdrawal.createdAt}\n\nOur team will review and process your payment shortly.`,
      html: `<div style="font-family: system-ui, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0;">💸 Withdrawal Request Received</h2>
        <p>Your withdrawal request has been logged and is under review:</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Amount:</strong> $${reqAmount.toFixed(2)}</p>
          <p style="margin: 4px 0;"><strong>Method:</strong> ${method}</p>
          <p style="margin: 4px 0;"><strong>Payout Account:</strong> ${account}</p>
          <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #d97706; font-weight: bold;">Pending Review</span></p>
        </div>
        <p style="font-size: 12px; color: #64748b;">You will receive an email update once your withdrawal is approved and processed.</p>
      </div>`
    }).catch((e: any) => console.error("[SMTP Error] User withdrawal email:", e));

    // 2. Send alert email to Admin
    const adminEmail = db.settings?.backupReceiverEmail || db.settings?.smtpUser || ADMIN_EMAILS[0];
    sendSmtpEmail({
      to: adminEmail,
      subject: `[${db.settings?.siteName || "TG Links"} Admin Alert] New Withdrawal Request ($${reqAmount.toFixed(2)})`,
      text: `A new withdrawal request was submitted:\n\nUser: ${user.email}\nAmount: $${reqAmount.toFixed(2)}\nMethod: ${method}\nAccount: ${account}`,
      html: `<div style="font-family: system-ui, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #0284c7; margin-top: 0;">🔔 New Withdrawal Request Alert</h2>
        <p>A publisher has requested a payout on <strong>${db.settings?.siteName || "TG Links"}</strong>:</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>User Email:</strong> ${user.email}</p>
          <p style="margin: 4px 0;"><strong>Amount:</strong> $${reqAmount.toFixed(2)}</p>
          <p style="margin: 4px 0;"><strong>Method:</strong> ${method}</p>
          <p style="margin: 4px 0;"><strong>Payout Account:</strong> ${account}</p>
        </div>
        <p style="font-size: 12px; color: #64748b;">Log in to your Admin Dashboard to approve or reject this request.</p>
      </div>`
    }).catch((e: any) => console.error("[SMTP Error] Admin withdrawal alert email:", e));

    res.json({ success: true, withdrawal: newWithdrawal, balance: user.balance });
  });

  app.post("/api/users/withdrawal-settings", (req, res) => {
    const { userId, method, account } = req.body;
    if (!userId || !method || !account) {
      return res.status(400).json({ error: "Withdrawal method and account are required" });
    }

    const db = loadDb();
    const user = db.users.find((u: any) => u.id === userId && !u.banned);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.withdrawalMethod = method;
    user.withdrawalAccount = account;
    saveDb(db);

    // Send email notification for withdrawal settings update
    sendSmtpEmail({
      to: user.email,
      subject: `[${db.settings?.siteName || "TG Links"}] Withdrawal Settings Updated`,
      text: `Hello,\n\nYour withdrawal settings on ${db.settings?.siteName || "TG Links"} have been updated:\n\nMethod: ${method}\nAccount: ${account}\n\nIf you did not make this change, please update your password and contact support immediately.`,
      html: `<div style="font-family: system-ui, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0;">⚙️ Withdrawal Settings Updated</h2>
        <p>Your default withdrawal method and account details have been updated:</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>New Method:</strong> ${method}</p>
          <p style="margin: 4px 0;"><strong>New Account:</strong> ${account}</p>
        </div>
        <p style="font-size: 12px; color: #dc2626;">If you did not authorize this update, please change your password and contact support immediately.</p>
      </div>`
    }).catch((e: any) => console.error("[SMTP Error] Withdrawal settings email:", e));

    const { password: _, ...userSafe } = user;
    res.json({ success: true, user: userSafe });
  });

  app.post("/api/users/change-password", (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const db = loadDb();
    const user = db.users.find((u: any) => u.id === userId && !u.banned);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.password !== oldPassword) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    user.password = newPassword;
    saveDb(db);

    // Send security email
    sendSmtpEmail({
      to: user.email,
      subject: `[${db.settings?.siteName || "TG Links"}] Security Notice: Password Changed`,
      text: `Hello,\n\nYour account password on ${db.settings?.siteName || "TG Links"} was recently changed.\n\nIf you performed this action, no further steps are required.\nIf you did NOT change your password, please contact support immediately.`,
      html: `<div style="font-family: system-ui, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0;">🔒 Security Alert: Password Changed</h2>
        <p>The password for your account (<strong>${user.email}</strong>) was successfully changed.</p>
        <p style="font-size: 13px; color: #dc2626;">If you did not perform this change, please contact support immediately.</p>
      </div>`
    }).catch((e: any) => console.error("[SMTP Error] Password change email:", e));

    const { password: _, ...userSafe } = user;
    res.json({ success: true, message: "Password updated successfully!", user: userSafe });
  });

  app.post("/api/users/faucet-settings", (req, res) => {
    const { userId, enableFaucetMode, faucetPromptSeen } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const db = loadDb();
    const user = db.users.find((u: any) => u.id === userId && !u.banned);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (enableFaucetMode !== undefined) {
      user.enableFaucetMode = !!enableFaucetMode;
    }
    if (faucetPromptSeen !== undefined) {
      user.faucetPromptSeen = !!faucetPromptSeen;
    }
    saveDb(db);

    const { password: _, ...userSafe } = user;
    res.json({ success: true, user: userSafe });
  });

  // --- SUPPORT TICKETS API ---
  app.post("/api/tickets", async (req, res) => {
    const { userId, subject, message } = req.body;
    if (!userId || !subject || !message) {
      return res.status(400).json({ error: "User ID, subject, and message are required" });
    }

    const db = loadDb();
    const user = db.users.find((u: any) => u.id === userId && !u.banned);
    if (!user) {
      return res.status(404).json({ error: "User account not found" });
    }

    const ticket = {
      id: "tkt-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6),
      userId: user.id,
      userEmail: user.email,
      subject: String(subject).trim(),
      message: String(message).trim(),
      status: "open", // 'open' | 'replied' | 'closed'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      adminReply: ""
    };

    if (!db.tickets) db.tickets = [];
    db.tickets.unshift(ticket);
    saveDb(db);

    // Send notification email via SMTP to admin
    const adminEmail = db.settings?.backupReceiverEmail || db.settings?.smtpUser || ADMIN_EMAILS[0];
    const emailSubject = `[TG Links Support Ticket] ${ticket.subject} (${user.email})`;
    const emailText = `A new support ticket has been submitted on TG Links:\n\nUser Email: ${user.email}\nUser ID: ${user.id}\nTicket ID: ${ticket.id}\nSubmitted At: ${ticket.createdAt}\n\nSubject: ${ticket.subject}\n\nMessage:\n${ticket.message}\n\nPlease check the admin panel to reply.`;
    
    const emailHtml = `
      <div style="font-family: system-ui, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0; font-size: 20px;">📬 New Support Ticket Submitted</h2>
        <p style="font-size: 14px; color: #475569;">A user has submitted a support inquiry on <strong>${db.settings?.siteName || "TG Links"}</strong>:</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e2e8f0;">
          <p style="margin: 4px 0; font-size: 13px;"><strong>User Email:</strong> ${user.email}</p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Ticket ID:</strong> <code>${ticket.id}</code></p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Subject:</strong> ${ticket.subject}</p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Date:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
        </div>
        <div style="background: #eef2ff; border-left: 4px solid #6366f1; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 14px; white-space: pre-wrap; color: #1e1b4b;">
${ticket.message}
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Log in to your TG Links Admin Dashboard to review and respond to this ticket.</p>
      </div>
    `;

    let emailSent = false;
    let emailError = null;
    const smtpResult = await sendSmtpEmail({
      to: adminEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    });
    emailSent = smtpResult.success;
    if (!smtpResult.success) {
      emailError = smtpResult.error;
    }

    res.json({ success: true, ticket, emailSent, emailError });
  });

  app.get("/api/tickets/user/:userId", (req, res) => {
    const { userId } = req.params;
    const db = loadDb();
    const userTickets = (db.tickets || []).filter((t: any) => t && t.userId === userId);
    res.json({ tickets: userTickets });
  });

  // --- ADMIN PANEL SECURE ROUTES ---

  app.get("/api/admin/stats", requireAdmin, (req, res) => {
    const db = loadDb();
    
    const totalUsers = db.users.length;
    const totalLinks = (db.links ? db.links.length : 0) + (db.deletedLinksCount || 0);
    const totalViews = db.clicksLog.length;
    
    const systemEarnings = db.clicksLog.reduce((acc: number, c: any) => acc + c.earning, 0);
    const pendingWithdrawal = db.withdrawals
      .filter((w: any) => w.status === "pending")
      .reduce((acc: number, w: any) => acc + w.amount, 0);
    const openTickets = (db.tickets || []).filter((t: any) => t.status === "open").length;

    res.json({
      totalUsers,
      totalLinks,
      totalViews,
      systemEarnings: Number(systemEarnings.toFixed(4)),
      pendingWithdrawal: Number(pendingWithdrawal.toFixed(2)),
      openTickets
    });
  });

  app.get("/api/admin/views-report", requireAdmin, (req, res) => {
    const db = loadDb();
    const clicks = db.clicksLog || [];
    const users = db.users || [];
    const links = db.links || [];

    const todayStr = getISTDateString();
    const currentMonthStr = getISTMonthString();

    // Map links for fast code lookup
    const linkMap = new Map<string, any>();
    links.forEach((l: any) => {
      if (l && l.id) linkMap.set(l.id, l);
    });

    // Map users for fast lookup
    const userMap = new Map<string, any>();
    users.forEach((u: any) => {
      if (u && u.id) userMap.set(u.id, u);
    });

    // 1. System Daily Breakdown
    const dailyMap = new Map<string, { views: number; earnings: number; userSet: Set<string> }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = getISTDateString(d);
      dailyMap.set(dateStr, { views: 0, earnings: 0, userSet: new Set() });
    }

    // 2. System Monthly Breakdown
    const monthlyMap = new Map<string, { views: number; earnings: number; userSet: Set<string> }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mStr = getISTMonthString(d);
      monthlyMap.set(mStr, { views: 0, earnings: 0, userSet: new Set() });
    }

    // 3. User-by-User aggregations
    const userStatsMap = new Map<string, {
      userId: string;
      username: string;
      email: string;
      name: string;
      totalViews: number;
      todayViews: number;
      monthViews: number;
      totalEarnings: number;
      dailyMap: Map<string, { views: number; earnings: number }>;
      monthlyMap: Map<string, { views: number; earnings: number }>;
    }>();

    // Pre-initialize for registered users
    users.forEach((u: any) => {
      if (u && u.id) {
        userStatsMap.set(u.id, {
          userId: u.id,
          username: u.username || u.email?.split("@")[0] || u.id,
          email: u.email || "",
          name: u.name || u.username || "Registered User",
          totalViews: 0,
          todayViews: 0,
          monthViews: 0,
          totalEarnings: 0,
          dailyMap: new Map(),
          monthlyMap: new Map()
        });
      }
    });

    // Pre-initialize for guest if needed
    userStatsMap.set("guest", {
      userId: "guest",
      username: "Guest / Anonymous",
      email: "guest@system.local",
      name: "Guest Users",
      totalViews: 0,
      todayViews: 0,
      monthViews: 0,
      totalEarnings: 0,
      dailyMap: new Map(),
      monthlyMap: new Map()
    });

    // Process all clicks
    clicks.forEach((c: any) => {
      if (!c) return;
      const dateStr = c.timestamp ? getISTDateString(c.timestamp) : todayStr;
      const monthStr = c.timestamp ? getISTMonthString(c.timestamp) : currentMonthStr;
      const uId = c.userId || "guest";
      const earning = Number(c.earning || 0);

      // System Daily
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, { views: 0, earnings: 0, userSet: new Set() });
      }
      const dObj = dailyMap.get(dateStr)!;
      dObj.views += 1;
      dObj.earnings += earning;
      if (uId) dObj.userSet.add(uId);

      // System Monthly
      if (!monthlyMap.has(monthStr)) {
        monthlyMap.set(monthStr, { views: 0, earnings: 0, userSet: new Set() });
      }
      const mObj = monthlyMap.get(monthStr)!;
      mObj.views += 1;
      mObj.earnings += earning;
      if (uId) mObj.userSet.add(uId);

      // User aggregations
      if (!userStatsMap.has(uId)) {
        const u = userMap.get(uId);
        userStatsMap.set(uId, {
          userId: uId,
          username: u ? (u.username || u.email) : uId,
          email: u ? (u.email || "") : "",
          name: u ? (u.name || u.username) : uId,
          totalViews: 0,
          todayViews: 0,
          monthViews: 0,
          totalEarnings: 0,
          dailyMap: new Map(),
          monthlyMap: new Map()
        });
      }

      const uStats = userStatsMap.get(uId)!;
      uStats.totalViews += 1;
      uStats.totalEarnings += earning;

      if (dateStr === todayStr) uStats.todayViews += 1;
      if (monthStr === currentMonthStr) uStats.monthViews += 1;

      // User Daily Map
      const uDaily = uStats.dailyMap.get(dateStr) || { views: 0, earnings: 0 };
      uDaily.views += 1;
      uDaily.earnings += earning;
      uStats.dailyMap.set(dateStr, uDaily);

      // User Monthly Map
      const uMonthly = uStats.monthlyMap.get(monthStr) || { views: 0, earnings: 0 };
      uMonthly.views += 1;
      uMonthly.earnings += earning;
      uStats.monthlyMap.set(monthStr, uMonthly);
    });

    // System Daily List
    const dailyReports = Array.from(dailyMap.entries())
      .map(([date, d]) => {
        const cpm = d.views > 0 ? (d.earnings / d.views) * 1000 : 0;
        return {
          date,
          views: d.views,
          earnings: Number(d.earnings.toFixed(4)),
          cpm: Number(cpm.toFixed(2)),
          activeUsersCount: d.userSet.size
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    // System Monthly List
    const monthlyReports = Array.from(monthlyMap.entries())
      .map(([month, m]) => {
        const cpm = m.views > 0 ? (m.earnings / m.views) * 1000 : 0;
        return {
          month,
          views: m.views,
          earnings: Number(m.earnings.toFixed(4)),
          cpm: Number(cpm.toFixed(2)),
          activeUsersCount: m.userSet.size
        };
      })
      .sort((a, b) => b.month.localeCompare(a.month));

    // User breakdown list
    const userBreakdown = Array.from(userStatsMap.values())
      .filter(u => u.totalViews > 0 || u.userId !== "guest")
      .map(u => {
        const userDailyList = Array.from(u.dailyMap.entries())
          .map(([date, data]) => ({
            date,
            views: data.views,
            earnings: Number(data.earnings.toFixed(4)),
            cpm: data.views > 0 ? Number(((data.earnings / data.views) * 1000).toFixed(2)) : 0
          }))
          .sort((a, b) => b.date.localeCompare(a.date));

        const userMonthlyList = Array.from(u.monthlyMap.entries())
          .map(([month, data]) => ({
            month,
            views: data.views,
            earnings: Number(data.earnings.toFixed(4)),
            cpm: data.views > 0 ? Number(((data.earnings / data.views) * 1000).toFixed(2)) : 0
          }))
          .sort((a, b) => b.month.localeCompare(a.month));

        const averageCpm = u.totalViews > 0 ? Number(((u.totalEarnings / u.totalViews) * 1000).toFixed(2)) : 0;

        return {
          userId: u.userId,
          username: u.username,
          email: u.email,
          name: u.name,
          totalViews: u.totalViews,
          todayViews: u.todayViews,
          monthViews: u.monthViews,
          totalEarnings: Number(u.totalEarnings.toFixed(4)),
          averageCpm,
          dailyReports: userDailyList,
          monthlyReports: userMonthlyList
        };
      })
      .sort((a, b) => b.totalViews - a.totalViews);

    // Recent 100 logs
    const recentLogs = clicks.slice(-100).reverse().map((c: any) => {
      const user = userMap.get(c.userId);
      const link = linkMap.get(c.linkId);
      return {
        id: c.id,
        timestamp: c.timestamp,
        userId: c.userId,
        username: user ? (user.username || user.email) : (c.userId === "guest" ? "Guest" : "Unknown"),
        linkCode: link ? link.code : (c.linkId || "Direct"),
        originalUrl: link ? link.originalUrl : "",
        ip: c.ip || "Unknown",
        earning: Number((c.earning || 0).toFixed(4)),
        country: c.country || "Global"
      };
    });

    res.json({
      success: true,
      totalViews: clicks.length,
      todayViews: clicks.filter((c: any) => (c.timestamp || "").startsWith(todayStr)).length,
      monthViews: clicks.filter((c: any) => (c.timestamp || "").startsWith(currentMonthStr)).length,
      dailyReports,
      monthlyReports,
      userBreakdown,
      recentLogs
    });
  });

  app.get("/api/admin/users", requireAdmin, (req, res) => {
    const db = loadDb();
    // Exclude password in list
    const safeUsers = db.users.map(({ password: _, ...u }: any) => u);
    res.json({ users: safeUsers });
  });

  app.post("/api/admin/users/:id/update", requireAdmin, (req, res) => {
    const { id } = req.params;
    const { role, balance, customCpm, banned, enableFaucetMode } = req.body;
    const db = loadDb();

    const user = db.users.find((u: any) => u && u.id === id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (role !== undefined) user.role = role;
    if (balance !== undefined) user.balance = Number(balance);
    if (customCpm !== undefined) user.customCpm = customCpm === null ? undefined : Number(customCpm);
    if (banned !== undefined) user.banned = banned;
    if (enableFaucetMode !== undefined) user.enableFaucetMode = Boolean(enableFaucetMode);

    saveDb(db);
    const { password: _, ...userSafe } = user;
    res.json({ success: true, user: userSafe });
  });

  app.post("/api/admin/users/:id/faucet-mode", requireAdmin, (req, res) => {
    const { id } = req.params;
    const { enableFaucetMode } = req.body;
    const db = loadDb();

    const user = db.users.find((u: any) => u && u.id === id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.enableFaucetMode = Boolean(enableFaucetMode);
    saveDb(db);
    const { password: _, ...userSafe } = user;
    res.json({ success: true, user: userSafe });
  });

  app.get("/api/admin/users/:id/traffic-sources", requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = loadDb();

    const user = db.users.find((u: any) => u && u.id === id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const userLinks = db.links.filter((l: any) => l.userId === id);
    const userLinkIds = new Set(userLinks.map((l: any) => l.id));
    const userClicks = db.clicksLog.filter((c: any) => c.userId === id || userLinkIds.has(c.linkId));

    const referrerMap = new Map<string, { count: number; totalEarning: number; lastSeen: string }>();
    userClicks.forEach((c: any) => {
      let ref = c.referrer || c.referer || c.trafficSource || "Direct / Unknown";
      if (typeof ref === "string" && ref.trim()) {
        ref = ref.trim();
      } else {
        ref = "Direct / Unknown";
      }
      const existing = referrerMap.get(ref) || { count: 0, totalEarning: 0, lastSeen: c.timestamp || "" };
      existing.count += 1;
      existing.totalEarning += (c.earning || 0);
      if (!existing.lastSeen || (c.timestamp && c.timestamp > existing.lastSeen)) {
        existing.lastSeen = c.timestamp;
      }
      referrerMap.set(ref, existing);
    });

    const trafficSources = Array.from(referrerMap.entries()).map(([source, stats]) => ({
      source,
      clicks: stats.count,
      earnings: Number(stats.totalEarning.toFixed(6)),
      lastSeen: stats.lastSeen
    })).sort((a, b) => b.clicks - a.clicks);

    res.json({
      userId: id,
      userEmail: user.email,
      enableFaucetMode: !!user.enableFaucetMode,
      totalClicks: userClicks.length,
      trafficSources
    });
  });

  app.delete("/api/admin/users/:id", requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = loadDb();
    const userIdx = db.users.findIndex((u: any) => u && u.id === id);
    if (userIdx === -1) return res.status(404).json({ error: "User not found" });

    db.users.splice(userIdx, 1);
    saveDb(db);
    res.json({ success: true });
  });

  app.get("/api/admin/links", requireAdmin, (req, res) => {
    const db = loadDb();
    const linksMapped = db.links.map((l: any) => ({
      ...l,
      cpm: getCurrentCpmForLink(l, db)
    }));
    res.json({ links: linksMapped });
  });

  app.post("/api/admin/links/:id/toggle", requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = loadDb();
    const link = db.links.find((l: any) => l.id === id);
    if (!link) return res.status(404).json({ error: "Link not found" });

    link.status = link.status === "active" ? "suspended" : "active";
    saveDb(db);
    res.json({ success: true, link });
  });

  app.get("/api/admin/withdrawals", requireAdmin, (req, res) => {
    const db = loadDb();
    const withdrawalsWithDetails = db.withdrawals.map((w: any) => {
      const user = db.users.find((u: any) => u.id === w.userId);
      const userLinks = db.links.filter((l: any) => l.userId === w.userId);
      const userLinkIds = new Set(userLinks.map((l: any) => l.id));
      const userClicks = db.clicksLog.filter((c: any) => c.userId === w.userId || userLinkIds.has(c.linkId));

      const referrerMap = new Map<string, { count: number; totalEarning: number; lastSeen: string }>();
      userClicks.forEach((c: any) => {
        let ref = c.referrer || c.referer || c.trafficSource || "Direct / Unknown";
        if (typeof ref === "string" && ref.trim()) {
          ref = ref.trim();
        } else {
          ref = "Direct / Unknown";
        }
        const existing = referrerMap.get(ref) || { count: 0, totalEarning: 0, lastSeen: c.timestamp || "" };
        existing.count += 1;
        existing.totalEarning += (c.earning || 0);
        if (!existing.lastSeen || (c.timestamp && c.timestamp > existing.lastSeen)) {
          existing.lastSeen = c.timestamp;
        }
        referrerMap.set(ref, existing);
      });

      const trafficSources = Array.from(referrerMap.entries()).map(([source, stats]) => ({
        source,
        clicks: stats.count,
        earnings: Number(stats.totalEarning.toFixed(6)),
        lastSeen: stats.lastSeen
      })).sort((a, b) => b.clicks - a.clicks);

      return {
        ...w,
        userFaucetMode: !!user?.enableFaucetMode,
        userEmail: user?.email || w.userEmail,
        totalUserClicks: userClicks.length,
        trafficSources
      };
    });
    res.json({ withdrawals: withdrawalsWithDetails });
  });

  // --- ADMIN SUPPORT TICKETS ENDPOINTS ---
  app.get("/api/admin/tickets", requireAdmin, (req, res) => {
    const db = loadDb();
    res.json({ tickets: db.tickets || [] });
  });

  app.post("/api/admin/tickets/:id/reply", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { adminReply, status } = req.body;
    const db = loadDb();

    if (!db.tickets) db.tickets = [];
    const ticket = db.tickets.find((t: any) => t.id === id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    if (adminReply !== undefined) ticket.adminReply = String(adminReply).trim();
    if (status) ticket.status = status; // 'open' | 'replied' | 'closed'
    ticket.updatedAt = new Date().toISOString();

    saveDb(db);

    // Send email notification to user via SMTP if reply provided
    let emailSent = false;
    let emailError = null;

    if (ticket.userEmail && adminReply) {
      const emailSubject = `[TG Links Support] Reply to Ticket: ${ticket.subject}`;
      const emailText = `Hello,\n\nOur support team has updated your ticket (${ticket.id}):\n\nSubject: ${ticket.subject}\nStatus: ${(ticket.status || "replied").toUpperCase()}\n\nAdmin Response:\n${ticket.adminReply}\n\nThank you for using TG Links!`;
      const emailHtml = `
        <div style="font-family: system-ui, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #4f46e5; margin-top: 0; font-size: 20px;">💬 Update on Your Support Ticket</h2>
          <p style="font-size: 14px; color: #475569;">Hello! Our support team has responded to your ticket on <strong>${db.settings?.siteName || "TG Links"}</strong>:</p>
          <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e2e8f0; font-size: 13px;">
            <p style="margin: 2px 0;"><strong>Ticket ID:</strong> <code>${ticket.id}</code></p>
            <p style="margin: 2px 0;"><strong>Subject:</strong> ${ticket.subject}</p>
            <p style="margin: 2px 0;"><strong>Status:</strong> <span style="font-weight: bold; color: #0284c7;">${(ticket.status || "replied").toUpperCase()}</span></p>
          </div>
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 14px; white-space: pre-wrap; color: #14532d;">
<strong>Support Response:</strong>
${ticket.adminReply}
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 24px;">You can also view and track your ticket status directly inside your user dashboard.</p>
        </div>
      `;

      const smtpResult = await sendSmtpEmail({
        to: ticket.userEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml
      });
      emailSent = smtpResult.success;
      if (!smtpResult.success) {
        emailError = smtpResult.error;
      }
    }

    res.json({ success: true, ticket, emailSent, emailError });
  });

  app.delete("/api/admin/tickets/:id", requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = loadDb();
    if (!db.tickets) db.tickets = [];
    const idx = db.tickets.findIndex((t: any) => t.id === id);
    if (idx === -1) return res.status(404).json({ error: "Ticket not found" });

    db.tickets.splice(idx, 1);
    saveDb(db);
    res.json({ success: true });
  });

  app.post("/api/admin/withdrawals/:id/status", requireAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    const db = loadDb();

    const withdrawal = db.withdrawals.find((w: any) => w.id === id);
    if (!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });

    if (withdrawal.status !== "pending") {
      return res.status(400).json({ error: "Withdrawal already processed" });
    }

    if (status === "approved") {
      withdrawal.status = "approved";
    } else if (status === "rejected") {
      withdrawal.status = "rejected";
      // Refund the user's wallet balance
      const user = db.users.find((u: any) => u.id === withdrawal.userId);
      if (user) {
        user.balance = Number((user.balance + withdrawal.amount).toFixed(6));
      }
    } else {
      return res.status(400).json({ error: "Invalid status parameter" });
    }

    saveDb(db);

    // Send status update email to user
    if (withdrawal.userEmail) {
      const isApproved = status === "approved";
      sendSmtpEmail({
        to: withdrawal.userEmail,
        subject: `[${db.settings?.siteName || "TG Links"}] Withdrawal Request ${isApproved ? "Approved" : "Updated"} ($${withdrawal.amount.toFixed(2)})`,
        text: `Hello,\n\nYour withdrawal request of $${withdrawal.amount.toFixed(2)} via ${withdrawal.method} (${withdrawal.account}) has been ${isApproved ? "APPROVED and processed" : "REJECTED"}.\n\n${isApproved ? "Funds have been sent to your account." : "The requested amount has been restored to your publisher balance."}\n\nThank you for using ${db.settings?.siteName || "TG Links"}!`,
        html: `<div style="font-family: system-ui, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: ${isApproved ? '#16a34a' : '#dc2626'}; margin-top: 0;">${isApproved ? '✅ Withdrawal Approved!' : '❌ Withdrawal Request Updated'}</h2>
          <p>Your withdrawal request on <strong>${db.settings?.siteName || "TG Links"}</strong> has been ${isApproved ? 'approved and completed' : 'rejected'}:</p>
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Amount:</strong> $${withdrawal.amount.toFixed(2)}</p>
            <p style="margin: 4px 0;"><strong>Method:</strong> ${withdrawal.method}</p>
            <p style="margin: 4px 0;"><strong>Payout Account:</strong> ${withdrawal.account}</p>
            <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: ${isApproved ? '#16a34a' : '#dc2626'}; font-weight: bold;">${isApproved ? 'APPROVED & PAID' : 'REJECTED & REFUNDED'}</span></p>
          </div>
          <p style="font-size: 13px; color: #334155;">${isApproved ? 'Your payment has been successfully processed.' : 'The requested funds have been restored to your publisher balance.'}</p>
        </div>`
      }).catch((e: any) => console.error("[SMTP Error] Withdrawal status update email:", e));
    }

    res.json({ success: true, withdrawal });
  });

  app.get("/api/admin/settings", requireAdmin, (req, res) => {
    const db = loadDb();
    res.json({ 
      settings: db.settings,
      gdrive: {
        enabled: gdriveSyncEnabled,
        fileId: gdriveFileId,
        serviceAccountEmail
      }
    });
  });

  // Public site settings endpoint
  app.get("/api/settings", (req, res) => {
    let rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    let ipStr = Array.isArray(rawIp) ? rawIp[0] : String(rawIp);
    if (ipStr.includes(",")) {
      ipStr = ipStr.split(",")[0].trim();
    }
    const db = loadDb();
    const s = db.settings || {};
    const activeAds = getActiveAdvertiserAds(db, ipStr);
    res.json({
      siteName: s.siteName || "TG LINKS",
      siteTitle: s.siteTitle || "Shorten Links and Earn Money",
      siteDescription: s.siteDescription || "",
      globalCpm: s.globalCpm || 5,
      minWithdrawal: s.minWithdrawal || 2,
      withdrawalMethods: s.withdrawalMethods || ["PayPal", "Payeer", "Bitcoin", "Bank Transfer", "UPI"],
      adPagesCount: s.adPagesCount || 1,
      bannerAd728x90: s.bannerAd728x90 || "",
      bannerAd300x250: s.bannerAd300x250 || "",
      bannerAd320x50: s.bannerAd320x50 || "",
      popunderCode: s.popunderCode || "",
      globalHeaderCode: s.globalHeaderCode || "",
      faviconUrl: s.faviconUrl || "",
      logoUrl: s.logoUrl || "",
      enableOwnAds: s.enableOwnAds !== undefined ? s.enableOwnAds : true,
      enableNeonAdGate: s.enableNeonAdGate !== undefined ? s.enableNeonAdGate : false,
      neonTodayAdCode: s.neonTodayAdCode || "",
      enableFaucetMode: s.enableFaucetMode !== undefined ? s.enableFaucetMode : false,
      advCpmOfferWall: s.advCpmOfferWall ?? 3.0,
      advCpmSponsoredPopup: s.advCpmSponsoredPopup ?? 4.0,
      advCpmBanner728x90: s.advCpmBanner728x90 ?? 1.5,
      advCpmBanner468x60: s.advCpmBanner468x60 ?? 1.2,
      advCpmBanner300x250: s.advCpmBanner300x250 ?? 2.0,
      advCpmBanner320x50: s.advCpmBanner320x50 ?? 1.0,
      advCpmBanner300x600: s.advCpmBanner300x600 ?? 2.5,
      advCpmBannerLeft: s.advCpmBannerLeft ?? 1.5,
      advCpmBannerRight: s.advCpmBannerRight ?? 1.5,
      activeAdvertiserAds: activeAds
    });
  });

  app.post("/api/admin/settings", requireAdmin, (req, res) => {
    const newSettings = req.body;
    const db = loadDb();
    
    db.settings = {
      ...db.settings,
      ...newSettings
    };
    
    saveDb(db);
    res.json({ success: true, settings: db.settings });
  });

  app.post("/api/admin/test-smtp", requireAdmin, async (req, res) => {
    const settings = req.body;
    const result = await sendEmailBackup(settings, true);
    if (result.success) {
      res.json({ success: true, message: "Database backup email sent successfully via SMTP!" });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  });

function cleanNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "number") return isNaN(val) ? fallback : val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.-]+/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? fallback : num;
  }
  return fallback;
}

function parseSqlInsertValue(val: string): string {
  val = val.trim();
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    return val.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (val.toUpperCase() === "NULL") return "";
  return val;
}

function normalizeAndMigrateDatabase(rawData: any): any {
  let data: any = rawData;

  // 1. String cleaning and parsing
  if (typeof data === "string") {
    let str = data.trim();
    if (str.charCodeAt(0) === 0xFEFF) {
      str = str.slice(1);
    }

    // Unescape if double JSON encoded e.g. "\"{\\\"users\\\": ...}\""
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
      try {
        const unquoted = JSON.parse(str);
        if (typeof unquoted === "string") str = unquoted;
        else if (typeof unquoted === "object" && unquoted !== null) data = unquoted;
      } catch (e) {}
    }

    if (typeof data === "string") {
      try {
        data = JSON.parse(str);
      } catch (e1) {
        try {
          // Remove trailing commas before closing braces/brackets
          const cleaned = str.replace(/,\s*([}\]])/g, "$1");
          data = JSON.parse(cleaned);
        } catch (e2) {
          // Attempt JSON object or array extraction
          const firstBrace = str.indexOf("{");
          const lastBrace = str.lastIndexOf("}");
          const firstBracket = str.indexOf("[");
          const lastBracket = str.lastIndexOf("]");

          let parsed = false;
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            try {
              const sub = str.substring(firstBrace, lastBrace + 1).replace(/,\s*([}\]])/g, "$1");
              data = JSON.parse(sub);
              parsed = true;
            } catch (e3) {}
          }

          if (!parsed && firstBracket !== -1 && lastBracket > firstBracket) {
            try {
              const subArr = str.substring(firstBracket, lastBracket + 1).replace(/,\s*([}\]])/g, "$1");
              data = JSON.parse(subArr);
              parsed = true;
            } catch (e4) {}
          }

          if (!parsed) {
            data = parseSqlDump(str);
          }
        }
      }
    }
  }

  // Helper to parse SQL dump
  function parseSqlDump(sql: string): any {
    const dbOut: any = { users: [], links: [], clicksLog: [], withdrawals: [], tickets: [], adFlyShorteners: [], settings: {} };
    const insertRegex = /INSERT\s+INTO\s+[`"']?(\w+)[`"']?\s*(?:\(([^)]+)\))?\s*VALUES\s*([^;]+);/gi;
    let match;
    while ((match = insertRegex.exec(sql)) !== null) {
      const tableName = match[1].toLowerCase();
      const colNamesStr = match[2];
      const valuesStr = match[3];

      let cols: string[] = [];
      if (colNamesStr) {
        cols = colNamesStr.split(",").map(c => c.trim().replace(/[`"']/g, "").toLowerCase());
      }

      const rowMatches = valuesStr.match(/\((?:[^()']|'[^']*')*\)/g) || [];
      for (const rowStr of rowMatches) {
        const rawVals = rowStr.slice(1, -1).split(/,(?=(?:[^']*'[^']*')*[^']*$)/).map(v => parseSqlInsertValue(v));

        const rowObj: any = {};
        if (cols.length === rawVals.length) {
          cols.forEach((col, i) => {
            rowObj[col] = rawVals[i];
          });
        }

        if (tableName.includes("user") || tableName.includes("member") || tableName.includes("account")) {
          dbOut.users.push({
            id: rowObj.id || rowObj.user_id || rawVals[0],
            email: rowObj.email || rowObj.user_email || rawVals[1] || rawVals[0],
            username: rowObj.username || rowObj.name || rawVals[1],
            password: rowObj.password || rowObj.pass || rawVals[2],
            role: rowObj.role || rawVals[3] || "user",
            balance: cleanNumber(rowObj.balance || rowObj.wallet || rawVals[4])
          });
        } else if (tableName.includes("link") || tableName.includes("url") || tableName.includes("shortener") || tableName.includes("alias")) {
          dbOut.links.push({
            id: rowObj.id || rowObj.link_id || rowObj.url_id || rawVals[0],
            code: rowObj.code || rowObj.alias || rowObj.short_code || rawVals[1] || rawVals[0],
            originalUrl: rowObj.original_url || rowObj.originalurl || rowObj.url || rowObj.long_url || rawVals[2] || rawVals[1],
            userId: rowObj.user_id || rowObj.userid || rawVals[3] || "guest",
            clicks: cleanNumber(rowObj.clicks || rowObj.views || rowObj.hits || rawVals[4]),
            earnings: cleanNumber(rowObj.earnings || rowObj.revenue || rawVals[5])
          });
        } else if (tableName.includes("click") || tableName.includes("stat") || tableName.includes("view") || tableName.includes("log")) {
          dbOut.clicksLog.push({
            id: rowObj.id || rawVals[0],
            linkId: rowObj.link_id || rowObj.linkid || rowObj.url_id || rawVals[1],
            userId: rowObj.user_id || rowObj.userid || rawVals[2],
            timestamp: rowObj.timestamp || rowObj.created_at || rawVals[3] || new Date().toISOString(),
            ip: rowObj.ip || rowObj.ip_address || rawVals[4] || "127.0.0.1",
            earning: cleanNumber(rowObj.earning || rowObj.revenue || rowObj.payout || rawVals[5])
          });
        }
      }
    }
    return dbOut;
  }

  // 2. If data is an array at root level, categorize elements
  if (Array.isArray(data)) {
    const arrLinks: any[] = [];
    const arrUsers: any[] = [];
    const arrClicks: any[] = [];
    const arrWithdrawals: any[] = [];

    data.forEach((item: any) => {
      if (item && typeof item === "object") {
        if (item.url || item.originalUrl || item.original_url || item.long_url || item.alias || item.code || item.target_url) {
          arrLinks.push(item);
        } else if (item.email || item.user_email || item.username || item.password || item.pass) {
          arrUsers.push(item);
        } else if (item.ip || item.linkId || item.link_id || item.timestamp || item.user_ip) {
          arrClicks.push(item);
        } else if (item.amount || item.withdrawal_method || item.payment_method) {
          arrWithdrawals.push(item);
        }
      }
    });

    data = { users: arrUsers, links: arrLinks, clicksLog: arrClicks, withdrawals: arrWithdrawals };
  }

  if (typeof data !== "object" || data === null) {
    data = {};
  }

  // 3. Unwrap nested container objects (e.g. data.data, data.db, data.database, data.result, data.tables, data.backup)
  if (!data.users && !data.links) {
    if (data.data && typeof data.data === "object") data = data.data;
    else if (data.db && typeof data.db === "object") data = data.db;
    else if (data.database && typeof data.database === "object") data = data.database;
    else if (data.backup && typeof data.backup === "object") data = data.backup;
    else if (data.tables && typeof data.tables === "object") data = data.tables;
  }

  // Auto-detect keys if property names are non-standard
  if (data && typeof data === "object" && !Array.isArray(data)) {
    Object.keys(data).forEach(k => {
      const lowerK = k.toLowerCase();
      if (!data.users && (lowerK.includes("user") || lowerK.includes("member") || lowerK.includes("account"))) {
        data.users = data[k];
      }
      if (!data.links && (lowerK.includes("link") || lowerK.includes("url") || lowerK.includes("alias") || lowerK.includes("shortener") || lowerK.includes("slug"))) {
        data.links = data[k];
      }
      if (!data.clicksLog && (lowerK.includes("click") || lowerK.includes("stat") || lowerK.includes("view") || lowerK.includes("log"))) {
        data.clicksLog = data[k];
      }
      if (!data.withdrawals && (lowerK.includes("withdraw") || lowerK.includes("payout") || lowerK.includes("cashout"))) {
        data.withdrawals = data[k];
      }
    });
  }

  // Helper to force object dictionaries or nested structures into arrays
  function toArray(val: any): any[] {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "object") {
      return Object.keys(val).map(key => {
        const item = val[key];
        if (typeof item === "object" && item !== null) {
          if (!item.id && !item._id) item.id = key;
          return item;
        }
        return { id: key, value: item };
      });
    }
    return [];
  }

  // Extract raw sections
  let rawUsers = toArray(data.users);
  let rawLinks = toArray(data.links);
  let rawClicks = toArray(data.clicksLog || data.clicks_log || data.click_logs);
  let rawWithdrawals = toArray(data.withdrawals);
  let rawTickets = toArray(data.tickets || data.support_tickets);
  let rawAdFly = toArray(data.adFlyShorteners || data.external_shorteners);
  let rawSettings = (data.settings || data.config || data.options || data.site_settings || {});

  // 4. Normalize USERS
  const usersMap = new Map<string, any>();
  const normalizedUsers: any[] = [];

  rawUsers.forEach((u: any, idx: number) => {
    if (!u || typeof u !== "object") return;
    const email = (u.email || u.user_email || u.username || u.name || u.login || `user_${idx}@example.com`).trim().toLowerCase();
    const id = u.id || u._id || u.user_id || u.uid || u.member_id || `u-${idx + 1}`;
    const role = (u.role === "admin" || u.is_admin || u.isAdmin || u.admin || u.type === "admin" || email === "freefiregtamcpe@gmail.com" || email === "teamthunderofficialyt@gmail.com") ? "admin" : "user";
    
    const userObj = {
      id,
      email: u.email || email,
      username: u.username || u.name || email.split("@")[0],
      role,
      balance: cleanNumber(u.balance ?? u.wallet ?? u.money ?? u.earnings ?? u.totalEarned ?? 0),
      totalEarned: cleanNumber(u.totalEarned ?? u.total_earned ?? u.balance ?? 0),
      withdrawalMethod: u.withdrawalMethod || u.withdrawal_method || u.payment_method || "PayPal",
      withdrawalAccount: u.withdrawalAccount || u.withdrawal_account || u.payment_account || u.email || email,
      createdAt: u.createdAt || u.created_at || u.created || u.date || new Date().toISOString(),
      banned: Boolean(u.banned ?? u.is_banned ?? false),
      password: u.password || u.pass || u.password_hash || u.hash || "Thunderffyt123@",
      apiToken: u.apiToken || u.api_token || u.token || generateApiToken(),
      enableFaucetMode: Boolean(u.enableFaucetMode ?? u.faucet_mode ?? false)
    };

    usersMap.set(String(id), userObj);
    usersMap.set(email, userObj);
    normalizedUsers.push(userObj);
  });

  // Mandatory admin accounts so admins are never locked out after restore
  const defaultAdmins = [
    { id: "admin-1", email: "freefiregtamcpe@gmail.com", role: "admin", balance: 100, totalEarned: 100, withdrawalMethod: "PayPal", withdrawalAccount: "admin_paypal@example.com", createdAt: new Date().toISOString(), banned: false, password: "Thunderffyt123@", apiToken: generateApiToken() },
    { id: "admin-2", email: "teamthunderofficialyt@gmail.com", role: "admin", balance: 0, totalEarned: 0, withdrawalMethod: "PayPal", withdrawalAccount: "teamthunder@example.com", createdAt: new Date().toISOString(), banned: false, password: "Thunderffyt123@", apiToken: generateApiToken() }
  ];

  defaultAdmins.forEach(adminDef => {
    const existing = normalizedUsers.find(u => u.email.toLowerCase() === adminDef.email.toLowerCase());
    if (existing) {
      existing.role = "admin";
    } else {
      normalizedUsers.push(adminDef);
      usersMap.set(adminDef.id, adminDef);
      usersMap.set(adminDef.email, adminDef);
    }
  });

  // 5. Normalize LINKS
  const linkCodeToIdMap = new Map<string, string>();
  const normalizedLinks: any[] = [];

  rawLinks.forEach((l: any, idx: number) => {
    if (!l || typeof l !== "object") return;
    const id = String(l.id || l._id || l.link_id || l.url_id || `l-${Math.random().toString(36).substring(2, 9)}`);
    const code = String(l.code || l.alias || l.short_code || l.short_url || l.slug || l.key || Math.random().toString(36).substring(2, 8));
    const originalUrl = l.originalUrl || l.original_url || l.url || l.long_url || l.target_url || l.destination_url || l.link || l.location || "https://google.com";
    
    let userId = String(l.userId || l.user_id || l.author_id || l.owner_id || l.user || "guest");
    let userEmail = l.userEmail || l.user_email || l.email;
    if (!userEmail && usersMap.has(userId)) {
      userEmail = usersMap.get(userId).email;
    } else if (userEmail && usersMap.has(userEmail)) {
      userId = usersMap.get(userEmail).id;
    }
    if (!userEmail) userEmail = "guest";

    const linkObj = {
      id,
      code,
      originalUrl,
      userId,
      userEmail,
      cpm: cleanNumber(l.cpm ?? l.rate ?? l.payout_rate ?? 5, 5),
      clicks: cleanNumber(l.clicks ?? l.views ?? l.total_clicks ?? l.click_count ?? l.hits ?? 0, 0),
      earnings: cleanNumber(l.earnings ?? l.total_earnings ?? l.revenue ?? l.earned ?? 0, 0),
      createdAt: l.createdAt || l.created_at || l.created || l.date || new Date().toISOString(),
      status: l.status || (l.active === false ? "inactive" : "active"),
      isApiGenerated: Boolean(l.isApiGenerated ?? l.is_api ?? l.api ?? false),
      isFaucetApi: Boolean(l.isFaucetApi ?? l.faucet_api ?? false),
      lastViewedAt: l.lastViewedAt || l.last_viewed_at || l.last_click || l.createdAt || l.created_at || new Date().toISOString()
    };

    linkCodeToIdMap.set(code, id);
    linkCodeToIdMap.set(id, id);

    // Check for embedded clicks
    if (Array.isArray(l.clicksList) || Array.isArray(l.viewsList) || Array.isArray(l.logs)) {
      const embeddedClicks = l.clicksList || l.viewsList || l.logs;
      embeddedClicks.forEach((c: any) => {
        rawClicks.push({
          linkId: id,
          userId,
          timestamp: c.timestamp || c.created_at || c.date || new Date().toISOString(),
          ip: c.ip || c.ip_address || "127.0.0.1",
          earning: cleanNumber(c.earning ?? c.revenue ?? 0),
          country: c.country || "Global"
        });
      });
    }

    normalizedLinks.push(linkObj);
  });

  // 6. Normalize CLICKS LOG
  const normalizedClicksLog: any[] = [];
  rawClicks.forEach((c: any) => {
    if (!c || typeof c !== "object") return;
    const id = String(c.id || c._id || `c-${Math.random().toString(36).substring(2, 9)}`);
    
    let rawLinkId = String(c.linkId || c.link_id || c.url_id || c.alias || c.code || "");
    let linkId = linkCodeToIdMap.get(rawLinkId) || rawLinkId || (normalizedLinks[0] ? normalizedLinks[0].id : "l-1");
    let userId = String(c.userId || c.user_id || "guest");
    
    normalizedClicksLog.push({
      id,
      linkId,
      userId,
      timestamp: c.timestamp || c.created_at || c.date || c.time || c.created || new Date().toISOString(),
      ip: c.ip || c.ip_address || c.user_ip || "127.0.0.1",
      earning: cleanNumber(c.earning ?? c.earnings ?? c.revenue ?? c.payout ?? c.amount ?? 0, 0),
      country: c.country || c.country_code || c.location || "Global"
    });
  });

  // Recalculate link statistics if clicks count was 0
  const linkClicksCountMap = new Map<string, number>();
  const linkEarningsMap = new Map<string, number>();
  normalizedClicksLog.forEach(c => {
    linkClicksCountMap.set(c.linkId, (linkClicksCountMap.get(c.linkId) || 0) + 1);
    linkEarningsMap.set(c.linkId, (linkEarningsMap.get(c.linkId) || 0) + Number(c.earning || 0));
  });

  normalizedLinks.forEach(l => {
    if (l.clicks === 0 && linkClicksCountMap.has(l.id)) {
      l.clicks = linkClicksCountMap.get(l.id)!;
    }
    if (l.earnings === 0 && linkEarningsMap.has(l.id)) {
      l.earnings = Number(linkEarningsMap.get(l.id)!.toFixed(4));
    }
  });

  // 7. Normalize WITHDRAWALS
  const normalizedWithdrawals: any[] = rawWithdrawals.map((w: any, idx: number) => ({
    id: String(w.id || w._id || `w-${idx + 1}`),
    userId: String(w.userId || w.user_id || "guest"),
    userEmail: w.userEmail || w.user_email || w.email || "guest",
    amount: cleanNumber(w.amount ?? w.sum ?? 0),
    method: w.method || w.withdrawal_method || w.payment_method || "PayPal",
    account: w.account || w.withdrawal_account || w.payment_account || "N/A",
    status: w.status || "pending",
    requestedAt: w.requestedAt || w.requested_at || w.created_at || w.date || new Date().toISOString(),
    processedAt: w.processedAt || w.processed_at || w.updated_at
  })).filter(Boolean);

  // 8. Normalize TICKETS
  const normalizedTickets: any[] = rawTickets.map((t: any, idx: number) => ({
    id: String(t.id || t._id || `t-${idx + 1}`),
    userId: String(t.userId || t.user_id || "guest"),
    userEmail: t.userEmail || t.user_email || t.email || "guest",
    subject: t.subject || t.title || "Support Request",
    message: t.message || t.body || t.content || "",
    status: t.status || "open",
    createdAt: t.createdAt || t.created_at || t.date || new Date().toISOString(),
    replies: Array.isArray(t.replies) ? t.replies : []
  })).filter(Boolean);

  // 9. Normalize ADFLY SHORTENERS
  const normalizedAdFly: any[] = rawAdFly.map((a: any, idx: number) => ({
    id: String(a.id || a._id || `adfly-${idx + 1}`),
    name: a.name || a.title || "External Shortener",
    apiUrl: a.apiUrl || a.api_url || a.url || "",
    apiToken: a.apiToken || a.api_token || a.token || "",
    alias: a.alias || a.code || "",
    enabled: a.enabled !== undefined ? Boolean(a.enabled) : (a.active !== undefined ? Boolean(a.active) : false),
    priority: Number(a.priority || 0),
    isFaucetApi: Boolean(a.isFaucetApi ?? a.is_faucet_api ?? false)
  })).filter(Boolean);

  // 10. Normalize SETTINGS
  const normalizedSettings = {
    siteName: rawSettings.siteName || rawSettings.site_name || rawSettings.title || "TG LINKS",
    siteTitle: rawSettings.siteTitle || rawSettings.site_title || "Shorten Links and Earn Money",
    siteDescription: rawSettings.siteDescription || rawSettings.site_description || "Unlock the power of shortened URLs. Monetize your traffic by sharing links with high-paying CPM rates.",
    globalCpm: cleanNumber(rawSettings.globalCpm ?? rawSettings.global_cpm ?? rawSettings.cpm ?? rawSettings.default_cpm ?? 5, 5),
    minWithdrawal: cleanNumber(rawSettings.minWithdrawal ?? rawSettings.min_withdrawal ?? rawSettings.min_withdraw ?? 2, 2),
    withdrawalMethods: Array.isArray(rawSettings.withdrawalMethods) ? rawSettings.withdrawalMethods : ["PayPal", "Payeer", "Bitcoin", "Bank Transfer", "UPI"],
    adPagesCount: cleanNumber(rawSettings.adPagesCount ?? rawSettings.ad_pages_count ?? 1, 1),
    bannerAd728x90: rawSettings.bannerAd728x90 || rawSettings.banner_728x90 || `<div class="w-full h-24 bg-gradient-to-r from-blue-500 to-indigo-600 flex flex-col items-center justify-center border border-indigo-300 text-white rounded-lg shadow-sm px-4 text-center"><span class="text-xs uppercase tracking-widest font-bold opacity-75">Sponsor Banner (728x90)</span></div>`,
    bannerAd300x250: rawSettings.bannerAd300x250 || rawSettings.banner_300x250 || `<div class="w-[300px] h-[250px] bg-gradient-to-br from-purple-500 to-pink-500 flex flex-col items-center justify-center border border-purple-300 text-white rounded-lg shadow-sm p-6 text-center mx-auto"><span class="text-xs uppercase tracking-widest font-bold opacity-75">Premium Space (300x250)</span></div>`,
    bannerAd320x50: rawSettings.bannerAd320x50 || rawSettings.banner_320x50 || `<div class="w-80 h-12 bg-gradient-to-r from-teal-500 to-emerald-600 flex items-center justify-between border border-teal-300 text-white rounded-lg shadow-sm px-4 mx-auto"><span class="text-xs font-bold uppercase tracking-wide">Ad: Secure VPN</span></div>`,
    popunderCode: rawSettings.popunderCode || rawSettings.popunder || "",
    globalHeaderCode: rawSettings.globalHeaderCode || rawSettings.header_code || "",
    faviconUrl: rawSettings.faviconUrl || rawSettings.favicon || "",
    logoUrl: rawSettings.logoUrl || rawSettings.logo || "",
    enableOwnAds: rawSettings.enableOwnAds !== undefined ? Boolean(rawSettings.enableOwnAds) : true,
    enableNeonAdGate: rawSettings.enableNeonAdGate !== undefined ? Boolean(rawSettings.enableNeonAdGate) : false,
    neonTodayAdCode: rawSettings.neonTodayAdCode || `<iframe scrolling="no" src="https://neon.today/show/surf/21651" style="width: 100%; height: 250px; padding: 0; border: 1px dotted grey;" frameborder="0"></iframe>`,
    enableFaucetMode: rawSettings.enableFaucetMode !== undefined ? Boolean(rawSettings.enableFaucetMode) : false,
    smtpHost: rawSettings.smtpHost || "",
    smtpPort: rawSettings.smtpPort || 587,
    smtpUser: rawSettings.smtpUser || "",
    smtpPass: rawSettings.smtpPass || "",
    backupSenderEmail: rawSettings.backupSenderEmail || "",
    backupReceiverEmail: rawSettings.backupReceiverEmail || ""
  };

  return {
    users: normalizedUsers,
    links: normalizedLinks,
    clicksLog: normalizedClicksLog,
    withdrawals: normalizedWithdrawals,
    tickets: normalizedTickets,
    adFlyShorteners: normalizedAdFly,
    settings: normalizedSettings,
    deletedLinksCount: cleanNumber(data.deletedLinksCount ?? data.deleted_links_count ?? 0, 0)
  };
}

  // --- DATABASE EXPORT & RESTORE ENDPOINTS ---
  
  // Standard JSON export (legacy API route)
  app.get("/api/admin/export-db", requireAdmin, (req, res) => {
    const db = loadDb();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=tglinks_database_${Date.now()}.json`);
    res.json(db);
  });

  // Direct Stream Download Endpoint for large databases (>25MB handling via streaming / Gzip)
  app.get("/api/admin/export-db-download", (req, res) => {
    try {
      // Authenticate via Bearer header or URL token query param for cURL / external cron support
      const token = (req.query.token as string) || (req.headers.authorization ? req.headers.authorization.replace("Bearer ", "") : "");
      if (!token) {
        return res.status(401).send("Authentication token required.");
      }

      const db = loadDb();
      const user = db.users.find((u: any) => u.id === token && u.role === "admin" && !u.banned);
      if (!user) {
        return res.status(403).send("Admin privilege required.");
      }

      const format = String(req.query.format || "gz").toLowerCase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      if (format === "gz" || format === "gzip") {
        // Gzip compression reduces 25MB+ JSON down to ~1.5MB - 3MB!
        const rawJsonString = JSON.stringify(db, null, 2);
        const compressedBuffer = zlib.gzipSync(Buffer.from(rawJsonString, "utf-8"));

        res.setHeader("Content-Type", "application/gzip");
        res.setHeader("Content-Disposition", `attachment; filename=tglinks_database_${timestamp}.json.gz`);
        res.setHeader("Content-Length", compressedBuffer.length);
        return res.end(compressedBuffer);
      } else {
        // Direct stream download of raw JSON file
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename=tglinks_database_${timestamp}.json`);

        if (fs.existsSync(DB_FILE)) {
          const readStream = fs.createReadStream(DB_FILE);
          return readStream.pipe(res);
        } else {
          return res.send(JSON.stringify(db, null, 2));
        }
      }
    } catch (err: any) {
      console.error("[Export DB Download] Stream error:", err);
      return res.status(500).send("Failed to stream database export.");
    }
  });

  // Instant SMTP Email Backup Trigger Endpoint
  app.post("/api/admin/trigger-email-backup", requireAdmin, async (req, res) => {
    try {
      const db = loadDb();
      const settings = db.settings || {};
      const result = await sendEmailBackup(settings, true);
      if (result.success) {
        res.json({ success: true, message: "Compressed database backup (.json.gz) emailed successfully via SMTP!" });
      } else {
        res.status(500).json({ success: false, error: result.error || "Failed to send email backup." });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Failed to trigger email backup." });
    }
  });

  app.post("/api/admin/restore-db", requireAdmin, (req, res) => {
    try {
      const { fileData, fileName, jsonText } = req.body || {};
      let rawString = "";

      if (jsonText && typeof jsonText === "string" && jsonText.trim()) {
        rawString = jsonText.trim();
      } else if (fileData && typeof fileData === "string") {
        let base64Content = fileData;
        if (base64Content.includes(";base64,")) {
          base64Content = base64Content.split(";base64,")[1];
        }
        const buffer = Buffer.from(base64Content, "base64");

        // Check if file is gzip compressed (.json.gz or gzip magic bytes 0x1f 0x8b)
        let isGzip = (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b);
        if (fileName && fileName.endsWith(".gz")) {
          isGzip = true;
        }

        if (isGzip) {
          try {
            rawString = zlib.gunzipSync(buffer).toString("utf-8");
          } catch (gzErr) {
            console.warn("[Restore DB] Gunzip failed, trying raw UTF-8 string:", gzErr);
            rawString = buffer.toString("utf-8");
          }
        } else {
          rawString = buffer.toString("utf-8");
        }
      } else {
        return res.status(400).json({ error: "No backup file data or JSON string provided." });
      }

      if (!rawString) {
        return res.status(400).json({ error: "Extracted database backup content is empty." });
      }

      // Normalize and migrate database from any legacy format
      const migratedDb = normalizeAndMigrateDatabase(rawString);

      // Save database to memory and disk
      saveDb(migratedDb);

      const usersCount = migratedDb.users.length;
      const linksCount = migratedDb.links.length;
      const clicksCount = migratedDb.clicksLog.length;

      console.log(`[Restore DB] Successfully restored and migrated database! Users: ${usersCount}, Links: ${linksCount}, Clicks: ${clicksCount}`);

      return res.json({
        success: true,
        message: `Database restored & migrated successfully! Loaded ${usersCount} users, ${linksCount} links, and ${clicksCount} click logs.`,
        summary: {
          usersCount,
          linksCount,
          clicksCount
        }
      });
    } catch (err: any) {
      console.error("[Restore DB] Error restoring database:", err);
      return res.status(500).json({ error: err.message || "Failed to restore database backup." });
    }
  });

  // --- EXTERNAL ADLINKFLY SHORTENERS ENDPOINTS ---
  
  app.get("/api/admin/external-shorteners", requireAdmin, (req, res) => {
    const db = loadDb();
    res.json({ shorteners: db.adFlyShorteners || [] });
  });

  app.post("/api/admin/external-shorteners", requireAdmin, (req, res) => {
    const { id, name, apiUrl, apiToken, enabled, priority, isFaucetApi } = req.body;
    const db = loadDb();

    if (!db.adFlyShorteners) db.adFlyShorteners = [];

    if (id) {
      // Edit mode
      const idx = db.adFlyShorteners.findIndex((api: any) => api.id === id);
      if (idx !== -1) {
        db.adFlyShorteners[idx] = {
          ...db.adFlyShorteners[idx],
          name,
          apiUrl,
          apiToken,
          enabled,
          priority: Number(priority || 0),
          isFaucetApi: !!isFaucetApi
        };
      } else {
        return res.status(404).json({ error: "AdLinkFly API configuration not found" });
      }
    } else {
      // Add mode
      const newApi: AdFlyShortener = {
        id: "api-" + Math.random().toString(36).substring(2, 9),
        name,
        apiUrl,
        apiToken,
        enabled: enabled !== undefined ? enabled : true,
        priority: Number(priority || 0),
        isFaucetApi: !!isFaucetApi
      };
      db.adFlyShorteners.push(newApi);
    }

    saveDb(db);
    res.json({ success: true, shorteners: db.adFlyShorteners });
  });

  app.delete("/api/admin/external-shorteners/:id", requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = loadDb();

    if (!db.adFlyShorteners) db.adFlyShorteners = [];

    const idx = db.adFlyShorteners.findIndex((api: any) => api.id === id);
    if (idx === -1) return res.status(404).json({ error: "AdLinkFly API configuration not found" });

    db.adFlyShorteners.splice(idx, 1);
    saveDb(db);
    res.json({ success: true, shorteners: db.adFlyShorteners });
  });

  app.post("/api/admin/external-shorteners/reorder", requireAdmin, (req, res) => {
    const { shorteners } = req.body;
    if (!Array.isArray(shorteners)) {
      return res.status(400).json({ error: "Invalid shorteners list format" });
    }
    const db = loadDb();
    db.adFlyShorteners = shorteners;
    saveDb(db);
    res.json({ success: true, shorteners: db.adFlyShorteners });
  });


  // --- VITE MIDDLEWARE HANDLING ---
  
  if (process.env.NODE_ENV !== "production") {
    import("vite").then(({ createServer: createViteServer }) => {
      createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      }).then((vite) => {
        app.use(vite.middlewares);
      }).catch(err => {
        console.error("Vite server error:", err);
      });
    }).catch(err => {
      console.error("Failed to dynamically import Vite:", err);
    });
  } else if (process.env.VERCEL !== "1") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[TG Links] Server booting up on http://0.0.0.0:${PORT}`);
      startEmailBackupScheduler();
    });
  }
}

// Synchronously setup routes on the app object
setupRoutes();

export default app;
