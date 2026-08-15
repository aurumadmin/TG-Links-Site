import React, { useState, useEffect } from "react";
import { getCachedSettings } from "./SiteLogo";

interface FloatingSocialProps {
  channelUrl?: string;
  instagramUrl?: string;
  className?: string;
}

export default function FloatingTelegramButton({ 
  channelUrl, 
  instagramUrl,
  className = "" 
}: FloatingSocialProps) {
  const getInitialTgUrl = () => {
    if (channelUrl !== undefined && channelUrl !== null) {
      return channelUrl;
    }
    const cached = getCachedSettings();
    if (cached?.telegramChannelUrl !== undefined) {
      return cached.telegramChannelUrl;
    }
    return "https://t.me/tglinks_official";
  };

  const getInitialIgUrl = () => {
    if (instagramUrl !== undefined && instagramUrl !== null) {
      return instagramUrl;
    }
    const cached = getCachedSettings();
    if (cached?.instagramUrl !== undefined) {
      return cached.instagramUrl;
    }
    return "https://instagram.com/tglinks_official";
  };

  const [tgUrl, setTgUrl] = useState<string>(getInitialTgUrl);
  const [igUrl, setIgUrl] = useState<string>(getInitialIgUrl);
  const [hoveredButton, setHoveredButton] = useState<"tg" | "ig" | null>(null);

  useEffect(() => {
    if (channelUrl !== undefined && channelUrl !== null) {
      setTgUrl(channelUrl);
    }
  }, [channelUrl]);

  useEffect(() => {
    if (instagramUrl !== undefined && instagramUrl !== null) {
      setIgUrl(instagramUrl);
    }
  }, [instagramUrl]);

  useEffect(() => {
    const handleUpdate = () => {
      const cached = getCachedSettings();
      if (cached?.telegramChannelUrl !== undefined) {
        setTgUrl(cached.telegramChannelUrl);
      }
      if (cached?.instagramUrl !== undefined) {
        setIgUrl(cached.instagramUrl);
      }
    };

    window.addEventListener("site_settings_updated", handleUpdate);
    return () => window.removeEventListener("site_settings_updated", handleUpdate);
  }, []);

  const trimmedTg = (tgUrl || "").trim();
  const trimmedIg = (igUrl || "").trim();

  const showTg = tgUrl === undefined || trimmedTg !== "";
  const showIg = igUrl === undefined || trimmedIg !== "";

  // If both are explicitly cleared, render nothing
  if (!showTg && !showIg) {
    return null;
  }

  const effectiveTgUrl = trimmedTg || "https://t.me/tglinks_official";
  const targetTgUrl = effectiveTgUrl.startsWith("http://") || effectiveTgUrl.startsWith("https://") 
    ? effectiveTgUrl 
    : `https://${effectiveTgUrl}`;

  const effectiveIgUrl = trimmedIg || "https://instagram.com/tglinks_official";
  const targetIgUrl = effectiveIgUrl.startsWith("http://") || effectiveIgUrl.startsWith("https://") 
    ? effectiveIgUrl 
    : `https://${effectiveIgUrl}`;

  return (
    <div 
      className={`fixed right-4 bottom-5 z-[99999] flex items-center gap-2 select-none pointer-events-auto transition-transform duration-300 ${className}`}
      style={{ position: "fixed", bottom: "20px", right: "16px", zIndex: 99999 }}
    >
      {/* Small Instagram Icon Button (Icon Only) */}
      {showIg && (
        <div 
          className="relative flex items-center"
          onMouseEnter={() => setHoveredButton("ig")}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <a
            href={targetIgUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 group"
            style={{
              background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
              boxShadow: hoveredButton === "ig" 
                ? "0 6px 16px -2px rgba(225, 48, 108, 0.6), 0 2px 6px -1px rgba(0, 0, 0, 0.3)" 
                : "0 4px 10px -2px rgba(225, 48, 108, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.35)",
              color: "#ffffff",
              textDecoration: "none"
            }}
          >
            {/* Instagram Camera SVG Icon */}
            <svg 
              className="w-4 h-4 fill-none stroke-current stroke-[2] transition-transform duration-200 group-hover:scale-105" 
              viewBox="0 0 24 24"
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.3))" }}
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>

          {/* Instagram Tooltip on hover */}
          {hoveredButton === "ig" && (
            <span 
              className="hidden sm:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 text-[10px] font-bold rounded-lg whitespace-nowrap shadow-xl pointer-events-none transition-all duration-200"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                color: "#f8fafc",
                border: "1px solid rgba(51, 65, 85, 0.8)",
                backdropFilter: "blur(6px)",
                boxShadow: "0 8px 16px -2px rgba(0, 0, 0, 0.5)"
              }}
            >
              Instagram
            </span>
          )}
        </div>
      )}

      {/* Compact Telegram Support Button (Icon + "Support", No Green Dot) */}
      {showTg && (
        <div 
          className="relative flex items-center group"
          onMouseEnter={() => setHoveredButton("tg")}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <a
            href={targetTgUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Support on Telegram"
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full text-white font-semibold text-xs tracking-wide shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 h-8 sm:h-9"
            style={{
              background: "linear-gradient(135deg, #2AABEE 0%, #229ED9 50%, #0088CC 100%)",
              boxShadow: hoveredButton === "tg" 
                ? "0 8px 18px -2px rgba(34, 158, 217, 0.6), 0 3px 8px -1px rgba(0, 0, 0, 0.3)" 
                : "0 4px 12px -2px rgba(34, 158, 217, 0.45), 0 2px 5px -1px rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.35)",
              color: "#ffffff",
              textDecoration: "none"
            }}
          >
            {/* Telegram icon */}
            <svg 
              className="w-3.5 h-3.5 fill-white flex-shrink-0 transition-transform duration-200 group-hover:-rotate-12" 
              viewBox="0 0 24 24"
              style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))" }}
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.61 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.05-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.66-2.88 8.01-3.44 3.81-1.59 4.6-1.87 5.12-1.88.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.13-.03.22z"/>
            </svg>

            {/* Telegram Support text */}
            <span 
              className="font-bold text-xs whitespace-nowrap"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
            >
              Support
            </span>

            {/* Tooltip on hover */}
            {hoveredButton === "tg" && (
              <span 
                className="hidden sm:block absolute bottom-full mb-2 right-0 px-2.5 py-1 text-[10px] font-bold rounded-lg whitespace-nowrap shadow-xl pointer-events-none transition-all duration-200"
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  color: "#f8fafc",
                  border: "1px solid rgba(51, 65, 85, 0.8)",
                  backdropFilter: "blur(6px)",
                  boxShadow: "0 8px 16px -2px rgba(0, 0, 0, 0.5)"
                }}
              >
                Telegram Support
              </span>
            )}
          </a>
        </div>
      )}
    </div>
  );
}
