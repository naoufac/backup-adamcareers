"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  variant?: "success" | "error" | "info";
  duration?: number;
  onDismiss?: () => void;
}

export function Toast({ message, variant = "info", duration = 2500, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!visible) return null;

  const variants = {
    success: "bg-green-50 text-green-700 border-green-200",
    error: "bg-red-50 text-red-700 border-red-200",
    info: "bg-adam-50 text-adam-700 border-adam-100",
  };

  return (
    <div className={`rounded-lg border px-4 py-2 text-sm ${variants[variant]}`}>
      {message}
    </div>
  );
}
