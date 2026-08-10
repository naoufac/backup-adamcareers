"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

interface AppConfig {
  stripePublishableKey: string | null;
  exportPrice: number;
  currency: string;
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/me/config`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setConfig(d))
      .catch(() => setConfig({ stripePublishableKey: null, exportPrice: 100, currency: "usd" }));
  }, []);

  return config;
}
