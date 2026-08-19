import type { Usage } from "../db/schema.js";

export interface UsageResult {
  userId: string;
  freeExportsUsed: number;
  paid: boolean;
}

const PROFILES_URL = process.env.PROFILES_SERVICE_URL;

export async function getUsage(
  userId: string,
  token: string,
): Promise<UsageResult | null> {
  if (!PROFILES_URL) return null;
  try {
    const res = await fetch(`${PROFILES_URL}/api/profiles/me/usage`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      freeExportsUsed?: number;
      paid?: boolean;
    };
    return {
      userId,
      freeExportsUsed: data.freeExportsUsed ?? 0,
      paid: data.paid ?? false,
    };
  } catch {
    return null;
  }
}

export async function incrementExportUsage(
  userId: string,
  token: string,
): Promise<UsageResult | null> {
  if (!PROFILES_URL) return null;
  try {
    const res = await fetch(
      `${PROFILES_URL}/api/profiles/me/increment-export`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      freeExportsUsed?: number;
      paid?: boolean;
    };
    return {
      userId,
      freeExportsUsed: data.freeExportsUsed ?? 0,
      paid: data.paid ?? false,
    };
  } catch {
    return null;
  }
}

export function usageFromRow(row: Usage): UsageResult {
  return {
    userId: row.userId,
    freeExportsUsed: row.freeExportsUsed,
    paid: row.paid,
  };
}
