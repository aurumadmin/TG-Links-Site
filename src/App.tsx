import React, { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
import DashboardPage from "./components/DashboardPage";
import AdminPage from "./components/AdminPage";
import RedirectPage from "./components/RedirectPage";
import AuthPage from "./components/AuthPage";
import { User } from "./types";
import { fetchApi } from "./lib/api";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<string>("home"); // home, dashboard, admin, go
  const [shortCode, setShortCode] = useState<string>("");
  const [showAuth, setShowAuth] = useState(false);

  // 1. Path routing check
  useEffect(() => {
    const path = window.location.pathname;
    // Format: /go/xyz123
    const goMatch = path.match(/^\/go\/([a-zA-Z0-9]+)$/);
    if (goMatch) {
      setShortCode(goMatch[1]);
      setActivePage("go");
    } else {
      // Normal routing: check logged in session
      const storedUser = localStorage.getItem("tglinks_user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setActivePage("dashboard");
        } catch (e) {
          console.error("Failed to parse stored user", e);
        }
      }
    }
  }, []);

  const handleAuthSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
    setShowAuth(false);
    setActivePage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("tglinks_user");
    setUser(null);
    setActivePage("home");
  };

  // Switch workspace pages
  const handleNavigate = (page: string) => {
    setActivePage(page);
    setShowAuth(false);
  };

  // Render Redirection Gate if viewing /go/:code
  if (activePage === "go" && shortCode) {
    return <RedirectPage code={shortCode} />;
  }

  // Auth Overlay page
  if (showAuth && !user) {
    return (
      <AuthPage 
        onAuthSuccess={handleAuthSuccess} 
        onClose={() => setShowAuth(false)} 
      />
    );
  }

  // Dashboard Page Workspace
  if (activePage === "dashboard" && user) {
    return (
      <DashboardPage 
        user={user} 
        onLogout={handleLogout} 
        onNavigate={handleNavigate} 
      />
    );
  }

  // Admin Portal Workspace
  if (activePage === "admin" && user && user.role === "admin") {
    return (
      <AdminPage 
        onBackToDashboard={() => setActivePage("dashboard")} 
      />
    );
  }

  // Default: Landing/Guest page
  return (
    <LandingPage 
      user={user} 
      onNavigate={handleNavigate} 
      onOpenAuth={() => setShowAuth(true)} 
    />
  );
}
