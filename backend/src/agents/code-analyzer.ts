import { z } from "zod";
import { mimoChat } from "../lib/mimo-client";
import type { ApiKeys } from "../types";

const OutputSchema = z.object({
  score: z.number().min(0).max(100),
  metrics: z.object({
    averageFunctionLength: z.number(),
    duplicatedBlocks: z.number(),
    filesWithoutTypes: z.number(),
  }),
  issues: z.array(z.object({
    file: z.string(),
    line: z.number(),
    type: z.string(),
    description: z.string(),
    suggestion: z.string(),
  })),
});

type CodeAnalyzerOutput = z.infer<typeof OutputSchema>;

export type CodeAnalyzerInput = {
  files: Array<{
    path: string;
    content: string;
    extension: string;
  }>;
} & ApiKeys;

const SYSTEM_PROMPT = `You are a code quality analyzer. Analyze code and return ONLY valid JSON.

Return this structure:
{"score": 0-100, "metrics": {"averageFunctionLength": number, "duplicatedBlocks": number, "filesWithoutTypes": number}, "issues": [{"file": "path", "line": 1, "type": "TYPE", "description": "...", "suggestion": "..."}]}

Analyze: cyclomatic complexity, duplication, function size, naming, type coverage.
No markdown, no explanation — ONLY the JSON object.`;

function extractJSON(response: string): unknown {
  // 1. Try code blocks
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch {}
  }
  // 2. Try first { to last }
  const firstBrace = response.indexOf("{");
  const lastBrace = response.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(response.substring(firstBrace, lastBrace + 1)); } catch {}
  }
  throw new Error("No valid JSON found in response");
}

class AgentExecutionError extends Error {
  constructor(message: string, public readonly agentName: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AgentExecutionError";
  }
}

export async function runCodeAnalyzer(input: CodeAnalyzerInput): Promise<CodeAnalyzerOutput> {
  const apiKey = input.groqApiKey;
  const fileContents = input.files
    .map((f) => `=== ${f.path} ===\n${f.content}`)
    .join("\n\n");

  const userMessage = `Analyze these files for quality issues:\n\n${fileContents}`;

  let lastError: unknown;

  // First attempt
  try {
    const response = await mimoChat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      { maxTokens: 2048, apiKey }
    );

    const parsed = extractJSON(response);
    const result = OutputSchema.safeParse(parsed);
    if (result.success) return result.data;
    const coerced = coerceCodeAnalyzerOutput(parsed);
    if (coerced) return coerced;
  } catch (error) {
    lastError = error;
  }

  // Retry
  try {
    const retryResponse = await mimoChat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
        { role: "assistant", content: "Let me provide the analysis." },
        {
          role: "user",
          content: "Your previous response was not valid JSON. Return ONLY a valid JSON object matching the required structure. No markdown, no explanation.",
        },
      ],
      { maxTokens: 2048, apiKey }
    );

    const parsed = extractJSON(retryResponse);
    const result = OutputSchema.safeParse(parsed);
    if (result.success) return result.data;
    const coerced = coerceCodeAnalyzerOutput(parsed);
    if (coerced) return coerced;
  } catch (error) {
    // will throw below
  }

  throw new AgentExecutionError("Failed to get valid analysis after retry", "CodeAnalyzer", lastError);
}

function coerceCodeAnalyzerOutput(raw: unknown): CodeAnalyzerOutput | null {
  try {
    const obj = raw as Record<string, unknown>;
    const metrics = (obj.metrics ?? {}) as Record<string, unknown>;
    const issuesArr = Array.isArray(obj.issues) ? obj.issues : [];

    return {
      score: typeof obj.score === "number" ? Math.max(0, Math.min(100, obj.score)) : 50,
      metrics: {
        averageFunctionLength: typeof metrics.averageFunctionLength === "number" ? metrics.averageFunctionLength : 0,
        duplicatedBlocks: typeof metrics.duplicatedBlocks === "number" ? metrics.duplicatedBlocks : 0,
        filesWithoutTypes: typeof metrics.filesWithoutTypes === "number" ? metrics.filesWithoutTypes : 0,
      },
      issues: issuesArr.map((i: unknown, idx: number) => {
        const ii = i as Record<string, unknown>;
        return {
          file: typeof ii.file === "string" ? ii.file : `file-${idx}`,
          line: typeof ii.line === "number" ? ii.line : 0,
          type: typeof ii.type === "string" ? ii.type : "UNKNOWN",
          description: typeof ii.description === "string" ? ii.description : "No description",
          suggestion: typeof ii.suggestion === "string" ? ii.suggestion : "No suggestion",
        };
      }),
    };
  } catch {
    return null;
  }
}
