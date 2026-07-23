import { z } from "zod";
import { fetchRepositoryFiles } from "../tools/githubFetcher";
import { limitFiles } from "../lib/mimo-client";
import { runCodeAnalyzer, type CodeAnalyzerInput } from "./code-analyzer";
import { runBugHunter, type BugHunterInput, type BugHunterOutput } from "./bug-hunter";
import {
  runSecurityAuditor,
  type SecurityAuditorInput,
  type SecurityAuditorOutput,
} from "./security-auditor";
import type { ApiKeys } from "../types";

// --- Types ---

export type OrchestratorInput = {
  repoUrl: string;
} & ApiKeys;

type CodeAnalyzerOutput = {
  score: number;
  metrics: {
    averageFunctionLength: number;
    duplicatedBlocks: number;
    filesWithoutTypes: number;
  };
  issues: Array<{
    file: string;
    line: number;
    type: string;
    description: string;
    suggestion: string;
  }>;
};

type AgentError = {
  error: true;
  message: string;
};

export type OrchestratorOutput = {
  status: "complete" | "timeout" | "error";
  agentResults: {
    codeAnalyzer: CodeAnalyzerOutput | AgentError;
    bugHunter: BugHunterOutput | AgentError;
    securityAuditor: SecurityAuditorOutput | AgentError;
  };
  filesAnalyzed: number;
  errorMessage?: string;
};

const OrchestratorOutputSchema = z.object({
  status: z.enum(["complete", "timeout", "error"]),
  agentResults: z.object({
    codeAnalyzer: z.any(),
    bugHunter: z.any(),
    securityAuditor: z.any(),
  }),
  filesAnalyzed: z.number(),
  errorMessage: z.string().optional(),
});

const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/;

async function safeRun<T>(
  fn: () => Promise<T>,
  agentName: string
): Promise<T | AgentError> {
  try {
    return await fn();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : `Falha desconhecida no agente ${agentName}`;
    return { error: true, message };
  }
}

const errorResult = (msg: string) => ({
  codeAnalyzer: { error: true as const, message: msg },
  bugHunter: { error: true as const, message: msg },
  securityAuditor: { error: true as const, message: msg },
});

export async function runOrchestrator(
  input: OrchestratorInput
): Promise<OrchestratorOutput> {
  const { groqApiKey, githubToken } = input;

  if (!GITHUB_URL_REGEX.test(input.repoUrl)) {
    return {
      status: "error",
      agentResults: errorResult("Agente não executado"),
      filesAnalyzed: 0,
      errorMessage: "URL inválida. Use o formato: https://github.com/{owner}/{repo}",
    };
  }

  let files: Awaited<ReturnType<typeof fetchRepositoryFiles>>;
  try {
    const fetchPromise = fetchRepositoryFiles(input.repoUrl, githubToken || process.env.GITHUB_TOKEN);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT_EXCEEDED")), 120_000)
    );
    files = await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err) {
    if (err instanceof Error && err.message === "TIMEOUT_EXCEEDED") {
      return {
        status: "timeout",
        agentResults: errorResult("Agente não executado"),
        filesAnalyzed: 0,
        errorMessage: "Tempo limite excedido ao buscar arquivos do repositório.",
      };
    }
    const message = err instanceof Error ? err.message : "Não foi possível acessar o repositório.";
    return {
      status: "error",
      agentResults: errorResult("Agente não executado"),
      filesAnalyzed: 0,
      errorMessage: message,
    };
  }

  if (files.length === 0) {
    return {
      status: "error",
      agentResults: errorResult("Agente não executado"),
      filesAnalyzed: 0,
      errorMessage: "Nenhum arquivo relevante encontrado no repositório.",
    };
  }

  // Run 3 agents sequentially with 60s delays to respect Groq free tier TPM (6000 tokens/min)
  // Each agent sends ~2000 tokens input + gets ~2000 tokens output = ~4000 tokens per agent
  // With 60s gaps, each agent gets its own 1-minute TPM window
  const agentInput = { files: limitFiles(files), groqApiKey };
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const agentsPromise = (async () => {
    const results: unknown[] = [];

    results.push(await safeRun(() => runCodeAnalyzer(agentInput as CodeAnalyzerInput), "CodeAnalyzer"));

    await delay(65000); // Wait 65s — well past the 1-minute TPM window

    results.push(await safeRun(() => runBugHunter(agentInput as BugHunterInput), "BugHunter"));

    await delay(65000); // Wait 65s for TPM reset

    // Security auditor gets its own 90s timeout so it always has time to run
    const securityTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("SECURITY_TIMEOUT")), 90_000)
    );
    const securityResult = await Promise.race([
      safeRun(() => runSecurityAuditor(agentInput as SecurityAuditorInput), "SecurityAuditor"),
      securityTimeout,
    ]).catch(() => ({
      error: true as const,
      message: "Security Auditor excedeu tempo limite próprio",
    }));
    results.push(securityResult);

    return results as [
      CodeAnalyzerOutput | AgentError,
      BugHunterOutput | AgentError,
      SecurityAuditorOutput | AgentError,
    ];
  })();

  // Global timeout: 65s delay + 65s delay + 90s security + ~30s execution = ~250s buffer
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("TIMEOUT_EXCEEDED")), 300_000)
  );

  let results: [
    CodeAnalyzerOutput | AgentError,
    BugHunterOutput | AgentError,
    SecurityAuditorOutput | AgentError,
  ];

  try {
    results = await Promise.race([agentsPromise, timeoutPromise]);
  } catch (err) {
    if (err instanceof Error && err.message === "TIMEOUT_EXCEEDED") {
      const settled = await Promise.allSettled([
        runCodeAnalyzer(agentInput as CodeAnalyzerInput).catch(() => null),
        runBugHunter(agentInput as BugHunterInput).catch(() => null),
        runSecurityAuditor(agentInput as SecurityAuditorInput).catch(() => null),
      ]);

      return {
        status: "timeout",
        agentResults: {
          codeAnalyzer: settled[0].status === "fulfilled" && settled[0].value
            ? settled[0].value
            : { error: true, message: "Agente não concluído a tempo" },
          bugHunter: settled[1].status === "fulfilled" && settled[1].value
            ? settled[1].value
            : { error: true, message: "Agente não concluído a tempo" },
          securityAuditor: settled[2].status === "fulfilled" && settled[2].value
            ? settled[2].value
            : { error: true, message: "Agente não concluído a tempo" },
        },
        filesAnalyzed: files.length,
        errorMessage: "Tempo limite de 5 minutos excedido. Resultados parciais disponíveis.",
      };
    }
    return {
      status: "error",
      agentResults: errorResult("Agente não executado"),
      filesAnalyzed: files.length,
      errorMessage: "Erro desconhecido durante a execução dos agentes.",
    };
  }

  const output: OrchestratorOutput = {
    status: "complete",
    agentResults: {
      codeAnalyzer: results[0],
      bugHunter: results[1],
      securityAuditor: results[2],
    },
    filesAnalyzed: files.length,
  };

  OrchestratorOutputSchema.parse(output);
  return output;
}
