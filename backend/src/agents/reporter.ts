import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// --- Import types from other agents ---

import type { BugHunterOutput } from "./bug-hunter";
import type { SecurityAuditorOutput } from "./security-auditor";
import type { DocWriterOutput } from "./doc-writer";
import type { ArchitectOutput } from "./architect";

// CodeAnalyzerOutput is not exported; define inline matching the code-analyzer spec
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

// --- Input Type ---

export type ReporterInput = {
  codeAnalyzer: CodeAnalyzerOutput | null;
  bugHunter: BugHunterOutput | null;
  securityAuditor: SecurityAuditorOutput | null;
  docWriter: DocWriterOutput | null;
  architect: ArchitectOutput | null;
  repoUrl: string;
  filesAnalyzed: number;
};

// --- Zod Output Schema ---

const ReporterOutputSchema = z.object({
  repoUrl: z.string(),
  filesAnalyzed: z.number(),
  overallScore: z.number().min(0).max(100),
  executiveSummary: z.string(),
  sections: z.object({
    quality: z.any().nullable(),
    bugs: z.any().nullable(),
    security: z.any().nullable(),
    documentation: z.any().nullable(),
    architecture: z.any().nullable(),
  }),
  generatedAt: z.string(),
});

// --- Custom Error ---

export class AgentExecutionError extends Error {
  constructor(
    agentName: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(`[${agentName}] ${message}`);
    this.name = "AgentExecutionError";
  }
}

// --- Score Weights ---

const WEIGHTS = {
  securityAuditor: 0.35,
  codeAnalyzer: 0.25,
  bugHunter: 0.2,
  architect: 0.1,
  docWriter: 0.1,
} as const;

// --- System Prompt for executive summary ---

const SUMMARY_SYSTEM_PROMPT = `Você é um redator técnico especializado em resumir análises de código para públicos que incluem pessoas não técnicas.

Gere um resumo executivo (2-3 frases) em português que destaque:
1. O score geral do repositório e o que ele significa na prática
2. As principais vulnerabilidades ou problemas encontrados (se houver)
3. Uma recomendação geral sobre a saúde do projeto

O resumo deve ser compreensível por alguém que não é desenvolvedor.
Seja direto e objetivo. Não use jargão técnico desnecessário.

Retorne APENAS o texto do resumo, sem JSON, sem markdown, sem formatação especial.`;

// --- Helper: get score from agent output ---

function getAgentScore(
  output: { score: number } | null | undefined
): number {
  if (!output || typeof output.score !== "number") return 50; // neutral default for missing
  return Math.max(0, Math.min(100, output.score));
}

// ArchitectOutput has no numeric score; derive a neutral default
function getArchitectScore(output: ArchitectOutput | null): number {
  if (!output) return 50;
  // Base score from patterns found (more patterns = more recognizable architecture)
  const patternScore = Math.min(output.patterns.length * 10, 40);
  // Deduct for excessive suggestions (indicates issues)
  const suggestionPenalty = Math.min(output.suggestions.length * 3, 20);
  return Math.max(40, Math.min(90, 60 + patternScore - suggestionPenalty));
}

// --- Main Function ---

export async function runReporter(
  input: ReporterInput
): Promise<z.infer<typeof ReporterOutputSchema>> {
  // 1. Calculate weighted overall score
  const scores = {
    securityAuditor: getAgentScore(input.securityAuditor),
    codeAnalyzer: getAgentScore(input.codeAnalyzer),
    bugHunter: getBugHunterScore(input.bugHunter),
    architect: getArchitectScore(input.architect),
    docWriter: getDocWriterScore(input.docWriter),
  };

  const overallScore =
    scores.securityAuditor * WEIGHTS.securityAuditor +
    scores.codeAnalyzer * WEIGHTS.codeAnalyzer +
    scores.bugHunter * WEIGHTS.bugHunter +
    scores.architect * WEIGHTS.architect +
    scores.docWriter * WEIGHTS.docWriter;

  // 2. Generate executive summary via Claude API
  const executiveSummary = await generateExecutiveSummary(
    input,
    Math.round(overallScore)
  );

  // 3. Build the output
  const output = {
    repoUrl: input.repoUrl,
    filesAnalyzed: input.filesAnalyzed,
    overallScore: Math.round(overallScore),
    executiveSummary,
    sections: {
      quality: input.codeAnalyzer,
      bugs: input.bugHunter,
      security: input.securityAuditor,
      documentation: input.docWriter,
      architecture: input.architect,
    },
    generatedAt: new Date().toISOString(),
  };

  // 4. Validate against schema
  try {
    return ReporterOutputSchema.parse(output);
  } catch (schemaError) {
    throw new AgentExecutionError(
      "Reporter",
      "Output does not match expected schema",
      schemaError
    );
  }
}

// --- Helper: derive bug hunter score from bugs list ---

function getBugHunterScore(output: BugHunterOutput | null): number {
  if (!output || !output.bugs || output.bugs.length === 0) return 90;

  const highCount = output.bugs.filter((b) => b.severity === "HIGH").length;
  const mediumCount = output.bugs.filter((b) => b.severity === "MEDIUM").length;

  // Start at 100, deduct per bug severity
  let score = 100;
  score -= highCount * 15;
  score -= mediumCount * 5;
  score -= (output.bugs.length - highCount - mediumCount) * 1;

  return Math.max(0, Math.min(100, score));
}

// --- Helper: derive doc writer score ---

function getDocWriterScore(output: DocWriterOutput | null): number {
  if (!output) return 50;

  // Has README + few missing docs = high score
  const hasReadme = output.readme && output.readme.length > 50;
  const missingCount = output.missingDocs?.length ?? 0;

  let score = hasReadme ? 80 : 30;
  score -= missingCount * 2;

  return Math.max(0, Math.min(100, score));
}

// --- Generate executive summary via Claude ---

async function generateExecutiveSummary(
  input: ReporterInput,
  overallScore: number
): Promise<string> {
  const contextParts: string[] = [];

  contextParts.push(`Score geral do repositório: ${overallScore}/100`);
  contextParts.push(`Arquivos analisados: ${input.filesAnalyzed}`);

  if (input.securityAuditor) {
    const critCount = input.securityAuditor.vulnerabilities.filter(
      (v) => v.severity === "CRITICAL"
    ).length;
    const highCount = input.securityAuditor.vulnerabilities.filter(
      (v) => v.severity === "HIGH"
    ).length;
    contextParts.push(
      `Segurança: ${input.securityAuditor.vulnerabilities.length} vulnerabilidades (${critCount} CRITICAL, ${highCount} HIGH)`
    );
  } else {
    contextParts.push("Segurança: dados indisponíveis");
  }

  if (input.bugHunter) {
    contextParts.push(
      `Bugs: ${input.bugHunter.bugs.length} problemas encontrados`
    );
  } else {
    contextParts.push("Bugs: dados indisponíveis");
  }

  if (input.codeAnalyzer) {
    contextParts.push(
      `Qualidade de código: score ${input.codeAnalyzer.score}/100`
    );
  } else {
    contextParts.push("Qualidade de código: dados indisponíveis");
  }

  if (input.architect) {
    contextParts.push(
      `Padrões arquiteturais: ${input.architect.patterns.join(", ") || "nenhum identificado"}`
    );
  } else {
    contextParts.push("Arquitetura: dados indisponíveis");
  }

  if (input.docWriter) {
    const missingCount = input.docWriter.missingDocs?.length ?? 0;
    contextParts.push(
      `Documentação: ${missingCount} docs faltantes`
    );
  } else {
    contextParts.push("Documentação: dados indisponíveis");
  }

  const contextText = contextParts.join("\n");

  const client = new Anthropic();

  let lastError: unknown;

  // First attempt
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Gere um resumo executivo 2-3 frases em português baseado nos seguintes dados:\n\n${contextText}`,
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    if (block && block.type === "text") {
      return block.text.trim();
    }
  } catch (error) {
    lastError = error;
  }

  // Retry once
  try {
    const retryResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Gere um resumo executivo 2-3 frases em português baseado nos seguintes dados:\n\n${contextText}`,
        },
        {
          role: "assistant",
          content: "Vou gerar o resumo executivo agora.",
        },
        {
          role: "user",
          content:
            "Por favor, gere o resumo executivo em português, 2-3 frases, sem formatação markdown.",
        },
      ],
    });

    const retryBlock = retryResponse.content.find((b) => b.type === "text");
    if (retryBlock && retryBlock.type === "text") {
      return retryBlock.text.trim();
    }
  } catch (error) {
    lastError = error;
  }

  // If both fail, return a fallback summary
  if (lastError) {
    console.warn(
      "[Reporter] Failed to generate executive summary via AI, using fallback"
    );
  }

  return `O repositório analisado obteve score ${overallScore}/100 com ${input.filesAnalyzed} arquivos processados. A análise consolidou resultados de segurança, qualidade de código, bugs, documentação e arquitetura.`;
}
