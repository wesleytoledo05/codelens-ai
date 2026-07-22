import type { ReporterOutput, SSEEvent } from "../types";
import { USE_MOCK } from "../config";
import { mockAnalysisResult } from "../mocks/analysisResult";

const BASE_URL: string =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

type ApiKeys = {
  groqApiKey: string;
  githubToken: string;
};

type Callbacks = {
  onProgress: (message: string) => void;
  onComplete: (report: ReporterOutput) => void;
  onError: (message: string) => void;
};

const MOCK_STAGES = [
  "Conectando ao repositório GitHub...",
  "Clonando arquivos do repositório...",
  "Code Analyzer analisando qualidade do código...",
  "Bug Hunter detectando antipatterns e code smells...",
  "Security Auditor verificando vulnerabilidades OWASP...",
  "Reporter consolidando resultados...",
  "Gerando relatório final...",
];

async function mockStreamAnalysis(callbacks: Callbacks): Promise<void> {
  for (const msg of MOCK_STAGES) {
    callbacks.onProgress(msg);
    await new Promise((r) => setTimeout(r, 400));
  }
  callbacks.onComplete(mockAnalysisResult);
}

async function realStreamAnalysis(
  repoUrl: string,
  callbacks: Callbacks,
  keys?: ApiKeys
): Promise<void> {
  const response = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repoUrl,
      groqApiKey: keys?.groqApiKey || undefined,
      githubToken: keys?.githubToken || undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    callbacks.onError(
      error?.error || `Erro HTTP ${response.status}`
    );
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError("Não foi possível ler a resposta do servidor.");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        try {
          const parsed: SSEEvent = JSON.parse(line.slice(6));

          switch (parsed.event) {
            case "progress":
              callbacks.onProgress(
                (parsed.data as { message: string }).message
              );
              break;
            case "complete":
              callbacks.onComplete(parsed.data as ReporterOutput);
              break;
            case "error":
              callbacks.onError(
                (parsed.data as { message: string }).message
              );
              break;
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function streamAnalysis(
  repoUrl: string,
  callbacks: Callbacks,
  keys?: ApiKeys
): Promise<void> {
  if (USE_MOCK) {
    return mockStreamAnalysis(callbacks);
  }
  return realStreamAnalysis(repoUrl, callbacks, keys);
}
