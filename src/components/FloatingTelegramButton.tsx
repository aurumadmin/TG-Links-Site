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
      className={`fixed right-5 bottom-6 z-[99999] flex items-center group select-none pointer-events-auto transition-transform duration-300 ${className}`}
      style={{ position: "fixed", bottom: "24px", right: "20px", zIndex: 99999 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Join our Telegram Channel"
        className="flex items-center gap-2.5 px-4 py-2.5 sm:px-5 sm:py-3 rounded-full text-white font-bold text-sm tracking-wide shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #2AABEE 0%, #229ED9 50%, #0088CC 100%)",
          boxShadow: isHovered 
            ? "0 12px 28px -4px rgba(34, 158, 217, 0.65), 0 6px 14px -2px rgba(0, 0, 0, 0.4)" 
            : "0 8px 20px -4px rgba(34, 158, 217, 0.5), 0 4px 10px -2px rgba(0, 0, 0, 0.3)",
          border: "1.5px solid rgba(255, 255, 255, 0.35)",
          color: "#ffffff",
          textDecoration: "none"
        }}
      >
        {/* Pulsing online status indicator */}
        <span 
          className="relative flex h-3 w-3 shrink-0"
          style={{ width: "10px", height: "10px" }}
        >
          <span 
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: "#4ade80" }}
          ></span>
          <span 
            className="relative inline-flex rounded-full h-full w-full border border-white"
            style={{ backgroundColor: "#22c55e" }}
          ></span>
        </span>

        {/* Telegram icon container */}
        <div 
          className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 transition-transform duration-300 group-hover:-rotate-12"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
        >
          <svg 
            className="w-4 h-4 fill-white flex-shrink-0" 
            viewBox="0 0 24 24"
            style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.61 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.05-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.66-2.88 8.01-3.44 3.81-1.59 4.6-1.87 5.12-1.88.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.13-.03.22z"/>
          </svg>
        </div>

        {/* Telegram button text */}
        <span 
          className="font-bold text-xs sm:text-sm whitespace-nowrap"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)", letterSpacing: "0.02em" }}
        >
          Join Telegram
        </span>

        {/* Tooltip on hover */}
        {isHovered && (
          <span 
            className="hidden sm:block absolute right-full mr-3.5 px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap shadow-2xl pointer-events-none transition-all duration-200"
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              color: "#f8fafc",
              border: "1px solid rgba(51, 65, 85, 0.8)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.5)"
            }}
          >
            Official TG Links Community & Updates
          </span>
        )}
      </a>
    </div>
  );
}
