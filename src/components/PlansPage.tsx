import React, { useState, useEffect } from "react";
import { Check, Sparkles, ArrowRight, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";
import { fetchApi } from "../lib/api";
import { PublisherPlan, User, AdFlyShortener } from "../types";

interface PlansPageProps {
  user: User | null;
  onUserUpdated?: (updatedUser: User) => void;
  onOpenAuth?: () => void;
  onNavigate?: (path: string) => void;
}

export default function PlansPage({ user, onUserUpdated, onOpenAuth, onNavigate }: PlansPageProps) {
  const [plans, setPlans] = useState<PublisherPlan[]>([]);
  const [shorteners, setShorteners] = useState<AdFlyShortener[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadPlansData = async () => {
    setLoading(true);
    try {
      const plansRes = await fetchApi("/plans").catch(() => null);
      if (plansRes?.plans) {
        setPlans(plansRes.plans);
      }
      if (plansRes?.shorteners) {
        setShorteners(plansRes.shorteners);
      }
    } catch (err) {
      console.error("Failed to load plans data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlansData();
  }, []);

  const handleSwitchPlan = async (planId: string) => {
    if (!user) {
      onOpenAuth?.();
      return;
    }

    if (user.planId === planId || (!user.planId && planId === "default")) {
      return;
    }

    setSwitchingId(planId);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetchApi("/users/switch-plan", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          planId
        })
      });

      if (res?.success && res.user) {
        localStorage.setItem("tglinks_user", JSON.stringify(res.user));
        onUserUpdated?.(res.user);
        setSuccessMsg(`Successfully switched to ${res.plan?.name || "selected plan"}!`);
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setErrorMsg(res?.error || "Failed to switch plan. Please try again.");
      }
    } catch (err: any) {
      console.error("Plan switch error:", err);
      setErrorMsg("Failed to switch plan. Please try again.");
    } finally {
      setSwitchingId(null);
    }
  };

  // Helper to get shortener names for a plan
  const getShortenerNames = (plan: PublisherPlan) => {
    if (!plan.shortenerIds || plan.shortenerIds.length === 0) {
      return ["Default Integrated Shorteners"];
    }
    const matched = shorteners
      .filter(s => plan.shortenerIds.includes(s.id))
      .map(s => s.name);
    return matched.length > 0 ? matched : ["Default Integrated Shorteners"];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Publisher Traffic Plans
        </span>
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
          Publisher CPM Rates & Shortener Plans
        </h1>
        <p className="text-slate-400 text-sm md:text-base mt-3 leading-relaxed">
          Choose the best monetization plan for your audience and traffic sources. Switch plans anytime with zero downtime. Each plan features guaranteed CPM rates, fast shortener routing, and automatic payouts.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="max-w-2xl mx-auto mb-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-sm font-semibold">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="max-w-2xl mx-auto mb-8 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-400 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="font-semibold text-sm">Loading publisher plans...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-stretch">
          {plans.map((plan) => {
            const isCurrentPlan = user
              ? (user.planId === plan.id || (!user.planId && plan.isDefault))
              : false;

            const shortenerList = getShortenerNames(plan);
            const isSwitching = switchingId === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-slate-900/80 border rounded-3xl p-6 md:p-8 flex flex-col justify-between transition-all duration-300 ${
                  isCurrentPlan
                    ? "border-indigo-500/80 shadow-2xl shadow-indigo-500/20 bg-slate-900 ring-2 ring-indigo-500/30"
                    : plan.isDefault
                    ? "border-slate-700 hover:border-slate-600 shadow-xl"
                    : "border-slate-800 hover:border-slate-700 shadow-lg"
                }`}
              >
                <div>
                  {/* Badges */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                      isCurrentPlan
                        ? "bg-indigo-600 text-white"
                        : plan.isDefault
                        ? "bg-slate-800 text-slate-300 border border-slate-700"
                        : "bg-slate-800/80 text-indigo-400 border border-indigo-500/20"
                    }`}>
                      {plan.name}
                    </span>

                    {isCurrentPlan && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Active Plan
                      </span>
                    )}

                    {!isCurrentPlan && plan.isDefault && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-400">
                        Default Plan
                      </span>
                    )}
                  </div>

                  {/* CPM Price display */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl md:text-4xl font-black text-white">
                        ${plan.cpm.toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        CPM Rate
                      </span>
                    </div>
                    <p className="text-xs text-emerald-400 font-bold mt-1">
                      ${plan.cpm.toFixed(2)} payout per 1,000 completed views
                    </p>
                  </div>

                  {/* Plan Description */}
                  <p className="text-xs text-slate-300 leading-relaxed mb-6">
                    {plan.description || "High conversion publisher shortener pipeline with instant view counting."}
                  </p>

                  {/* Features & Details */}
                  <div className="space-y-4 mb-8 text-xs">
                    {/* Bullet list */}
                    <ul className="space-y-2 text-slate-300 text-xs">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>100% Final View Earnings Payout</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>Instant Developer API Integration</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>Telegram & Social Traffic Friendly</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-4">
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 flex items-center justify-center gap-2 cursor-default"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      Current Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSwitchPlan(plan.id)}
                      disabled={isSwitching}
                      className="w-full py-3 px-4 rounded-xl font-extrabold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      {isSwitching ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Switching...</span>
                        </>
                      ) : user ? (
                        <>
                          <span>Switch to {plan.name}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <span>Get Started on {plan.name}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
