import { z } from "zod";

/* ------------------------------------------------------------------ *
 * LLM client — Z.AI primary, OpenRouter fallback.
 *
 * Primary:   Z.AI GLM-4.7 (ZAI_BASE_URL + ZAI_API_KEY + ZAI_MODEL)
 * Fallback:  OpenRouter minimax (OPENROUTER_* env vars)
 *
 * Each provider gets up to MAX_RETRIES with exponential backoff.
 * On exhaustion or fatal error, we fall through to the next provider.
 * ------------------------------------------------------------------ */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

/* ---------- Provider definitions ---------- */

interface Provider {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  extraHeaders: Record<string, string>;
}

function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  /* 1 — OpenRouter (primary, currently Z.AI key is expired) */
  const orKey = process.env.OPENROUTER_API_KEY;
  const orBase = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  const orModel = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
  if (orKey) {
    providers.push({
      name: "openrouter",
      baseUrl: orBase,
      apiKey: orKey,
      model: orModel,
      extraHeaders: {
        "HTTP-Referer":
          process.env.OPENROUTER_HTTP_REFERER ?? "https://adamcareers.com",
        "X-Title": process.env.OPENROUTER_TITLE ?? "AdamCareers",
      },
    });
  }

  /* 2 — Z.AI (fallback) */
  const zaiKey = process.env.ZAI_API_KEY;
  const zaiBase = process.env.ZAI_BASE_URL ?? "https://api.z.ai/api/coding/paas/v4";
  const zaiModel = process.env.ZAI_MODEL ?? "glm-4.7";
  if (zaiKey) {
    providers.push({
      name: "zai",
      baseUrl: zaiBase,
      apiKey: zaiKey,
      model: zaiModel,
      extraHeaders: {},
    });
  }

  if (providers.length === 0) {
    console.warn("[llm] No LLM provider configured (ZAI_API_KEY / OPENROUTER_API_KEY).");
  }

  return providers;
}

/* ---------- Constants ---------- */

const TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;

/* ---------- Core call ---------- */

async function callProvider(
  p: Provider,
  messages: ChatMessage[],
  opts: ChatOptions,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: p.model,
    messages,
    max_tokens: opts.maxTokens ?? 4000,
    temperature: opts.temperature ?? 0.4,
  };
  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${p.apiKey}`,
    ...p.extraHeaders,
  };

  let lastErr: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(1000 * 2 ** attempt, 8000);
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(`${p.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const detail = await res.text();
        const msg = `[${p.name}] ${p.model} ${res.status}: ${detail.slice(0, 300)}`;
        // Retry on 5xx & 429
        if ((res.status >= 500 || res.status === 429) && attempt < MAX_RETRIES - 1) {
          console.warn(`[llm] ${p.name} attempt ${attempt + 1}/${MAX_RETRIES} failed (${res.status}), retrying...`);
          lastErr = new Error(msg);
          continue;
        }
        throw new Error(msg);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      return content.trim();
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_RETRIES - 1) {
        console.warn(`[llm] ${p.name} attempt ${attempt + 1}/${MAX_RETRIES} error: ${lastErr.message}, retrying...`);
        continue;
      }
      throw lastErr;
    }
  }

  throw lastErr ?? new Error(`[${p.name}] LLM call failed after ${MAX_RETRIES} retries`);
}

/* ---------- Public API ---------- */

export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  const providers = buildProviders();

  for (let i = 0; i < providers.length; i++) {
    const p = providers[i];
    try {
      return await callProvider(p, messages, opts);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (i < providers.length - 1) {
        console.warn(`[llm] ${p.name} exhausted (${msg.slice(0, 120)}), falling back to ${providers[i + 1].name}...`);
      } else {
        console.error(`[llm] ${p.name} — last provider failed: ${msg}`);
      }
    }
  }

  throw new Error("All LLM providers failed.");
}

export async function chatJson<T>(
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  opts: ChatOptions = {},
): Promise<T> {
  const raw = await chat(messages, {
    ...opts,
    jsonMode: true,
    temperature: opts.temperature ?? 0.25,
    maxTokens: opts.maxTokens ?? 4000,
  });
  const cleaned = stripCodeFence(raw);
  const parsed = JSON.parse(cleaned) as unknown;
  return schema.parse(parsed);
}

/* ---------- Helpers ---------- */

function stripCodeFence(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("```")) {
    const firstNewline = trimmed.indexOf("\n");
    const inner = trimmed.slice(firstNewline + 1);
    const end = inner.lastIndexOf("```");
    return (end >= 0 ? inner.slice(0, end) : inner).trim();
  }
  return trimmed;
}
