import express from "express";
import path from "path";
import fs from "fs";

import { 
  User, 
  Link, 
  AdFlyShortener, 
  ClickLog, 
  Withdrawal, 
  SystemSettings 
} from "./src/types";

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "data.json");
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
  const forwardedHost = req.headers["x-forwarded-host"];
  if (forwardedHost) {
    if (Array.isArray(forwardedHost)) {
      return forwardedHost[0];
    }
    return forwardedHost.split(",")[0].trim();
  }
  return req.get("host") || "arolinks.com";
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

// Helper to syndicate a link with an external AdLinkFly shortener API dynamically
async function getExternalShortenedUrl(originalUrl: string, db: any): Promise<{ id: string; url: string } | null> {
  const enabledApis = (db.adFlyShorteners || []).filter((api: any) => api.enabled);
  if (enabledApis.length === 0) return null;

  // Sort by priority descending (highest priority first). If equal, randomize order slightly
  const sortedApis = [...enabledApis].sort((a: any, b: any) => {
    const pA = Number(a.priority || 0);
    const pB = Number(b.priority || 0);
    if (pB !== pA) {
      return pB - pA;
    }
    return 0.5 - Math.random();
  });

  const fetchFn = typeof globalThis.fetch === "function" 
    ? globalThis.fetch 
    : async (...args: any[]) => {
        const { default: f } = await import("node-fetch");
        return (f as any)(...args);
      };

  for (const selectedApi of sortedApis) {
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
      const apiRequestUrl = `${cleanApiUrl}?api=${selectedApi.apiToken}&url=${encodeURIComponent(originalUrl)}`;

      // Use AbortController for a standard 8 seconds timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetchFn(apiRequestUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      const text = await response.text();
      let shortenedUrl = "";

      try {
        const json = JSON.parse(text);
        if (json) {
          if (json.status === "success" || json.shortenedUrl || json.url) {
            shortenedUrl = json.shortenedUrl || json.url || "";
          }
        }
      } catch (e) {
        // Not valid JSON, check if the response body itself is a plain-text URL
        const trimmedText = text.trim();
        if (/^https?:\/\//i.test(trimmedText)) {
          shortenedUrl = trimmedText;
        }
      }

      if (shortenedUrl) {
        return { id: selectedApi.id, url: shortenedUrl };
      } else {
        console.warn(`External shortener API ${selectedApi.name} returned an unrecognized or empty response:`, text);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.error(`Failed to syndicate with external shortener API ${selectedApi.name} (Request Timeout)`);
      } else {
        console.error(`Failed to syndicate with external shortener API ${selectedApi.name}:`, err);
      }
    }
  }
  return null;
}

// Helper to load/save database
function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    // Initial Seed Data
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
        neonTodayAdCode: `<iframe scrolling="no" src="https://neon.today/show/surf/21651" style="width: 100%; height: 250px; padding: 0; border: 1px dotted grey;" frameborder="0"></iframe>`
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
    return initialDb;
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  let changed = false;
  
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
  }

  db.users = db.users.map((u: any) => {
    if (!u.apiToken) {
      u.apiToken = generateApiToken();
      changed = true;
    }
    return u;
  });
  if (changed) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }
  return db;
}

function saveDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  app.set("trust proxy", true);

  // Enable dynamic Cross-Origin Resource Sharing (CORS) for external static hosts (like Cloudflare Pages)
  app.use((req, res, next) => {
    const origin = req.headers.origin || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json());

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

  // --- AUTH ENDPOINTS ---
  
  app.post("/api/auth/register", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const db = loadDb();
    const existing = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
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

    const { password: _, ...userSafe } = newUser;
    res.json({ user: userSafe });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const db = loadDb();
    const user = db.users.find(
      (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    if (user.banned) {
      return res.status(403).json({ error: "This account has been banned" });
    }

    const { password: _, ...userSafe } = user;
    res.json({ user: userSafe });
  });

  app.get("/api/auth/me", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    res.json({ user });
  });

  // --- DEVELOPER PROGRAMMATIC SHORTENING API (GET) ---
  app.get("/api", async (req, res) => {
    const { api, url, alias, format } = req.query;

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

    const originalUrl = String(url);

    // Generate unique short code
    let code = "";
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let isUnique = false;

    const aliasStr = alias ? String(alias).trim() : "";
    if (aliasStr) {
      if (aliasStr.length < 3) {
        if (format === "text") return res.status(400).send("");
        return res.status(400).json({ status: "error", message: "Custom alias must be at least 3 characters" });
      }
      const alreadyExists = db.links.some((l: any) => l.code.toLowerCase() === aliasStr.toLowerCase());
      if (alreadyExists) {
        if (format === "text") return res.status(400).send("");
        return res.status(400).json({ status: "error", message: "Custom alias already exists" });
      }
      code = aliasStr;
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

    const external = await getExternalShortenedUrl(intermediateUrl, db);
    if (external) {
      adFlyShortenerId = external.id;
      adFlyShortenedUrl = external.url;
    }

    const newLink: Link = {
      id: "l-" + Math.random().toString(36).substring(2, 9),
      code,
      originalUrl,
      userId: user.id,
      userEmail: user.email,
      cpm: linkCpm,
      clicks: 0,
      earnings: 0.0,
      createdAt: new Date().toISOString(),
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

    if (format === "json") {
      return res.json({
        status: "success",
        shortenedUrl: shortenedUrl
      });
    }

    return res.redirect(shortenedUrl);
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
    const totalLinks = db.links.length;
    const totalClicks = db.clicksLog.length;
    res.json({
      totalUsers,
      totalLinks,
      totalClicks,
      globalCpm: db.settings.globalCpm || 5.0
    });
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

    const external = await getExternalShortenedUrl(intermediateUrl, db);
    if (external) {
      adFlyShortenerId = external.id;
      adFlyShortenedUrl = external.url;
    }

    const newLink: Link = {
      id: "l-" + Math.random().toString(36).substring(2, 9),
      code,
      originalUrl,
      userId: userId || "guest",
      userEmail: user ? user.email : "guest",
      cpm: linkCpm,
      clicks: 0,
      earnings: 0.0,
      createdAt: new Date().toISOString(),
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

    db.links.splice(linkIdx, 1);
    saveDb(db);
    res.json({ success: true });
  });

  // --- REDIRECTION & CLICKS PORTAL ---
  
  app.get("/api/links/resolve/:code", (req, res) => {
    const { code } = req.params;
    const db = loadDb();
    const link = db.links.find((l: any) => l.code === code && l.status === "active");

    if (!link) {
      return res.status(404).json({ error: "Shortened link not found or suspended" });
    }

    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: "This shortened link has expired and is no longer available." });
    }

    // Include ad configs in resolution
    res.json({ 
      link: {
        code: link.code,
        originalUrl: link.originalUrl,
        adFlyShortenedUrl: link.adFlyShortenedUrl,
        adFlyShortenerId: link.adFlyShortenerId,
        cpm: getCurrentCpmForLink(link, db),
        userId: link.userId
      },
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
        neonTodayAdCode: db.settings.neonTodayAdCode
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

    if (link.status === "suspended") {
      return res.status(403).json({ error: "Link has been suspended" });
    }

    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: "This shortened link has expired and is no longer active." });
    }

    // Check for IP click spam: 1 view reward per IP per day across the platform
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const hasPaidClickInLast24h = db.clicksLog.some(
      (c: any) => {
        let loggedIp = c.ip;
        if (typeof loggedIp === "string" && loggedIp.includes(",")) {
          loggedIp = loggedIp.split(",")[0].trim();
        }
        return loggedIp === ip && c.timestamp > twentyFourHoursAgo && c.earning > 0;
      }
    );

    const currentCpm = getCurrentCpmForLink(link, db);
    const earningAmount = hasPaidClickInLast24h ? 0 : (currentCpm / 1000);

    // Save click log
    const clickId = "c-" + Math.random().toString(36).substring(2, 9);
    const click: ClickLog = {
      id: clickId,
      linkId: link.id,
      userId: link.userId,
      timestamp: new Date().toISOString(),
      ip: String(ip),
      earning: earningAmount,
      country: "Global"
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

    // Dynamically retrieve the external shortened URL at click time if not set but external APIs are active
    let adFlyShortenedUrl = link.adFlyShortenedUrl;
    if (!adFlyShortenedUrl) {
      const protocol = getRequestProtocol(req);
      const host = getRequestHost(req);
      const intermediateUrl = `${protocol}://${host}/go-final/${link.code}`;
      const external = await getExternalShortenedUrl(intermediateUrl, db);
      if (external) {
        adFlyShortenedUrl = external.url;
        link.adFlyShortenedUrl = external.url;
        link.adFlyShortenerId = external.id;
      }
    }

    saveDb(db);

    res.json({ 
      success: true, 
      originalUrl: link.originalUrl,
      adFlyShortenedUrl: adFlyShortenedUrl,
      payoutCredited: earningAmount > 0 
    });
  });

  // --- EXTERNAL SHORTENER CALLBACK AND LANDING ENDPOINT ---
  app.get("/go-final/:code", async (req, res) => {
    const { code } = req.params;
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

    // Check for IP click spam: 1 view reward per IP per day across the platform
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const hasPaidClickInLast24h = db.clicksLog.some(
      (c: any) => {
        let loggedIp = c.ip;
        if (typeof loggedIp === "string" && loggedIp.includes(",")) {
          loggedIp = loggedIp.split(",")[0].trim();
        }
        return loggedIp === ip && c.timestamp > twentyFourHoursAgo && c.earning > 0;
      }
    );

    const currentCpm = getCurrentCpmForLink(link, db);
    const earningAmount = hasPaidClickInLast24h ? 0 : (currentCpm / 1000);

    // Save click log
    const clickId = "c-" + Math.random().toString(36).substring(2, 9);
    const click: ClickLog = {
      id: clickId,
      linkId: link.id,
      userId: link.userId,
      timestamp: new Date().toISOString(),
      ip: String(ip),
      earning: earningAmount,
      country: "Global"
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

    // Ensure URL has protocol
    let targetUrl = link.originalUrl;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    res.redirect(targetUrl);
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
    const todayStr = now.toISOString().split("T")[0];
    const currentMonthStr = todayStr.substring(0, 7);

    // 1. Calculate today's stats
    let todayViews = 0;
    let todayEarnings = 0;
    // 2. Calculate current month's stats
    let monthViews = 0;
    let monthEarnings = 0;

    userClicks.forEach((c: any) => {
      const clickDate = c.timestamp.split("T")[0];
      const clickMonth = clickDate.substring(0, 7);

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
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split("T")[0];
      dailyReportsMap.set(dateString, { views: 0, earnings: 0 });
    }

    userClicks.forEach((c: any) => {
      const dateString = c.timestamp.split("T")[0];
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
      const monthString = d.toISOString().substring(0, 7);
      monthlyReportsMap.set(monthString, { views: 0, earnings: 0 });
    }

    userClicks.forEach((c: any) => {
      const monthString = c.timestamp.substring(0, 7);
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
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split("T")[0];
      dailyStatsMap.set(dateString, { views: 0, earnings: 0 });
    }

    userClicks.forEach((c: any) => {
      const dateString = c.timestamp.split("T")[0];
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

    const { password: _, ...userSafe } = user;
    res.json({ success: true, user: userSafe });
  });

  // --- ADMIN PANEL SECURE ROUTES ---
  
  // Guard middleware for Admin
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = getAuthUser(req);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin privilege required" });
    }
    next();
  };

  app.get("/api/admin/stats", requireAdmin, (req, res) => {
    const db = loadDb();
    
    const totalUsers = db.users.length;
    const totalLinks = db.links.length;
    const totalViews = db.clicksLog.length;
    
    const systemEarnings = db.clicksLog.reduce((acc: number, c: any) => acc + c.earning, 0);
    const pendingWithdrawal = db.withdrawals
      .filter((w: any) => w.status === "pending")
      .reduce((acc: number, w: any) => acc + w.amount, 0);

    res.json({
      totalUsers,
      totalLinks,
      totalViews,
      systemEarnings: Number(systemEarnings.toFixed(4)),
      pendingWithdrawal: Number(pendingWithdrawal.toFixed(2))
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
    const { role, balance, customCpm, banned } = req.body;
    const db = loadDb();

    const user = db.users.find((u: any) => u.id === id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (role !== undefined) user.role = role;
    if (balance !== undefined) user.balance = Number(balance);
    if (customCpm !== undefined) user.customCpm = customCpm === null ? undefined : Number(customCpm);
    if (banned !== undefined) user.banned = banned;

    saveDb(db);
    const { password: _, ...userSafe } = user;
    res.json({ success: true, user: userSafe });
  });

  app.delete("/api/admin/users/:id", requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = loadDb();
    const userIdx = db.users.findIndex((u: any) => u.id === id);
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
    res.json({ withdrawals: db.withdrawals });
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
    res.json({ success: true, withdrawal });
  });

  app.get("/api/admin/settings", requireAdmin, (req, res) => {
    const db = loadDb();
    res.json({ settings: db.settings });
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

  // --- EXTERNAL ADLINKFLY SHORTENERS ENDPOINTS ---
  
  app.get("/api/admin/external-shorteners", requireAdmin, (req, res) => {
    const db = loadDb();
    res.json({ shorteners: db.adFlyShorteners || [] });
  });

  app.post("/api/admin/external-shorteners", requireAdmin, (req, res) => {
    const { id, name, apiUrl, apiToken, enabled, priority } = req.body;
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
          priority: Number(priority || 0)
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
        priority: Number(priority || 0)
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


  // --- VITE MIDDLEWARE HANDLING ---
  
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[TG Links] Server booting up on http://0.0.0.0:${PORT}`);
    });
  }
}

if (process.env.VERCEL !== "1") {
  startServer();
}

export default app;
