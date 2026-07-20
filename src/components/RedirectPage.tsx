import React, { useState, useEffect, useRef } from "react";
import { fetchApi } from "../lib/api";
import { AlertCircle, ShieldAlert, Sparkles, CheckCircle, ArrowRight, Hourglass, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

const ensureAbsoluteUrl = (url: string) => {
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    return "https://" + url;
  }
  return url;
};

const redirectWithoutReferrer = (url: string) => {
  const target = ensureAbsoluteUrl(url);
  if (!target) return;
  
  try {
    const meta = document.createElement("meta");
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.getElementsByTagName("head")[0].appendChild(meta);
  } catch (e) {
    console.error("Failed to inject referrer meta tag", e);
  }

  const a = document.createElement("a");
  a.href = target;
  a.rel = "noreferrer";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    window.location.href = target;
  }, 100);
};

interface RedirectPageProps {
  code: string;
}

export default function RedirectPage({ code }: RedirectPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [linkData, setLinkData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  
  // Redirection stepper state
  const [currentStep, setCurrentStep] = useState(1);
  const [timer, setTimer] = useState(10);
  const [isTimerFinished, setIsTimerFinished] = useState(false);
  const [verifiedHuman, setVerifiedHuman] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaPrompt, setCaptchaPrompt] = useState({ q: "", a: 0 });
  const [captchaError, setCaptchaError] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  
  // Neon.today click detection state
  const [isHoveringNeonAd, setIsHoveringNeonAd] = useState(false);
  const [adClicked, setAdClicked] = useState(false);
  const adContainerRef = useRef<HTMLDivElement>(null);

  const countdownInterval = useRef<any>(null);

  // Security Checks State
  const [checkingSecurity, setCheckingSecurity] = useState(true);
  const [adBlockerDetected, setAdBlockerDetected] = useState(false);
  const [vpsDetected, setVpsDetected] = useState(false);
  const [vpsDetails, setVpsDetails] = useState<any>(null);

  // High Security Ad Blocker Detection
  const runAdBlockerCheck = async (): Promise<boolean> => {
    // Method 1: Dynamic element with standard blocked class list
    const testElement = document.createElement("div");
    testElement.id = "wrapfabtest";
    testElement.className = "ad-box adsbox ad-banner ad-placement sponsored-post ad-ad-banner google-ad header-ads pub_300x250";
    testElement.setAttribute(
      "style",
      "position: absolute !important; left: -9999px !important; top: -9999px !important; width: 1px !important; height: 1px !important; display: block !important;"
    );
    
    document.body.appendChild(testElement);
    await new Promise((resolve) => setTimeout(resolve, 80));
    
    const isBlocked = 
      testElement.offsetHeight === 0 || 
      testElement.offsetWidth === 0 || 
      testElement.clientHeight === 0 || 
      testElement.clientWidth === 0 || 
      window.getComputedStyle(testElement).display === "none" ||
      window.getComputedStyle(testElement).visibility === "hidden";
      
    document.body.removeChild(testElement);
    if (isBlocked) return true;

    // Method 2: Attempt standard Google Ads network script connection
    try {
      await fetch(
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
        { method: "HEAD", mode: "no-cors", cache: "no-store" }
      );
    } catch (e) {
      return true; // Connection blocked or intercepted
    }

    // Method 3: Brave Browser shields check
    if ((navigator as any).brave && typeof (navigator as any).brave.isBrave === "function") {
      try {
        const isBrave = await (navigator as any).brave.isBrave();
        if (isBrave) return true;
      } catch (e) {}
    }

    return false;
  };

  // High Security VPS, VPN, and Proxy Detection
  const runVpsVpnCheck = async () => {
    const hostingKeywords = [
      "amazon", "aws", "google", "cloud", "digitalocean", "digital ocean", "hetzner", "ovh", "linode", "vultr",
      "microsoft", "azure", "contabo", "leaseweb", "m247", "zenlayer", "colocation", "datacenter", "data center",
      "hosting", "server", "vps", "vpn", "proxy", "choopa", "fastly", "cloudflare", "quadranet", "softlayer",
      "interserver", "liquidweb", "hostgator", "bluehost", "godaddy", "i3d", "scaleway", "cogent",
      "packet", "equinix", "tatacomm", "akamai", "ipvolume", "colocrossing", "psychz", "ramnode", "buyvm",
      "frantech", "hostkey", "webazilla", "melbikomas", "ovh sas", "as14061"
    ];

    let ip = "";
    let isp = "";
    let org = "";
    let isVpnOrProxy = false;
    let providerInfo = "";

    try {
      const res = await fetch("https://ipwho.is/");
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          ip = data.ip || "";
          isp = data.connection?.isp || "";
          org = data.connection?.org || "";
          if (data.security && (data.security.vpn || data.security.proxy || data.security.tor || data.security.relay)) {
            isVpnOrProxy = true;
            providerInfo = [
              data.security.vpn ? "VPN" : "",
              data.security.proxy ? "Proxy" : "",
              data.security.tor ? "Tor" : "",
              data.security.relay ? "Relay" : ""
            ].filter(Boolean).join(", ");
          }
        }
      }
    } catch (e) {}

    if (!ip) {
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (res.ok) {
          const data = await res.json();
          ip = data.ip || "";
          isp = data.org || "";
          org = data.asn || "";
        }
      } catch (e) {}
    }

    const testText = `${isp} ${org}`.toLowerCase();
    const matched = hostingKeywords.find(kw => testText.includes(kw));
    if (matched) {
      isVpnOrProxy = true;
      providerInfo = `Hosting/VPS Provider (${matched.toUpperCase()})`;
    }

    return {
      isVpnOrProxy,
      ip: ip || "Unresolved IP",
      isp: isp || "Private ISP",
      org: org || "Private ASN",
      providerInfo: providerInfo || "Proxy Tunnel"
    };
  };

  // Helper to execute any javascript tags embedded in HTML ad codes
  const runEmbeddedScripts = (htmlCode: string) => {
    if (!htmlCode) return;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlCode, "text/html");
      const scripts = doc.querySelectorAll("script");
      scripts.forEach((script) => {
        const newScript = document.createElement("script");
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        document.body.appendChild(newScript);
      });
    } catch (e) {
      console.error("Failed to run embedded ad script tags:", e);
    }
  };

  // 1. Resolve Link, Settings & Run Security Auditing
  useEffect(() => {
    let active = true;

    const initializeAndVerify = async () => {
      setCheckingSecurity(true);

      // Perform parallel scans
      const [isAdBlockActive, vpnResult] = await Promise.all([
        runAdBlockerCheck(),
        runVpsVpnCheck()
      ]);

      if (!active) return;

      if (isAdBlockActive) {
        setAdBlockerDetected(true);
      }
      if (vpnResult.isVpnOrProxy) {
        setVpsDetected(true);
        setVpsDetails(vpnResult);
      }

      setCheckingSecurity(false);

      // Resolve shortened endpoint details
      try {
        const res = await fetchApi(`/links/resolve/${code}`);
        if (!active) return;

        setLinkData(res.link);
        setSettings(res.settings);
        setLoading(false);

        // Run popunder & global header scripts
        if (res.settings?.popunderCode) {
          runEmbeddedScripts(res.settings.popunderCode);
        }
        if (res.settings?.globalHeaderCode) {
          runEmbeddedScripts(res.settings.globalHeaderCode);
        }

        // Setup mathematical captcha
        const num1 = Math.floor(Math.random() * 9) + 2;
        const num2 = Math.floor(Math.random() * 8) + 2;
        setCaptchaPrompt({
          q: `What is ${num1} + ${num2}?`,
          a: num1 + num2
        });

        // Fast immediate redirection if own ads are disabled AND no security locks triggered
        if (!res.settings?.enableOwnAds && !isAdBlockActive && !vpnResult.isVpnOrProxy) {
          setRedirecting(true);
          if (res.link?.adFlyShortenedUrl) {
            redirectWithoutReferrer(res.link.adFlyShortenedUrl);
          } else {
            try {
              const clickRes = await fetchApi("/links/click", {
                method: "POST",
                body: JSON.stringify({ code })
              });
              redirectWithoutReferrer(clickRes.originalUrl);
            } catch {
              redirectWithoutReferrer(res.link.originalUrl);
            }
          }
        }
      } catch (err: any) {
        if (!active) return;
        setError(err.message || "This link could not be resolved. It might be expired, disabled, or suspended.");
        setLoading(false);
      }
    };

    initializeAndVerify();

    return () => {
      active = false;
    };
  }, [code]);

  // Iframe click detection through window blur and element focus analysis
  useEffect(() => {
    const isFocusOnAdIframe = () => {
      if (!adContainerRef.current) return false;
      const activeEl = document.activeElement;
      if (!activeEl) return false;
      
      // Check if the focused element is an iframe inside our container
      if (activeEl.tagName === "IFRAME") {
        return adContainerRef.current.contains(activeEl);
      }
      return false;
    };

    const handleBlur = () => {
      // If the user clicked our ad, it would trigger a blur or have the iframe focused
      if (isHoveringNeonAd || isFocusOnAdIframe()) {
        setAdClicked(true);
      }
    };

    const focusCheckInterval = setInterval(() => {
      if (isFocusOnAdIframe()) {
        setAdClicked(true);
      }
    }, 200);

    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
      clearInterval(focusCheckInterval);
    };
  }, [isHoveringNeonAd]);

  // 2. Timer management
  useEffect(() => {
    if (loading || error || redirecting || !settings || !settings.enableOwnAds) return;

    setIsTimerFinished(false);
    setTimer(10);

    if (countdownInterval.current) clearInterval(countdownInterval.current);

    countdownInterval.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setIsTimerFinished(true);
          if (countdownInterval.current) clearInterval(countdownInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [currentStep, loading, error, settings, redirecting]);

  const verifyCaptcha = (e: React.FormEvent) => {
    e.preventDefault();
    setCaptchaError(false);
    if (parseInt(captchaAnswer) === captchaPrompt.a) {
      setVerifiedHuman(true);
    } else {
      setCaptchaError(true);
      setCaptchaAnswer("");
    }
  };

  const handleNextStep = async () => {
    if (!isTimerFinished || !verifiedHuman) return;
    if (settings?.enableNeonAdGate && !adClicked) return;

    // Real-time security recheck before forwarding
    const isAdBlockActive = await runAdBlockerCheck();
    if (isAdBlockActive) {
      setAdBlockerDetected(true);
      return;
    }

    const vpnResult = await runVpsVpnCheck();
    if (vpnResult.isVpnOrProxy) {
      setVpsDetected(true);
      setVpsDetails(vpnResult);
      return;
    }

    const maxSteps = settings?.adPagesCount || 1;
    if (currentStep < maxSteps) {
      // Advance step
      setCurrentStep(currentStep + 1);
      setVerifiedHuman(false);
      setAdClicked(false); // Reset clicked state for the next step!
      setCaptchaAnswer("");
      // Refresh captcha
      const num1 = Math.floor(Math.random() * 8) + 3;
      const num2 = Math.floor(Math.random() * 9) + 2;
      setCaptchaPrompt({
        q: `What is ${num1} + ${num2}?`,
        a: num1 + num2
      });
    } else {
      // Final step: Get Link!
      setRedirecting(true);
      if (linkData?.adFlyShortenedUrl) {
        redirectWithoutReferrer(linkData.adFlyShortenedUrl);
      } else {
        try {
          const res = await fetchApi("/links/click", {
            method: "POST",
            body: JSON.stringify({ code })
          });
          redirectWithoutReferrer(res.originalUrl);
        } catch (err) {
          redirectWithoutReferrer(linkData.originalUrl);
        }
      }
    }
  };

  if (loading || checkingSecurity) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <img src="/logo.svg" alt="TG Links Logo" className="w-16 h-16 object-contain rounded-2xl mb-4 shadow-lg shadow-indigo-500/10 animate-pulse" referrerPolicy="no-referrer" />
        <h2 className="text-xl font-bold">TG Links Security Gateway...</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Securing destination endpoint parameters, performing IP integrity sweeps, and checking browser security parameters. Please wait.
        </p>
      </div>
    );
  }

  if (adBlockerDetected) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 mb-6 animate-pulse">
          <ShieldAlert className="w-16 h-16" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">Ad Blocker Detected!</h2>
        <p className="text-sm text-slate-400 max-w-md mt-3 leading-relaxed">
          We have detected that you are using an ad-blocking extension or a browser with built-in ad shielding (like Brave Shields, uBlock Origin, or AdBlock Plus).
        </p>
        
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 max-w-md w-full mt-6 text-left space-y-4">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider text-center border-b border-slate-800 pb-2">How to continue:</h3>
          <ul className="text-xs text-slate-400 space-y-2.5 list-decimal pl-4">
            <li>Click on your Ad Blocker extension icon in your browser toolbar.</li>
            <li>Select <span className="text-emerald-400 font-bold">"Disable on this site"</span> or toggle the power button to turn off shields.</li>
            <li>If using <span className="font-bold text-indigo-400">Brave Browser</span>, click the orange shield icon next to the address bar and turn Shields off.</li>
            <li>Once disabled, click the <span className="text-white font-semibold">"Check Again & Refresh"</span> button below.</li>
          </ul>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={() => { window.location.reload(); }}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-indigo-900/40 transition flex items-center gap-2"
          >
            Check Again & Refresh
          </button>
          <button
            onClick={() => { window.location.href = "/"; }}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-sm rounded-xl transition"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (vpsDetected) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 mb-6">
          <ShieldAlert className="w-16 h-16" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">Access Denied: VPN / Proxy Detected</h2>
        <p className="text-sm text-slate-400 max-w-md mt-3 leading-relaxed">
          Our high-security firewall has restricted access to this link because your connection originates from a VPN, VPS, or hosting/data center network.
        </p>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 max-w-md w-full mt-6 text-left space-y-3 font-mono text-xs">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider text-center border-b border-slate-800 pb-2 font-sans">Connection Parameters</h3>
          <div className="flex justify-between py-1 border-b border-slate-800/40">
            <span className="text-slate-500">IP Address:</span>
            <span className="text-rose-400 font-bold select-all">{vpsDetails?.ip}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/40">
            <span className="text-slate-500">ISP / Provider:</span>
            <span className="text-slate-300 text-right truncate max-w-[200px]" title={vpsDetails?.isp}>{vpsDetails?.isp}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/40">
            <span className="text-slate-500">Classification:</span>
            <span className="text-amber-400 font-bold">{vpsDetails?.providerInfo || "Non-Residential Network"}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Security Rule:</span>
            <span className="text-rose-500 font-bold uppercase">BLOCK_PROXY_TUNNEL</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-6 max-w-sm">
          Please disconnect from your VPN, VPS, or Proxy service and use a standard residential internet connection to access this URL.
        </p>

        <div className="flex gap-4 mt-8">
          <button
            onClick={() => { window.location.reload(); }}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-indigo-900/40 transition"
          >
            Try Again
          </button>
          <button
            onClick={() => { window.location.href = "/"; }}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-sm rounded-xl transition"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-black text-white">Shortened URL Resolution Failed</h2>
        <p className="text-sm text-slate-400 max-w-md mt-2">{error}</p>
        <button
          onClick={() => { window.location.href = "/"; }}
          className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow transition"
        >
          Return to Portal Home
        </button>
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <CheckCircle className="w-8 h-8 text-emerald-400 absolute inset-0 m-auto" />
        </div>
        <h2 className="text-2xl font-black text-white">Redirecting to Destination URL...</h2>
        <p className="text-sm text-emerald-400 font-medium mt-1">Securing connection routing protocols. Do not close this window.</p>
      </div>
    );
  }

  const hasMoreSteps = currentStep < (settings?.adPagesCount || 1);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 flex flex-col" id="redirect_root">
      
      {/* 728x90 TOP SPONSOR BANNER */}
      {settings?.bannerAd728x90 && (
        <div className="w-full bg-slate-900 border-b border-slate-850 py-4 flex justify-center px-4" id="banner_728x90">
          <div className="w-full max-w-4xl" dangerouslySetInnerHTML={{ __html: settings.bannerAd728x90 }} />
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Interactive Ads Portal */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 md:p-8 shadow-2xl backdrop-blur-md">
            {/* Redirection Header / Stepper */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <img src="/logo.svg" alt="TG Links Logo" className="w-12 h-12 object-contain rounded-xl shadow-lg" referrerPolicy="no-referrer" />
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950/40 border border-indigo-900/50 px-2.5 py-1 rounded-full">
                    Step {currentStep} of {settings?.adPagesCount || 1} Redirection Gates
                  </span>
                  <h2 className="text-xl font-black text-white mt-2">Redirection Portal Secured</h2>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">Security:</span>
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  SSL Guarded
                </span>
              </div>
            </div>

            {/* AD PORTAL MAIN INTERFACE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              
              {/* Redirection Box */}
              <div className="p-6 bg-slate-950 border border-slate-850 rounded-xl text-center space-y-5">
                <p className="text-sm text-slate-400 leading-normal">
                  Scroll down, complete the verification puzzle, and wait for the countdown to unlock the final shortened link.
                </p>

                {/* TIMER DIGITS */}
                <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="56" cy="56" r="48" stroke="#0f172a" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="56" 
                      cy="56" 
                      r="48" 
                      stroke={isTimerFinished ? "#34d399" : "#6366f1"} 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray="301.6"
                      strokeDashoffset={301.6 - (301.6 * timer) / 10}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-black text-white">{timer}s</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Countdown</span>
                  </div>
                </div>

                {/* CAPTCHA CHALLENGE FORM */}
                {!verifiedHuman && (
                  <form onSubmit={verifyCaptcha} className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">🔒 Anti-Bot Verification Challenge</p>
                    <p className="text-base font-black text-white tracking-wide">{captchaPrompt.q}</p>
                    
                    {captchaError && (
                      <p className="text-[10px] text-rose-500 font-bold">❌ Incorrect answer. Try again!</p>
                    )}

                    <div className="flex gap-2">
                      <input
                        required
                        type="number"
                        placeholder="Answer"
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-center text-white outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg uppercase transition"
                      >
                        Verify
                      </button>
                    </div>
                  </form>
                )}

                {/* VERIFIED STATUS */}
                {verifiedHuman && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-xs font-bold rounded-lg flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Human Verification Complete!
                  </div>
                )}

                {/* NEON.TODAY SPONSOR AD GATE */}
                {settings?.enableNeonAdGate && (
                  <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-3 mt-4 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        🎯 Sponsored Ad Verification
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${adClicked ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"}`}>
                        {adClicked ? "VERIFIED" : "CLICK AD TO UNLOCK"}
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Please click on the advertisement banner below to unlock your destination. Once clicked, you can instantly proceed.
                    </p>

                    <div 
                      ref={adContainerRef}
                      onMouseEnter={() => setIsHoveringNeonAd(true)}
                      onMouseLeave={() => setIsHoveringNeonAd(false)}
                      className={`relative bg-slate-950 rounded-lg overflow-hidden border transition-all p-1 flex justify-center items-center ${isHoveringNeonAd ? "border-indigo-500/80 shadow-md shadow-indigo-500/10" : "border-slate-800/80"}`}
                      dangerouslySetInnerHTML={{
                        __html: settings.neonTodayAdCode || `<iframe scrolling="no" src="https://neon.today/show/surf/21651" style="width: 100%; height: 250px; padding: 0; border: 1px dotted grey;" frameborder="0"></iframe>`
                      }}
                    />
                    
                    {adClicked && (
                      <p className="text-[11px] text-emerald-400 font-bold text-center mt-1 flex items-center justify-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Sponsored click verified! You can now continue.
                      </p>
                    )}
                  </div>
                )}

                {/* SUBMIT STEP BUTTON */}
                <button
                  disabled={!isTimerFinished || !verifiedHuman || (settings?.enableNeonAdGate && !adClicked)}
                  onClick={handleNextStep}
                  className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg transition-all duration-150 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white disabled:cursor-not-allowed"
                >
                  {!isTimerFinished ? (
                    `Please wait... ${timer}s`
                  ) : !verifiedHuman ? (
                    "Complete Puzzle Verification First"
                  ) : (settings?.enableNeonAdGate && !adClicked) ? (
                    "Click the Ad Below to Continue"
                  ) : hasMoreSteps ? (
                    <>
                      Proceed to Next Step
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Get Final Link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Tips Section */}
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl">
                  <h4 className="font-bold text-sm text-white mb-1">How to reach target?</h4>
                  <p className="text-xs text-slate-500 leading-normal space-y-1">
                    <span>1. Solve the sum of numbers displayed on the math puzzle panel.</span>
                    <br />
                    <span>2. Wait 10 seconds for the SSL validation check to conclude.</span>
                    {settings?.enableNeonAdGate && (
                      <>
                        <br />
                        <span className="text-amber-400 font-semibold">3. Click on the neon.today advertisement banner to verify.</span>
                      </>
                    )}
                    <br />
                    <span>{settings?.enableNeonAdGate ? "4. " : "3. "}Click on the illuminated continue button to advance.</span>
                  </p>
                </div>
                
                <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-indigo-400 text-xs leading-normal font-semibold">
                  ⚠️ <span className="font-bold">Notice to Visitors:</span> Ensure you have cookies enabled. Any programmatic automation or ad blocker extensions might freeze the timer. Disable ad-blockers to progress.
                </div>
              </div>
            </div>
          </div>

          {/* 320x50 MOBILE/BOTTOM BANNER */}
          {settings?.bannerAd320x50 && (
            <div className="w-full flex justify-center py-2" id="banner_320x50">
              <div dangerouslySetInnerHTML={{ __html: settings.bannerAd320x50 }} />
            </div>
          )}
        </div>

        {/* Right Column: 300x250 Sidebar Banner */}
        {settings?.bannerAd300x250 && (
          <div className="lg:col-span-4 bg-slate-900/40 rounded-2xl border border-slate-800 p-6 flex flex-col justify-center items-center shadow-xl backdrop-blur-md" id="banner_300x250">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block text-center">SPONSOR ADVERTISEMENT</span>
            <div className="w-full" dangerouslySetInnerHTML={{ __html: settings.bannerAd300x250 }} />
          </div>
        )}
      </div>

      {/* PTP PAID-TO-PROMOTE SPONSOR AREA (at the very bottom of the page after all continue options and banners) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-8" id="ptp_sponsor_area">
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800/60 pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Sponsored Premium Traffic Network</span>
          </div>
          <div className="w-full bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden shadow-inner">
            <iframe
              src="https://www.rotate4all.com/promote/pt13azaa9mf1"
              title="Sponsored Traffic Partner"
              className="w-full h-[600px] border-0"
              referrerPolicy="unsafe-url"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-3">
            This portal is secured by TG Links Redirection Network. Traffic verification is powered by Rotate4All platform. Do not close this window while the traffic is resolving.
          </p>
        </div>
      </div>

      {/* Footer copyright */}
      <footer className="bg-slate-950 text-slate-600 text-center py-6 border-t border-slate-900 text-xs">
        © 2026 {settings?.siteName || "TG Links"} Security Redirection Gateway. All rights reserved.
      </footer>
    </div>
  );
}
