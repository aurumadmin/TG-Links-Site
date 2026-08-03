import React, { useEffect, useState } from "react";

interface TopLoadingBarProps {
  isLoading: boolean;
}

export default function TopLoadingBar({ isLoading }: TopLoadingBarProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer1: any;
    let timer2: any;
    let safetyTimer: any;

    if (isLoading) {
      setVisible(true);
      setProgress(15);

      timer1 = setTimeout(() => {
        setProgress(50);
      }, 200);

      timer2 = setTimeout(() => {
        setProgress(80);
      }, 600);

      // Safety timeout: Never stay loading for more than 4 seconds
      safetyTimer = setTimeout(() => {
        setProgress(100);
        setTimeout(() => setVisible(false), 300);
      }, 4000);
    } else {
      setProgress(100);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);

      return () => clearTimeout(hideTimer);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(safetyTimer);
    };
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[3px] bg-slate-900/20 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-indigo-400 transition-all duration-300 ease-out shadow-[0_0_10px_#6366f1]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
