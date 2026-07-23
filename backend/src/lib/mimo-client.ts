import OpenAI from "openai";

// ============================================================
// AI Client — supports multiple free providers
// Providers: gemini, groq, openrouter
// ============================================================

export type Provider = "gemini" | "groq" | "openrouter";

const PROVIDER: Provider = (process.env.AI_PROVIDER as Provider) || "groq";

// --- Model selection per provider ---
const MODELS: Record<Provider, string> = {
  gemini: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  groq: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  openrouter: process.env.OPENROUTER_MODEL || "google/gemma-3-12b-it:free",
};

// Client cache keyed by API key to avoid creating new instances per request
const clientCache = new Map<string, OpenAI>();

function getClient(overrideApiKey?: string): OpenAI {
  const cacheKey = `${PROVIDER}:${overrideApiKey || "env"}`;
  const cached = clientCache.get(cacheKey);
  if (cached) return cached;

  let apiKey: string;
  let baseURL: string;

  switch (PROVIDER) {
    case "gemini":
      apiKey = overrideApiKey || process.env.GEMINI_API_KEY || "";
      baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/";
      break;
    case "groq":
      apiKey = overrideApiKey || process.env.GROQ_API_KEY || "";
      baseURL = "https://api.groq.com/openai/v1";
      break;
    case "openrouter":
      apiKey = overrideApiKey || process.env.OPENROUTER_API_KEY || "";
      baseURL = "https://openrouter.ai/api/v1";
      break;
  }

  const client = new OpenAI({ baseURL, apiKey });
  clientCache.set(cacheKey, client);
  return client;
}

function getModel(): string {
  return MODELS[PROVIDER];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mimoChat(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number; retries?: number; apiKey?: string }
): Promise<string> {
  const maxRetries = options?.retries ?? 3;
  let lastError: unknown;

  const keyProvided = !!(options?.apiKey && options.apiKey.trim().length > 0);
  const envKeySet = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
  const activeKey = options?.apiKey?.trim() || process.env.GROQ_API_KEY || "";
  const keyPreview = activeKey.length > 8
    ? `${activeKey.substring(0, 4)}...${activeKey.substring(activeKey.length - 4)}`
    : "(empty)";

  if (!keyProvided && !envKeySet) {
    console.error(`[AI] CRITICAL: No API key provided AND no GROQ_API_KEY in env`);
  }

  console.log(`[AI] Provider: ${PROVIDER}, Model: ${getModel()}, Key: ${keyPreview}, KeyProvided: ${keyProvided}, EnvKeySet: ${envKeySet}`);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const client = getClient(options?.apiKey);
      const model = getModel();

      const response = await client.chat.completions.create({
        model,
        messages,
        max_tokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("AI returned empty response");
      }

      console.log(`[AI] Success: ${content.length} chars, tokens: ${JSON.stringify(response.usage || {})}`);
      return content;
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.response?.status;
      const errorMsg = error?.message || "unknown error";

      console.error(`[AI] Attempt ${attempt + 1}/${maxRetries + 1} failed: status=${status}, message=${errorMsg}`);

      // Rate limited (429 = TPM exceeded on Groq free tier)
      // Must wait at least 60s for the 1-minute TPM window to fully reset
      if (status === 429) {
        const delay = Math.min(65000 * Math.pow(1.5, attempt), 180000);
        console.warn(`[AI] TPM rate limited (429), waiting ${Math.round(delay / 1000)}s for token window reset (attempt ${attempt + 1}/${maxRetries + 1})`);
        await sleep(delay);
        continue;
      }

      // Server error — retry with backoff
      if (status === 500 || status === 502 || status === 503) {
        const delay = Math.min(5000 * Math.pow(2, attempt), 30000);
        console.warn(`[AI] Server error (status ${status}), retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

// Limit total file content to fit within Groq free tier (6000 TPM per minute)
// Each agent makes 1+ requests, keep input under ~1000 chars to leave room for output tokens
const MAX_TOTAL_CHARS = parseInt(process.env.MAX_INPUT_CHARS || "1000", 10);

export type FileInput = {
  path: string;
  content: string;
  extension: string;
};

export function limitFiles(files: FileInput[]): FileInput[] {
  let totalChars = 0;
  const result: FileInput[] = [];

  for (const file of files) {
    if (totalChars >= MAX_TOTAL_CHARS) break;
    const remaining = MAX_TOTAL_CHARS - totalChars;
    const truncated = file.content.length > remaining
      ? file.content.substring(0, remaining) + "\n// ... truncated"
      : file.content;
    totalChars += truncated.length;
    result.push({ ...file, content: truncated });
  }

  return result;
}

export async function mimoChatWithRetry(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number; apiKey?: string },
  maxRetries = 1
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await mimoChat(messages, options);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role === "user") {
          messages = [
            ...messages,
            {
              role: "assistant",
              content: "Let me provide the analysis.",
            },
            {
              role: "user",
              content:
                "Your previous response was not valid JSON. Please respond with ONLY a valid JSON object matching the required structure. No markdown, no explanation, just the raw JSON.",
            },
          ];
        }
      }
    }
  }

  throw lastError;
}
