import React, { useState, useEffect, useRef } from "react";
import { fetchApi } from "../lib/api";
import { AlertCircle, ShieldAlert, Sparkles, CheckCircle, ArrowRight, Hourglass, ShieldCheck, Play, Pause } from "lucide-react";
import { motion } from "motion/react";
import SiteLogo, { getCachedSettings } from "./SiteLogo";

const ensureAbsoluteUrl = (url: string) => {
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    return "https://" + url;
  }
  return url;
};

const redirectWithoutReferrer = (url: string, enableThunderRedirect?: boolean) => {
  const target = ensureAbsoluteUrl(url);
  if (!target) return;
  
  if (enableThunderRedirect) {
    window.location.href = `https://thunder-appz.eu.org/r?to=${encodeURIComponent(target)}`;
    return;
  }
  
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

const AdBlock = ({ 
  htmlCode, 
  placeholder,
  size = "300x250",
  className = ""
}: { 
  htmlCode?: string; 
  placeholder: string;
  size?: "300x250" | "728x90" | "300x600" | "320x50" | "468x60" | "auto";
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!htmlCode || !containerRef.current) return;
    
    // Clear old contents
    containerRef.current.innerHTML = "";
    
    try {
      const range = document.createRange();
      range.selectNode(containerRef.current);
      const documentFragment = range.createContextualFragment(htmlCode);
      containerRef.current.appendChild(documentFragment);
    } catch (e) {
      console.error("Failed to parse and execute ad HTML script block", e);
      containerRef.current.innerHTML = htmlCode;
    }
  }, [htmlCode]);

  let sizeContainerStyle = "min-h-[250px] w-full max-w-[300px]";
  let sizeLabel = "300x250 Medium Rectangle";

  if (size === "728x90") {
    sizeContainerStyle = "min-h-[90px] w-full max-w-[728px]";
    sizeLabel = "728x90 Leaderboard";
  } else if (size === "300x600") {
    sizeContainerStyle = "min-h-[600px] w-full max-w-[300px]";
    sizeLabel = "300x600 Half Page Skyscraper";
  } else if (size === "468x60") {
    sizeContainerStyle = "min-h-[60px] w-full max-w-[468px]";
    sizeLabel = "468x60 Banner";
  } else if (size === "320x50") {
    sizeContainerStyle = "min-h-[50px] w-full max-w-[320px]";
    sizeLabel = "320x50 Mobile Banner";
  }

  if (!htmlCode) {
    return (
      <div className={`bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl p-4 text-center select-none flex flex-col items-center justify-center space-y-2 shadow-2xl backdrop-blur-md relative overflow-hidden group hover:border-indigo-500/40 transition-all ${sizeContainerStyle} ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-emerald-500/5 opacity-50 group-hover:opacity-100 transition-opacity"></div>
        <span className="px-3 py-1 bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-[10px] font-black uppercase rounded-full tracking-widest shadow-sm relative z-10 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
          SPONSOR UNIT
        </span>
        <span className="text-white font-black text-sm uppercase tracking-wide relative z-10 drop-shadow">{placeholder}</span>
        <span className="text-[11px] font-mono text-emerald-400 font-bold bg-slate-900/90 px-2.5 py-0.5 rounded border border-slate-800 relative z-10">{sizeLabel}</span>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`overflow-hidden flex justify-center items-center rounded-2xl bg-slate-950/80 border border-slate-800 p-2 shadow-2xl ${sizeContainerStyle} ${className}`}
    />
  );
};

interface RedirectPageProps {
  code: string;
}

export default function RedirectPage({ code }: RedirectPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [linkData, setLinkData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(() => getCachedSettings());
  
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

  // Sponsored Premium Traffic Network Popup Modal State (triggers on page 2 when finished 12s)
  const [showPopupAd, setShowPopupAd] = useState(false);
  const [activePopupIndex, setActivePopupIndex] = useState<1 | 2>(1);
  const [popupTimer, setPopupTimer] = useState(12);
  const [popupTimerFinished, setPopupTimerFinished] = useState(false);
  const [popupClosed, setPopupClosed] = useState(false);
  const [popupHasBeenTriggered, setPopupHasBeenTriggered] = useState(false);

  // Offer Wall State
  const [offerCompleted, setOfferCompleted] = useState<boolean[]>([false, false, false, false]);
  const [activeOfferIndex, setActiveOfferIndex] = useState<number | null>(null);
  const [offerTimer, setOfferTimer] = useState<number>(10);
  const [offerTimerActive, setOfferTimerActive] = useState<boolean>(false);
  const [offerClicked, setOfferClicked] = useState<boolean[]>([false, false, false, false]);
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(document.hasFocus());
  const [justClicked, setJustClicked] = useState<boolean>(false);

  // Window Focus/Blur tracking for Offer Wall Timer pause/resume
  useEffect(() => {
    if (!settings?.enableOfferWall || currentStep !== 1) return;

    const handleWindowFocus = () => {
      setIsWindowFocused(true);
      if (!justClicked) {
        setOfferTimerActive(false);
      }
    };

    const handleWindowBlur = () => {
      setIsWindowFocused(false);
      if (activeOfferIndex !== null && !offerCompleted[activeOfferIndex] && offerClicked[activeOfferIndex]) {
        setOfferTimerActive(true);
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);

    const focusInterval = setInterval(() => {
      const hasFocus = document.hasFocus();
      setIsWindowFocused(hasFocus);
      
      if (hasFocus) {
        if (!justClicked) {
          setOfferTimerActive(false);
        }
      } else {
        if (activeOfferIndex !== null && !offerCompleted[activeOfferIndex] && offerClicked[activeOfferIndex]) {
          setOfferTimerActive(true);
        }
      }
    }, 400);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
      clearInterval(focusInterval);
    };
  }, [settings, currentStep, activeOfferIndex, offerCompleted, offerClicked, justClicked]);

  // Security Checks State
  const [checkingSecurity, setCheckingSecurity] = useState(true);
  const [adBlockerDetected, setAdBlockerDetected] = useState(false);
  const [vpsDetected, setVpsDetected] = useState(false);
  const [faucetLimitDetected, setFaucetLimitDetected] = useState(false);
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

        if (res.faucetLimitReached) {
          setFaucetLimitDetected(true);
        }

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
        if (!res.settings?.enableOwnAds && !isAdBlockActive && !vpnResult.isVpnOrProxy && !res.faucetLimitReached) {
          setRedirecting(true);
          if (res.link?.adFlyShortenedUrl) {
            redirectWithoutReferrer(res.link.adFlyShortenedUrl, res.settings?.enableThunderRedirect);
          } else {
            try {
              const clickRes = await fetchApi("/links/click", {
                method: "POST",
                body: JSON.stringify({ code })
              });
              if (clickRes.faucetLimitReached) {
                setFaucetLimitDetected(true);
                setRedirecting(false);
              } else {
                redirectWithoutReferrer(clickRes.adFlyShortenedUrl || clickRes.originalUrl, res.settings?.enableThunderRedirect);
              }
            } catch {
              setFaucetLimitDetected(true);
              setRedirecting(false);
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

  // Offer Wall Timer tick
  useEffect(() => {
    let interval: any = null;
    if (offerTimerActive && offerTimer > 0 && activeOfferIndex !== null) {
      interval = setInterval(() => {
        setOfferTimer((prev) => {
          if (prev <= 1) {
            setOfferTimerActive(false);
            setOfferCompleted((old) => {
              const updated = [...old];
              updated[activeOfferIndex] = true;
              return updated;
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [offerTimerActive, offerTimer, activeOfferIndex]);

  // Trigger Sponsored Premium Traffic Network Popup when second page (after offerwall page) loads
  useEffect(() => {
    // Check if on second page (currentStep === 2 or step 2 after offerwall)
    const isSecondPage = currentStep === 2 || (settings?.enableOfferWall && currentStep > 1);
    const isAd1Enabled = settings?.enableSponsoredAd1 !== false;
    const isAd2Enabled = !!settings?.enableSponsoredAd2;
    const isAnySponsoredAdEnabled = isAd1Enabled || isAd2Enabled;

    if (isSecondPage && !popupHasBeenTriggered && !popupClosed && isAnySponsoredAdEnabled) {
      if (isAd1Enabled) {
        setActivePopupIndex(1);
        setPopupTimer(settings?.sponsoredAd1Timer ?? 12);
      } else {
        setActivePopupIndex(2);
        setPopupTimer(settings?.sponsoredAd2Timer ?? 12);
      }
      setShowPopupAd(true);
      setPopupTimerFinished(false);
      setPopupHasBeenTriggered(true);
    }
  }, [currentStep, popupHasBeenTriggered, popupClosed, settings]);

  // Popup 10s Timer Countdown
  useEffect(() => {
    let interval: any = null;
    if (showPopupAd && popupTimer > 0) {
      interval = setInterval(() => {
        setPopupTimer((prev) => {
          if (prev <= 1) {
            setPopupTimerFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showPopupAd, popupTimer]);

  // Dynamic Browser Tab Title for Offerwall Timer, Popup Ad, and Gate Countdown
  useEffect(() => {
    const siteName = settings?.siteName || settings?.siteTitle || "TG LINKS";

    // 0. Popup Ad Active
    if (showPopupAd) {
      if (popupTimer > 0) {
        document.title = `⏳ (${popupTimer}s) Sponsored Ad - ${siteName}`;
      } else {
        document.title = `✅ Close Ad Available! - ${siteName}`;
      }
      return;
    }

    // 1. Offer Wall Active / In Progress
    if (
      settings?.enableOfferWall &&
      currentStep === 1 &&
      activeOfferIndex !== null &&
      offerClicked[activeOfferIndex] &&
      !offerCompleted[activeOfferIndex]
    ) {
      if (offerTimer > 0) {
        if (offerTimerActive) {
          document.title = `⏳ (${offerTimer}s) Please Wait... - ${siteName}`;
        } else {
          document.title = `⏸️ (${offerTimer}s) Timer Paused - Stay on Ad Page! - ${siteName}`;
        }
      } else {
        document.title = `✅ Offer Step ${activeOfferIndex + 1} Verified! - ${siteName}`;
      }
      return;
    }

    // 2. Regular Gate Step Timer
    if (!isTimerFinished && timer > 0 && !loading && !error && !redirecting && settings?.enableOwnAds) {
      document.title = `⏳ (${timer}s) Please Wait... - ${siteName}`;
      return;
    }

    // 3. All offers or timers ready / default state
    if (settings?.enableOfferWall && currentStep === 1) {
      const totalOffers = settings?.offerWallCount || 4;
      const allDone = Array.from({ length: totalOffers }).every((_, idx) => offerCompleted[idx]);
      if (allDone) {
        document.title = `✅ All Steps Completed! Get Link - ${siteName}`;
        return;
      }
    } else if (isTimerFinished) {
      document.title = `✅ Click Below to Continue - ${siteName}`;
      return;
    }

    // Fallback default
    document.title = settings?.siteTitle || settings?.siteName || "TG LINKS";

    return () => {
      document.title = settings?.siteTitle || settings?.siteName || "TG LINKS";
    };
  }, [
    showPopupAd,
    popupTimer,
    offerTimer,
    offerTimerActive,
    activeOfferIndex,
    offerClicked,
    offerCompleted,
    timer,
    isTimerFinished,
    currentStep,
    settings,
    loading,
    error,
    redirecting
  ]);

  // 2. Timer management
  useEffect(() => {
    if (loading || error || redirecting || !settings || !settings.enableOwnAds) return;

    const isSecondPage = currentStep === 2 || (settings?.enableOfferWall && currentStep > 1);
    const isAd1Enabled = settings?.enableSponsoredAd1 !== false;
    const isAd2Enabled = !!settings?.enableSponsoredAd2;
    const isAnySponsoredAdEnabled = isAd1Enabled || isAd2Enabled;

    // Hold main page timer if sponsored iframe popups are active or pending completion
    if (isSecondPage && isAnySponsoredAdEnabled && !popupClosed) {
      setIsTimerFinished(false);
      setTimer(10);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      return;
    }

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
  }, [currentStep, loading, error, settings, redirecting, popupClosed]);

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

  const handleViewOffer = (index: number) => {
    const urls = [
      settings?.offerWallUrl1,
      settings?.offerWallUrl2,
      settings?.offerWallUrl3,
      settings?.offerWallUrl4
    ];
    let adUrl = ensureAbsoluteUrl(urls[index] || "https://www.google.com");
    
    if (settings?.enableThunderRedirect) {
      adUrl = `https://thunder-appz.eu.org/r?to=${encodeURIComponent(adUrl)}`;
    }
    
    // Open ad URL in a new tab
    window.open(adUrl, "_blank");

    // Temporarily disable the immediate auto-pause on click focus event
    setJustClicked(true);
    setTimeout(() => {
      setJustClicked(false);
    }, 1500);

    // Start/Resume timer for this index
    setActiveOfferIndex(index);
    
    const defaultSec = settings?.offerWallSeconds === undefined ? 10 : settings.offerWallSeconds;
    if (activeOfferIndex !== index || offerTimer <= 0 || offerTimer > defaultSec) {
      setOfferTimer(defaultSec);
    }

    setOfferTimerActive(true);
    setOfferClicked((old) => {
      const updated = [...old];
      updated[index] = true;
      return updated;
    });
  };

  const handleNextStep = async () => {
    if (faucetLimitDetected) {
      return;
    }

    const isOfferWallEnabled = settings?.enableOfferWall && currentStep === 1;
    const totalOffersCount = settings?.offerWallCount === undefined ? 4 : settings.offerWallCount;
    const allOffersCompleted = Array.from({ length: totalOffersCount }).every((_, idx) => offerCompleted[idx]);

    if (isOfferWallEnabled) {
      if (!allOffersCompleted) return;
    } else {
      if (!isTimerFinished || !verifiedHuman) return;
      if (settings?.enableNeonAdGate && !adClicked) return;
    }

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
      if (faucetLimitDetected) return;

      setRedirecting(true);
      try {
        const clickRes = await fetchApi("/links/click", {
          method: "POST",
          body: JSON.stringify({ code })
        });

        if (clickRes.faucetLimitReached) {
          setFaucetLimitDetected(true);
          setRedirecting(false);
          return;
        }

        const targetUrl = clickRes.targetUrl || clickRes.adFlyShortenedUrl || linkData?.adFlyShortenedUrl || clickRes.originalUrl || linkData?.originalUrl;
        if (!targetUrl) {
          setFaucetLimitDetected(true);
          setRedirecting(false);
          return;
        }

        redirectWithoutReferrer(targetUrl, settings?.enableThunderRedirect);
      } catch (err: any) {
        setFaucetLimitDetected(true);
        setRedirecting(false);
      }
    }
  };

  if (loading || checkingSecurity) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <SiteLogo logoUrl={settings?.logoUrl} isLoaded={!loading} className="w-16 h-16 object-contain rounded-2xl mb-4 shadow-lg shadow-indigo-500/10 animate-pulse" />
        <h2 className="text-xl font-bold">TG Links Security Gateway...</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Securing destination endpoint parameters, performing IP integrity sweeps, and checking browser security parameters. Please wait.
        </p>
      </div>
    );
  }

  if (faucetLimitDetected) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-6">
          <ShieldAlert className="w-16 h-16" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">Faucet Mode Daily Limit Reached</h2>
        <p className="text-sm text-slate-400 max-w-md mt-3 leading-relaxed">
          Your IP address has already completed a shortener link on our network in the last 24 hours. Because this link is in <span className="text-amber-400 font-bold">Faucet Mode</span>, completions are restricted to 1 per IP address per day.
        </p>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 max-w-md w-full mt-6 text-left space-y-3.5 font-sans text-xs shadow-xl">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider text-center border-b border-slate-800 pb-2">Why was access blocked?</h3>
          
          <div className="flex items-start gap-2.5 text-slate-300 leading-relaxed pt-1">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>Integrated shortener APIs and advertiser networks only count <strong>1 view per IP per 24 hours</strong>.</span>
          </div>

          <p className="text-slate-400 text-[11px] leading-relaxed">
            To protect advertiser view accuracy and shortener account safety, additional completions and access to destination links are disabled for repeat visits within 24 hours.
          </p>

          <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center text-[11px] font-mono">
            <span className="text-slate-500">Your IP Address:</span>
            <span className="text-amber-400 font-bold select-all">{vpsDetails?.ip || "Detected"}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-6 max-w-sm">
          Please wait 24 hours before completing another faucet shortener link from this IP address.
        </p>

        <div className="flex gap-4 mt-8">
          <button
            onClick={() => { window.location.reload(); }}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-amber-900/30 transition cursor-pointer"
          >
            Check Status Again
          </button>
          <button
            onClick={() => { window.location.href = "/"; }}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-sm rounded-xl transition cursor-pointer"
          >
            Go to Homepage
          </button>
        </div>
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
                <SiteLogo logoUrl={settings?.logoUrl} isLoaded={!loading} className="w-12 h-12 object-contain rounded-xl shadow-lg" />
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
            {settings?.enableOfferWall && currentStep === 1 ? (
              <div className="w-full space-y-6" id="offer_wall_interface">
                {/* OFFER WALL CARD CONTAINER */}
                <div className="bg-slate-950 border border-slate-850 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                  {/* HEADER */}
                  <div className="text-center pb-4 border-b border-slate-800">
                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                      <Sparkles className="w-6 h-6 text-indigo-400" />
                      Step {activeOfferIndex !== null && activeOfferIndex < (settings?.offerWallCount || 4) ? activeOfferIndex + 1 : 1} of {settings?.offerWallCount || 4} Offer Tasks
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Complete the following ad-sponsor steps below to verify your session and unlock the redirection gateway.
                    </p>
                  </div>

                  {/* TOP SPONSOR AD BANNERS (DIVERSE FORMATS: 728x90, 300x250, 468x60) */}
                  <div className="flex flex-col items-center gap-4 py-4 border-b border-slate-800/60">
                    <AdBlock htmlCode={settings?.adTopLeftCode} placeholder="Header Leaderboard Unit" size="728x90" />
                    <div className="flex flex-wrap justify-center items-center gap-4 w-full">
                      <AdBlock htmlCode={settings?.adTopCenterCode} placeholder="Top Medium Rectangle" size="300x250" />
                      <AdBlock htmlCode={settings?.adTopRightCode} placeholder="Top Standard Banner" size="468x60" />
                    </div>
                  </div>

                  {/* OFFERS LIST */}
                  <div className="space-y-4">
                    {Array.from({ length: settings?.offerWallCount || 4 }).map((_, idx) => {
                      const isCompleted = offerCompleted[idx];
                      const isCurrentActive = idx === 0 || offerCompleted[idx - 1]; // unlocked if first or previous is completed
                      const isTicking = offerTimerActive && activeOfferIndex === idx;
                      const isPaused = offerClicked[idx] && !isCompleted && !isTicking && activeOfferIndex === idx && offerTimer > 0;
                      
                      return (
                        <div 
                           key={idx}
                           className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                            isCompleted 
                              ? "bg-emerald-950/20 border-emerald-500/20" 
                              : isCurrentActive 
                                ? isPaused
                                  ? "bg-slate-900 border-amber-500/30 shadow-md shadow-amber-500/5"
                                  : "bg-slate-900 border-indigo-500/30 shadow-md shadow-indigo-500/5" 
                                : "bg-slate-900/40 border-slate-850 opacity-45 pointer-events-none"
                          }`}
                        >
                          <div className="space-y-1 mb-3 sm:mb-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-black uppercase tracking-wider ${isCompleted ? "text-emerald-400" : isPaused ? "text-amber-400" : isCurrentActive ? "text-indigo-400" : "text-slate-500"}`}>
                                Step {idx + 1}
                              </span>
                              {isCompleted && (
                                <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                                  COMPLETED
                                </span>
                              )}
                              {isTicking && (
                                <span className="bg-indigo-500/15 text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-500/20 animate-pulse">
                                  TIMER TICKING
                                </span>
                              )}
                              {isPaused && (
                                <span className="bg-amber-500/15 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
                                  TIMER PAUSED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                              {isPaused ? (
                                <span className="text-amber-400 font-medium">
                                  ⚠️ Timer paused! Please click "Resume Offer" and remain on the ad page to continue the countdown.
                                </span>
                              ) : (
                                <>
                                  Please open the offer and wait <span className="font-bold text-white">{settings?.offerWallSeconds === undefined ? 10 : settings.offerWallSeconds} seconds</span> to unlock the next step.
                                </>
                              )}
                            </p>
                          </div>

                          <div>
                            <button
                              disabled={!isCurrentActive || isCompleted}
                              onClick={() => handleViewOffer(idx)}
                              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide transition flex items-center justify-center gap-1.5 min-w-[140px] ${
                                isCompleted
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : isTicking
                                    ? "bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 animate-pulse active:scale-95 cursor-pointer"
                                    : isPaused
                                      ? "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/15 active:scale-95 animate-pulse"
                                      : isCurrentActive
                                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/15 active:scale-95"
                                        : "bg-slate-900 text-slate-500 border border-slate-800"
                              }`}
                            >
                              {isCompleted ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Unlocked
                                </>
                              ) : isTicking ? (
                                <>
                                  <Hourglass className="w-3.5 h-3.5 animate-spin" />
                                  Re-open ({offerTimer}s)
                                </>
                              ) : isPaused ? (
                                <>
                                  <Play className="w-3.5 h-3.5 animate-pulse" />
                                  Resume ({offerTimer}s)
                                </>
                              ) : (
                                <>
                                  View Offer {idx + 1}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* BOTTOM SPONSOR AD BANNERS (DIVERSE FORMATS: 728x90, 300x250, 320x50) */}
                  <div className="flex flex-col items-center gap-4 pt-4 border-t border-slate-800/60">
                    <div className="flex flex-wrap justify-center items-center gap-4 w-full">
                      <AdBlock htmlCode={settings?.adLeftCode} placeholder="Bottom Medium Rectangle" size="300x250" />
                      <AdBlock htmlCode={settings?.adRightCode} placeholder="Bottom Mobile Banner" size="320x50" />
                    </div>
                    <AdBlock htmlCode={settings?.adBottomCenterCode} placeholder="Footer Leaderboard Unit" size="728x90" />
                  </div>

                  {/* CONTINUE / PROCEED BUTTON */}
                  <div className="pt-4 border-t border-slate-800">
                    <button
                      disabled={!Array.from({ length: settings?.offerWallCount || 4 }).every((_, idx) => offerCompleted[idx])}
                      onClick={handleNextStep}
                      className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg transition-all duration-150 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white disabled:cursor-not-allowed"
                    >
                      {!Array.from({ length: settings?.offerWallCount || 4 }).every((_, idx) => offerCompleted[idx]) ? (
                        "Complete All Ad Sponsor Steps First"
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
                </div>
              </div>
            ) : (
              <div className="space-y-6" id="redirection_portal_interface">
                <div className="p-6 sm:p-8 bg-slate-950 border border-slate-850 rounded-2xl text-center space-y-6 shadow-2xl max-w-2xl mx-auto">
                  
                  {/* TOP SPONSOR AD BANNERS (DIVERSE FORMATS: 728x90, 300x250, 468x60) */}
                  <div className="flex flex-col items-center gap-4 py-4 border-b border-slate-800/60">
                    <AdBlock htmlCode={settings?.adTopLeftCode} placeholder="Top Leaderboard Unit" size="728x90" />
                    <div className="flex flex-wrap justify-center items-center gap-4 w-full">
                      <AdBlock htmlCode={settings?.adTopCenterCode} placeholder="Top Medium Rectangle" size="300x250" />
                      <AdBlock htmlCode={settings?.adTopRightCode} placeholder="Top Standard Banner" size="468x60" />
                    </div>
                  </div>

                  {/* TIMER DIGITS */}
                  <div className="relative w-32 h-32 mx-auto flex items-center justify-center my-2">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="54" stroke="#0f172a" strokeWidth="7" fill="transparent" />
                      <circle 
                        cx="64" 
                        cy="64" 
                        r="54" 
                        stroke={isTimerFinished ? "#34d399" : "#6366f1"} 
                        strokeWidth="7" 
                        fill="transparent" 
                        strokeDasharray="339.29"
                        strokeDashoffset={339.29 - (339.29 * timer) / 10}
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
                    <form onSubmit={verifyCaptcha} className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3 text-left">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <span>🔒</span> Anti-Bot Security Challenge
                        </span>
                        <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/50">
                          Solve To Continue
                        </span>
                      </div>

                      <p className="text-base font-black text-white text-center py-1">{captchaPrompt.q}</p>
                      
                      {captchaError && (
                        <p className="text-xs text-rose-400 font-bold text-center bg-rose-950/40 border border-rose-900/50 p-2 rounded-lg">
                          ❌ Incorrect answer. Please try again!
                        </p>
                      )}

                      <div className="flex gap-2 pt-1">
                        <input
                          required
                          type="number"
                          placeholder="Type answer here..."
                          value={captchaAnswer}
                          onChange={(e) => setCaptchaAnswer(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-center font-bold text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl uppercase tracking-wider transition shadow-lg shadow-indigo-600/20 shrink-0"
                        >
                          Verify
                        </button>
                      </div>
                    </form>
                  )}

                  {/* VERIFIED STATUS */}
                  {verifiedHuman && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Human Verification Complete!
                    </div>
                  )}

                  {/* NEON.TODAY SPONSOR AD GATE */}
                  {settings?.enableNeonAdGate && (
                    <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          🎯 Sponsored Ad Verification
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${adClicked ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"}`}>
                          {adClicked ? "VERIFIED" : "CLICK AD TO UNLOCK"}
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Please click on the advertisement banner below to unlock your destination link.
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

                  {/* BOTTOM SPONSOR AD BANNERS (DIVERSE FORMATS: 728x90, 300x250, 320x50) */}
                  <div className="flex flex-col items-center gap-4 pt-4 border-t border-slate-800/60">
                    <div className="flex flex-wrap justify-center items-center gap-4 w-full">
                      <AdBlock htmlCode={settings?.adLeftCode} placeholder="Bottom Medium Rectangle" size="300x250" />
                      <AdBlock htmlCode={settings?.adRightCode} placeholder="Bottom Mobile Banner" size="320x50" />
                    </div>
                    <AdBlock htmlCode={settings?.adBottomCenterCode} placeholder="Footer Leaderboard Unit" size="728x90" />
                  </div>

                  {/* SUBMIT STEP BUTTON */}
                  <button
                    disabled={!isTimerFinished || !verifiedHuman || (settings?.enableNeonAdGate && !adClicked)}
                    onClick={handleNextStep}
                    className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-xl transition-all duration-150 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white disabled:cursor-not-allowed cursor-pointer"
                  >
                    {!isTimerFinished ? (
                      `Please wait... ${timer}s`
                    ) : !verifiedHuman ? (
                      "Complete Puzzle Verification First"
                    ) : (settings?.enableNeonAdGate && !adClicked) ? (
                      "Click the Ad Above to Continue"
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
              </div>
            )}
          </div>

          {/* 320x50 MOBILE/BOTTOM BANNER */}
          {settings?.bannerAd320x50 && (
            <div className="w-full flex justify-center py-2" id="banner_320x50">
              <div dangerouslySetInnerHTML={{ __html: settings.bannerAd320x50 }} />
            </div>
          )}
        </div>

        {/* Right Column: 300x600 / 300x250 Sidebar Banner Slots */}
        <div className="lg:col-span-4 flex flex-col gap-6" id="sidebar_ads_container">
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 flex flex-col justify-center items-center shadow-xl backdrop-blur-md min-h-[300px]" id="banner_300x250">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block text-center">SPONSOR ADVERTISEMENT (300x250)</span>
            {settings?.bannerAd300x250 ? (
              <div className="w-full flex justify-center" dangerouslySetInnerHTML={{ __html: settings.bannerAd300x250 }} />
            ) : (
              <div className="w-full h-60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-4 text-center space-y-2 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-500/5"></div>
                <span className="px-3 py-1 bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-[10px] font-black uppercase rounded-full tracking-widest relative z-10">
                  300x250 Medium Rectangle
                </span>
                <p className="text-xs font-bold text-white relative z-10">High CPM Sponsor Slot</p>
                <p className="text-[10px] font-mono text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 relative z-10">bannerAd300x250</p>
              </div>
            )}
          </div>

          <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 flex flex-col justify-center items-center shadow-xl backdrop-blur-md min-h-[620px]" id="banner_300x600">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block text-center">SIDEBAR SKYSCRAPER (300x600)</span>
            <div className="w-full h-[580px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-between p-6 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-indigo-500/5 to-emerald-500/5"></div>
              <div className="space-y-3 relative z-10 mt-6">
                <span className="px-3 py-1 bg-purple-950/80 border border-purple-800/60 text-purple-300 text-[10px] font-black uppercase rounded-full tracking-widest">
                  300x600 Skyscraper
                </span>
                <h4 className="text-base font-black text-white uppercase tracking-wider">Premium Ad Placement</h4>
                <p className="text-xs text-slate-400 max-w-[220px]">Maximum viewability and CTR for premium ad networks.</p>
              </div>

              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 relative z-10 w-full max-w-[240px]">
                <p className="text-[10px] font-mono text-emerald-400 font-bold">300x600 Half-Page Slot</p>
                <p className="text-[10px] text-slate-500">Auto-optimized for Google AdSense & Media.net</p>
              </div>

              <div className="mb-6 relative z-10">
                <span className="text-[10px] text-slate-600 font-mono">TG LINKS AD SERVER</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SPONSORED PREMIUM TRAFFIC NETWORK POPUP MODAL */}
      {showPopupAd && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-6xl w-full p-3.5 sm:p-6 relative text-white my-auto flex flex-col space-y-3 sm:space-y-4 max-h-[98vh] sm:max-h-none overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 sm:pb-3 gap-2">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xs sm:text-base font-black text-white uppercase tracking-wider truncate">
                    Sponsored Traffic Network
                  </h3>
                  <span className="px-2 py-0.5 bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-[10px] font-black uppercase rounded-full">
                    Ad {activePopupIndex} of {(settings?.enableSponsoredAd1 !== false && !!settings?.enableSponsoredAd2) ? 2 : 1}
                  </span>
                </div>
              </div>

              {/* Close / Next Button */}
              <button
                disabled={!popupTimerFinished}
                onClick={() => {
                  if (activePopupIndex === 1 && !!settings?.enableSponsoredAd2) {
                    setActivePopupIndex(2);
                    setPopupTimer(settings?.sponsoredAd2Timer ?? 12);
                    setPopupTimerFinished(false);
                  } else {
                    setShowPopupAd(false);
                    setPopupClosed(true);
                  }
                }}
                className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  popupTimerFinished
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 active:scale-95 cursor-pointer animate-pulse ring-2 ring-emerald-400/50"
                    : "bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-80"
                }`}
              >
                {popupTimerFinished ? (
                  (activePopupIndex === 1 && !!settings?.enableSponsoredAd2) ? (
                    <>
                      <span>Next Sponsored Ad</span>
                      <span className="font-mono text-sm leading-none">➔</span>
                    </>
                  ) : (
                    <>
                      <span>Close Ad</span>
                      <span className="font-mono text-sm leading-none">✕</span>
                    </>
                  )
                ) : (
                  <>
                    <Hourglass className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Wait {popupTimer}s</span>
                  </>
                )}
              </button>
            </div>

            {/* Timer Notification Banner */}
            <div className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-medium flex items-center justify-between transition-colors gap-2 ${
              popupTimerFinished
                ? "bg-emerald-950/50 border border-emerald-800/60 text-emerald-300"
                : "bg-amber-950/50 border border-amber-800/60 text-amber-300"
            }`}>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                {popupTimerFinished ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Hourglass className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                )}
                <span className="truncate sm:whitespace-normal">
                  {popupTimerFinished
                    ? (activePopupIndex === 1 && !!settings?.enableSponsoredAd2)
                      ? "Sponsor Ad #1 Complete! Click 'Next Sponsored Ad' to continue to Ad #2."
                      : "Sponsor Verification Complete! Click 'Close Ad' above to proceed."
                    : `Viewing sponsored ad #${activePopupIndex}: ${popupTimer}s left to unlock button.`}
                </span>
              </div>
              <span className="font-mono font-bold text-xs sm:text-sm shrink-0 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                {popupTimer > 0 ? `${popupTimer}s` : "READY"}
              </span>
            </div>

            {/* Iframe Banner Container (Single Full-Size Iframe Per Ad) */}
            <div className="w-full flex flex-col">
              {activePopupIndex === 1 && (settings?.enableSponsoredAd1 !== false) && (
                <div className="w-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner flex flex-col">
                  <div className="bg-slate-900/90 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-400">
                        Sponsored Traffic Partner #1
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-800/60 font-bold">
                      Timer: {settings?.sponsoredAd1Timer ?? 12}s
                    </span>
                  </div>
                  <iframe
                    src={settings?.sponsoredAd1Url || "https://www.rotate4all.com/promote/pt13azaa9mf1"}
                    title="Sponsored Traffic Partner Modal 1"
                    className="w-full border-0 h-[520px] sm:h-[650px]"
                    referrerPolicy="unsafe-url"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              )}

              {activePopupIndex === 2 && !!settings?.enableSponsoredAd2 && (
                <div className="w-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner flex flex-col">
                  <div className="bg-slate-900/90 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-indigo-400">
                        Sponsored Traffic Partner #2
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 rounded border border-indigo-800/60 font-bold">
                      Timer: {settings?.sponsoredAd2Timer ?? 12}s
                    </span>
                  </div>
                  <iframe
                    src={settings?.sponsoredAd2Url || "https://www.rotate4all.com/promote/pt13azaa9mf1"}
                    title="Sponsored Traffic Partner Modal 2"
                    className="w-full border-0 h-[520px] sm:h-[650px]"
                    referrerPolicy="unsafe-url"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer Note */}
            <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] sm:text-[11px] text-slate-400 gap-1.5 sm:gap-2 pt-0.5">
              <span>Verified Traffic Network Partners</span>
              {popupTimerFinished ? (
                <span className="text-emerald-400 font-bold text-center sm:text-right">
                  ✓ Step complete! Click '{(activePopupIndex === 1 && !!settings?.enableSponsoredAd2) ? "Next Sponsored Ad" : "Close Ad"}' to proceed.
                </span>
              ) : (
                <span className="text-slate-500 text-center sm:text-right">
                  Button unlocks automatically in {popupTimer}s
                </span>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer className="bg-slate-950 text-slate-500 text-center py-6 border-t border-slate-900 text-xs flex flex-col items-center justify-center gap-2">
        <div>© 2026 {settings?.siteName || "TG Links"} Security Redirection Gateway. All rights reserved.</div>
        <div className="text-[11px] font-semibold text-slate-300 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800/80">
          Proudly Made with 💝 in India
        </div>
      </footer>
    </div>
  );
}
