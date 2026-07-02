import { z } from "zod";
import { fetchRepositoryFiles } from "../tools/githubFetcher";
import { runCodeAnalyzer, type CodeAnalyzerInput } from "./code-analyzer";
import { runBugHunter, type BugHunterInput, type BugHunterOutput } from "./bug-hunter";
import {
  runSecurityAuditor,
  type SecurityAuditorInput,
  type SecurityAuditorOutput,
} from "./security-auditor";
import { runDocWriter, type DocWriterInput, type DocWriterOutput } from "./doc-writer";
import { runArchitect, type ArchitectInput, type ArchitectOutput } from "./architect";

// --- Types ---

export type OrchestratorInput = {
  repoUrl: string;
};

// CodeAnalyzerOutput is not exported from code-analyzer; define inline
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

// Error wrapper for failed agents
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
    docWriter: DocWriterOutput | AgentError;
    architect: ArchitectOutput | AgentError;
  };
  filesAnalyzed: number;
  errorMessage?: string;
};

// --- Zod output schema ---

const AgentErrorSchema = z.object({
  error: z.literal(true),
  message: z.string(),
});

const OrchestratorOutputSchema = z.object({
  status: z.enum(["complete", "timeout", "error"]),
  agentResults: z.object({
    codeAnalyzer: z.any(),
    bugHunter: z.any(),
    securityAuditor: z.any(),
    docWriter: z.any(),
    architect: z.any(),
  }),
  filesAnalyzed: z.number(),
  errorMessage: z.string().optional(),
});

// --- URL validation ---

const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/;

function extractRepoName(url: string): string {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return "unknown";
  return `${match[1]}/${match[2].replace(/\.git$/, "")}`;
}

// --- Agent runner helpers ---

async function safeRun<T>(
  fn: () => Promise<T>,
  agentName: string
): Promise<T | AgentError> {
  try {
    return await fn();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : `Falha desconhecida no agente ${agentName}`;
    console.error(`[Orchestrator] ${agentName} failed: ${message}`);
    return { error: true, message };
  }
}

// --- Main orchestrator ---

export async function runOrchestrator(
  input: OrchestratorInput
): Promise<OrchestratorOutput> {
  // 1. Validate URL
  if (!GITHUB_URL_REGEX.test(input.repoUrl)) {
    return {
      status: "error",
      agentResults: {
        codeAnalyzer: { error: true, message: "Agente não executado" },
        bugHunter: { error: true, message: "Agente não executado" },
        securityAuditor: { error: true, message: "Agente não executado" },
        docWriter: { error: true, message: "Agente não executado" },
        architect: { error: true, message: "Agente não executado" },
      },
      filesAnalyzed: 0,
      errorMessage:
        "URL inválida. Use o formato: https://github.com/{owner}/{repo}",
    };
  }

  // 2. Fetch files with 120s global timeout
  let files: Awaited<ReturnType<typeof fetchRepositoryFiles>>;
  try {
    const fetchPromise = fetchRepositoryFiles(input.repoUrl, process.env.GITHUB_TOKEN);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("TIMEOUT_EXCEEDED")),
        120_000
      )
    );
    files = await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err) {
    if (err instanceof Error && err.message === "TIMEOUT_EXCEEDED") {
      return {
        status: "timeout",
        agentResults: {
          codeAnalyzer: { error: true, message: "Agente não executado" },
          bugHunter: { error: true, message: "Agente não executado" },
          securityAuditor: { error: true, message: "Agente não executado" },
          docWriter: { error: true, message: "Agente não executado" },
          architect: { error: true, message: "Agente não executado" },
        },
        filesAnalyzed: 0,
        errorMessage: "Tempo limite excedido ao buscar arquivos do repositório.",
      };
    }
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível acessar o repositório.";
    return {
      status: "error",
      agentResults: {
        codeAnalyzer: { error: true, message: "Agente não executado" },
        bugHunter: { error: true, message: "Agente não executado" },
        securityAuditor: { error: true, message: "Agente não executado" },
        docWriter: { error: true, message: "Agente não executado" },
        architect: { error: true, message: "Agente não executado" },
      },
      filesAnalyzed: 0,
      errorMessage: message,
    };
  }

  if (files.length === 0) {
    return {
      status: "error",
      agentResults: {
        codeAnalyzer: { error: true, message: "Agente não executado" },
        bugHunter: { error: true, message: "Agente não executado" },
        securityAuditor: { error: true, message: "Agente não executado" },
        docWriter: { error: true, message: "Agente não executado" },
        architect: { error: true, message: "Agente não executado" },
      },
      filesAnalyzed: 0,
      errorMessage: "Nenhum arquivo relevante encontrado no repositório.",
    };
  }

  // 3. Run 5 agents in parallel with overall 120s timeout
  const repoName = extractRepoName(input.repoUrl);

  const agentInput = { files };

  const agentsPromise = Promise.all([
    safeRun(() => runCodeAnalyzer(agentInput as CodeAnalyzerInput), "CodeAnalyzer"),
    safeRun(() => runBugHunter(agentInput as BugHunterInput), "BugHunter"),
    safeRun(
      () => runSecurityAuditor(agentInput as SecurityAuditorInput),
      "SecurityAuditor"
    ),
    safeRun(
      () => runDocWriter({ files, repoName } as DocWriterInput),
      "DocWriter"
    ),
    safeRun(() => runArchitect(agentInput as ArchitectInput), "Architect"),
  ]);

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("TIMEOUT_EXCEEDED")), 120_000)
  );

  let results: [
    CodeAnalyzerOutput | AgentError,
    BugHunterOutput | AgentError,
    SecurityAuditorOutput | AgentError,
    DocWriterOutput | AgentError,
    ArchitectOutput | AgentError,
  ];

  try {
    results = await Promise.race([agentsPromise, timeoutPromise]);
  } catch (err) {
    if (err instanceof Error && err.message === "TIMEOUT_EXCEEDED") {
      // Timeout: return partial results — agents that finished are included,
      // pending ones get error markers
      const settled = await Promise.allSettled([
        runCodeAnalyzer(agentInput as CodeAnalyzerInput).catch(() => null),
        runBugHunter(agentInput as BugHunterInput).catch(() => null),
        runSecurityAuditor(agentInput as SecurityAuditorInput).catch(() => null),
        runDocWriter({ files, repoName } as DocWriterInput).catch(() => null),
        runArchitect(agentInput as ArchitectInput).catch(() => null),
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
          docWriter: settled[3].status === "fulfilled" && settled[3].value
            ? settled[3].value
            : { error: true, message: "Agente não concluído a tempo" },
          architect: settled[4].status === "fulfilled" && settled[4].value
            ? settled[4].value
            : { error: true, message: "Agente não concluído a tempo" },
        },
        filesAnalyzed: files.length,
        errorMessage: "Tempo limite de 120 segundos excedido. Resultados parciais disponíveis.",
      };
    }
    // Should not reach here, but handle gracefully
    return {
      status: "error",
      agentResults: {
        codeAnalyzer: { error: true, message: "Agente não executado" },
        bugHunter: { error: true, message: "Agente não executado" },
        securityAuditor: { error: true, message: "Agente não executado" },
        docWriter: { error: true, message: "Agente não executado" },
        architect: { error: true, message: "Agente não executado" },
      },
      filesAnalyzed: files.length,
      errorMessage: "Erro desconhecido durante a execução dos agentes.",
    };
  }

  // 4. Build and validate output
  const output: OrchestratorOutput = {
    status: "complete",
    agentResults: {
      codeAnalyzer: results[0],
      bugHunter: results[1],
      securityAuditor: results[2],
      docWriter: results[3],
      architect: results[4],
    },
    filesAnalyzed: files.length,
  };

  OrchestratorOutputSchema.parse(output);

  return output;
}
