import { z } from "zod";
import { mimoChat } from "../lib/mimo-client";
import type { ApiKeys } from "../types";

import type { BugHunterOutput } from "./bug-hunter";
import type { SecurityAuditorOutput } from "./security-auditor";

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

export type ReporterInput = {
  codeAnalyzer: CodeAnalyzerOutput | null;
  bugHunter: BugHunterOutput | null;
  securityAuditor: SecurityAuditorOutput | null;
  repoUrl: string;
  filesAnalyzed: number;
} & ApiKeys;

const ReporterOutputSchema = z.object({
  repoUrl: z.string(),
  filesAnalyzed: z.number(),
  overallScore: z.number().min(0).max(100),
  executiveSummary: z.string(),
  sections: z.object({
    quality: z.any().nullable(),
    bugs: z.any().nullable(),
    security: z.any().nullable(),
  }),
  generatedAt: z.string(),
});

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

const WEIGHTS = {
  securityAuditor: 0.45,
  codeAnalyzer: 0.35,
  bugHunter: 0.2,
} as const;

const SUMMARY_SYSTEM_PROMPT = `Você é um redator técnico especializado em resumir análises de código para públicos que incluem pessoas não técnicas.

Gere um resumo executivo (2-3 frases) em português que destaque:
1. O score geral do repositório e o que ele significa na prática
2. As principais vulnerabilidades ou problemas encontrados (se houver)
3. Uma recomendação geral sobre a saúde do projeto

O resumo deve ser compreensível por alguém que não é desenvolvedor.
Seja direto e objetivo. Não use jargão técnico desnecessário.

Retorne APENAS o texto do resumo, sem JSON, sem markdown, sem formatação especial.`;

function getAgentScore(output: { score: number } | null | undefined): number {
  if (!output || typeof output.score !== "number") return 50;
  return Math.max(0, Math.min(100, output.score));
}

function getBugHunterScore(output: BugHunterOutput | null): number {
  if (!output || !output.bugs || output.bugs.length === 0) return 90;
  const highCount = output.bugs.filter((b) => b.severity === "HIGH").length;
  const mediumCount = output.bugs.filter((b) => b.severity === "MEDIUM").length;
  let score = 100;
  score -= highCount * 15;
  score -= mediumCount * 5;
  score -= (output.bugs.length - highCount - mediumCount) * 1;
  return Math.max(0, Math.min(100, score));
}

export async function runReporter(
  input: ReporterInput
): Promise<z.infer<typeof ReporterOutputSchema>> {
  const apiKey = input.groqApiKey;
  const scores = {
    securityAuditor: getAgentScore(input.securityAuditor),
    codeAnalyzer: getAgentScore(input.codeAnalyzer),
    bugHunter: getBugHunterScore(input.bugHunter),
  };

  const overallScore =
    scores.securityAuditor * WEIGHTS.securityAuditor +
    scores.codeAnalyzer * WEIGHTS.codeAnalyzer +
    scores.bugHunter * WEIGHTS.bugHunter;

  const executiveSummary = await generateExecutiveSummary(
    input,
    Math.round(overallScore),
    apiKey
  );

  const output = {
    repoUrl: input.repoUrl,
    filesAnalyzed: input.filesAnalyzed,
    overallScore: Math.round(overallScore),
    executiveSummary,
    sections: {
      quality: input.codeAnalyzer,
      bugs: input.bugHunter,
      security: input.securityAuditor,
    },
    generatedAt: new Date().toISOString(),
  };

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

async function generateExecutiveSummary(
  input: ReporterInput,
  overallScore: number,
  apiKey?: string
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
    contextParts.push(`Bugs: ${input.bugHunter.bugs.length} problemas encontrados`);
  } else {
    contextParts.push("Bugs: dados indisponíveis");
  }

  if (input.codeAnalyzer) {
    contextParts.push(`Qualidade de código: score ${input.codeAnalyzer.score}/100`);
  } else {
    contextParts.push("Qualidade de código: dados indisponíveis");
  }

  const contextText = contextParts.join("\n");

  let lastError: unknown;

  try {
    const response = await mimoChat(
      [
        { role: "system", content: SUMMARY_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Gere um resumo executivo 2-3 frases em português baseado nos seguintes dados:\n\n${contextText}`,
        },
      ],
      { maxTokens: 512, apiKey }
    );
    if (response) return response.trim();
  } catch (error) {
    lastError = error;
  }

  try {
    const retryResponse = await mimoChat(
      [
        { role: "system", content: SUMMARY_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Gere um resumo executivo 2-3 frases em português baseado nos seguintes dados:\n\n${contextText}`,
        },
        { role: "assistant", content: "Vou gerar o resumo executivo agora." },
        {
          role: "user",
          content: "Por favor, gere o resumo executivo em português, 2-3 frases, sem formatação markdown.",
        },
      ],
      { maxTokens: 512, apiKey }
    );
    if (retryResponse) return retryResponse.trim();
  } catch (error) {
    lastError = error;
  }

  if (lastError) {
    console.warn("[Reporter] Failed to generate executive summary via AI, using fallback");
  }

  return `O repositório analisado obteve score ${overallScore}/100 com ${input.filesAnalyzed} arquivos processados. A análise consolidou resultados de segurança, qualidade de código e bugs.`;
}
