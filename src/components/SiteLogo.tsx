import React from "react";

interface SiteLogoProps {
  logoUrl?: string | null;
  isLoaded?: boolean;
  className?: string;
  alt?: string;
}

export function getCachedSettings() {
  try {
    const cached = localStorage.getItem("tglinks_settings");
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.error("Failed to parse cached tglinks_settings", e);
  }
  return null;
}

export function saveCachedSettings(settings: any) {
  if (!settings) return;
  try {
    localStorage.setItem("tglinks_settings", JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save tglinks_settings to localStorage", e);
  }
}

export default function SiteLogo({
  logoUrl,
  isLoaded = true,
  className = "w-10 h-10 object-contain rounded-xl",
  alt = "TG Links Logo"
}: SiteLogoProps) {
  // If logoUrl is available, render custom logo
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={alt}
        className={className}
        referrerPolicy="no-referrer"
        onError={(e) => {
          // If custom image fails to load, fallback to logo.svg
          (e.target as HTMLImageElement).src = "/logo.svg";
        }}
      />
    );
  }

  // If data is still loading from server and no logoUrl is available,
  // do NOT render /logo.svg. Render a sleek loading placeholder instead.
  if (!isLoaded) {
    return (
      <div className={`${className} bg-indigo-500/10 border border-indigo-500/20 animate-pulse flex items-center justify-center`}>
        <span className="text-xs font-black text-indigo-400 tracking-tighter">TG</span>
      </div>
    );
  }

  // If settings loaded and admin explicitly left logoUrl empty, fallback to default asset
  return (
    <img
      src="/logo.svg"
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
    />
  );
}
