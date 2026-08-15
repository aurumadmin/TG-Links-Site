import React, { useState, useEffect } from "react";
import { getCachedSettings } from "./SiteLogo";

interface FloatingTelegramButtonProps {
  channelUrl?: string;
  className?: string;
}

export default function FloatingTelegramButton({ channelUrl, className = "" }: FloatingTelegramButtonProps) {
  const getInitialUrl = () => {
    if (channelUrl !== undefined && channelUrl !== null) {
      return channelUrl;
    }
    const cached = getCachedSettings();
    if (cached?.telegramChannelUrl !== undefined) {
      return cached.telegramChannelUrl;
    }
    return "https://t.me/tglinks_official";
  };

  const [url, setUrl] = useState<string>(getInitialUrl);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (channelUrl !== undefined && channelUrl !== null) {
      setUrl(channelUrl);
    }
  }, [channelUrl]);

  useEffect(() => {
    const handleUpdate = () => {
      const cached = getCachedSettings();
      if (cached?.telegramChannelUrl !== undefined) {
        setUrl(cached.telegramChannelUrl);
      }
    };

    window.addEventListener("site_settings_updated", handleUpdate);
    return () => window.removeEventListener("site_settings_updated", handleUpdate);
  }, []);

  // If explicitly disabled with empty string (""), don't render
  const trimmedUrl = (url || "").trim();
  if (url !== undefined && trimmedUrl === "") {
    return null;
  }

  const effectiveUrl = trimmedUrl || "https://t.me/tglinks_official";
  const targetUrl = effectiveUrl.startsWith("http://") || effectiveUrl.startsWith("https://") 
    ? effectiveUrl 
    : `https://${effectiveUrl}`;

  return (
    <div 
      className={`fixed right-5 bottom-6 z-[9999] flex items-center group select-none pointer-events-auto transition-all duration-300 ${className}`}
      style={{ position: "fixed", bottom: "24px", right: "20px", zIndex: 9999 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Join our Telegram Channel"
        className="relative flex items-center gap-2.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white px-4 py-3 rounded-full shadow-2xl shadow-sky-500/40 border border-sky-300/50 transition-all duration-300 hover:scale-105 hover:shadow-sky-500/60"
      >
        {/* Pulsing ring indicator */}
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
        </span>

        {/* Telegram paper plane icon */}
        <svg 
          className="w-5 h-5 fill-current flex-shrink-0 drop-shadow transition-transform duration-300 group-hover:-rotate-12" 
          viewBox="0 0 24 24"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.61 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.05-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.66-2.88 8.01-3.44 3.81-1.59 4.6-1.87 5.12-1.88.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.13-.03.22z"/>
        </svg>

        {/* Telegram button text */}
        <span className="font-bold text-xs tracking-wide whitespace-nowrap drop-shadow">
          Join Telegram
        </span>

        {/* Tooltip for hover extra clarity */}
        {isHovered && (
          <span className="hidden sm:block absolute right-full mr-3.5 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-semibold rounded-xl whitespace-nowrap shadow-xl border border-slate-700/80 backdrop-blur-sm animate-fade-in pointer-events-none">
            Get updates & support on Telegram
          </span>
        )}
      </a>
    </div>
  );
}
