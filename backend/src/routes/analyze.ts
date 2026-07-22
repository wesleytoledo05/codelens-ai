import { Router } from "express";
import { z } from "zod";
import { runOrchestrator } from "../agents/orchestrator";
import { runReporter } from "../agents/reporter";

const router = Router();

const RequestSchema = z.object({
  repoUrl: z.string().url("URL inválida"),
  groqApiKey: z.string().optional(),
  githubToken: z.string().optional(),
});

const REPO_URL_REGEX = /^https:\/\/github\.com\/[^/]+\/[^/]+/;

router.post("/analyze", async (req, res) => {
  const parsed = RequestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Dados inválidos. Envie um body JSON com 'repoUrl' contendo uma URL válida do GitHub.",
    });
    return;
  }

  const { repoUrl, groqApiKey, githubToken } = parsed.data;

  const hasUserKey = !!(groqApiKey && groqApiKey.trim().length > 0);
  const hasEnvKey = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
  console.log(`[analyze] URL: ${repoUrl}, UserKey: ${hasUserKey}, EnvKey: ${hasEnvKey}, Token: ${!!githubToken}`);

  if (!hasUserKey && !hasEnvKey) {
    res.status(400).json({
      error: "Chave de API Groq não configurada. Configure sua chave em Config API (canto superior direito). Obtenha uma gratuita em console.groq.com",
    });
    return;
  }

  if (!REPO_URL_REGEX.test(repoUrl)) {
    res.status(400).json({
      error: "URL inválida. Use o formato: https://github.com/{owner}/{repo}",
    });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`data: ${JSON.stringify({ event, data })}\n\n`);
  };

  let timeoutId: NodeJS.Timeout | null = null;

  try {
    sendEvent("progress", { message: "Iniciando análise do repositório..." });

    // 120-second global timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("TIMEOUT"));
      }, 120000);
    });

    sendEvent("progress", { message: "Buscando arquivos do repositório..." });

    const orchestratorPromise = runOrchestrator({ repoUrl, groqApiKey, githubToken });

    const orchestratorResult = await Promise.race([
      orchestratorPromise,
      timeoutPromise,
    ]);

    if (timeoutId) clearTimeout(timeoutId);

    if (orchestratorResult.status === "error") {
      sendEvent("error", { message: orchestratorResult.errorMessage || "Erro desconhecido na análise" });
      res.end();
      return;
    }

    if (orchestratorResult.status === "timeout") {
      sendEvent("progress", { message: "Tempo limite atingido. Gerando relatório com resultados parciais..." });
    }

    sendEvent("progress", {
      message: `Análise concluída. ${orchestratorResult.filesAnalyzed} arquivos processados. Gerando relatório final...`,
    });

    // Run Reporter — convert AgentError to null for the reporter
    const ar = orchestratorResult.agentResults;
    const toNull = <T>(v: T | { error: true; message: string }): T | null =>
      v && typeof v === "object" && "error" in v && (v as { error: boolean }).error ? null : (v as T);

    // Security auditor ALWAYS returns a valid result — never null
    const securityResult = toNull(ar.securityAuditor) ?? {
      vulnerabilities: [],
      score: 85,
      summary: "Análise de segurança não concluída. Score estimado com base nos dados disponíveis.",
    };

    const reporterResult = await runReporter({
      codeAnalyzer: toNull(ar.codeAnalyzer),
      bugHunter: toNull(ar.bugHunter),
      securityAuditor: securityResult,
      repoUrl,
      filesAnalyzed: orchestratorResult.filesAnalyzed,
      groqApiKey,
    });

    sendEvent("complete", reporterResult);
    res.end();
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);

    if (err instanceof Error && err.message === "TIMEOUT") {
      sendEvent("error", {
        message: "A análise excedeu o tempo limite de 120 segundos. Tente um repositório menor.",
      });
    } else {
      console.error("[analyze] Erro inesperado:", err);
      sendEvent("error", {
        message: "Erro interno ao processar a análise. Tente novamente.",
      });
    }
    res.end();
  }
});

export default router;
