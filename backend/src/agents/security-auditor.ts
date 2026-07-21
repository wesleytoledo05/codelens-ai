import { z } from "zod";
import { mimoChat } from "../lib/mimo-client";

const SecurityAuditorOutputSchema = z.object({
  vulnerabilities: z.array(z.object({
    id: z.string(),
    severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
    category: z.string(),
    file: z.string(),
    line: z.number(),
    description: z.string(),
    exploitationPath: z.string(),
    recommendation: z.string(),
    owasp: z.string(),
  })),
  score: z.number().min(0).max(100),
  summary: z.string(),
});

export type SecurityAuditorInput = {
  files: Array<{
    path: string;
    content: string;
    extension: string;
  }>;
};

export type SecurityAuditorOutput = z.infer<typeof SecurityAuditorOutputSchema>;

export class AgentExecutionError extends Error {
  constructor(agentName: string, message: string, public readonly cause?: unknown) {
    super(`[${agentName}] ${message}`);
    this.name = "AgentExecutionError";
  }
}

const SYSTEM_PROMPT = `Você é um especialista em segurança de aplicações. Analise o código buscando vulnerabilidades reais.
Para cada vulnerabilidade: arquivo, linha, severidade (CRITICAL/HIGH/MEDIUM/LOW), categoria, descrição, exploitationPath, recomendação, OWASP.
Se seguro, retorne array vazio e score alto.
Retorne APENAS JSON válido, sem markdown.`;

function extractJSON(response: string): unknown {
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch {}
  }
  const firstBrace = response.indexOf("{");
  const lastBrace = response.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(response.substring(firstBrace, lastBrace + 1)); } catch {}
  }
  throw new Error("No valid JSON found in response");
}

export async function runSecurityAuditor(
  input: SecurityAuditorInput
): Promise<SecurityAuditorOutput> {
  const filesDescription = input.files
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join("\n\n");

  const userPrompt = `Analise estes arquivos em busca de vulnerabilidades de segurança:

${filesDescription}

Retorne JSON:
{
  "vulnerabilities": [{"id": "SEC-001", "severity": "CRITICAL|HIGH|MEDIUM|LOW", "category": "TYPE", "file": "path", "line": 1, "description": "...", "exploitationPath": "...", "recommendation": "...", "owasp": "A01:2021 - ..."}],
  "score": 0-100,
  "summary": "Resumo em português"
}

Score: sem vulns CRITICAL/HIGH = 80-100, com CRITICAL = 0-40, sem vulns = 95-100.`;

  let rawText: string;
  try {
    rawText = await mimoChat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 8192 }
    );
  } catch (error) {
    throw new AgentExecutionError("SecurityAuditor", "Failed to call AI API", error);
  }

  let parsed: SecurityAuditorOutput;
  try {
    const raw = extractJSON(rawText);
    const result = SecurityAuditorOutputSchema.safeParse(raw);
    if (result.success) {
      parsed = result.data;
    } else {
      const coerced = coerceSecurityOutput(raw);
      if (!coerced) throw new Error("Could not coerce response");
      parsed = coerced;
    }
  } catch {
    // Retry
    try {
      const retryText = await mimoChat(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
          { role: "assistant", content: rawText },
          {
            role: "user",
            content: "Sua resposta não era JSON válido. Retorne APENAS um objeto JSON válido. Sem markdown, sem texto antes ou depois.",
          },
        ],
        { maxTokens: 8192 }
      );
      const raw = extractJSON(retryText);
      const result = SecurityAuditorOutputSchema.safeParse(raw);
      if (result.success) {
        parsed = result.data;
      } else {
        const coerced = coerceSecurityOutput(raw);
        if (!coerced) throw new Error("Could not coerce retry");
        parsed = coerced;
      }
    } catch (retryErr) {
      throw new AgentExecutionError("SecurityAuditor", "Failed to parse JSON after retry", retryErr);
    }
  }

  // Ensure sequential IDs
  parsed.vulnerabilities = parsed.vulnerabilities.map((v, i) => ({
    ...v,
    id: `SEC-${String(i + 1).padStart(3, "0")}`,
  }));

  // Enforce max 50 vulnerabilities
  if (parsed.vulnerabilities.length > 50) {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    parsed.vulnerabilities.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    parsed.vulnerabilities = parsed.vulnerabilities.slice(0, 50);
    parsed.vulnerabilities = parsed.vulnerabilities.map((v, i) => ({
      ...v,
      id: `SEC-${String(i + 1).padStart(3, "0")}`,
    }));
  }

  parsed.score = Math.max(0, Math.min(100, parsed.score));
  return parsed;
}

function coerceSecurityOutput(raw: unknown): SecurityAuditorOutput | null {
  try {
    const obj = raw as Record<string, unknown>;
    const vulns = Array.isArray(obj.vulnerabilities) ? obj.vulnerabilities : [];
    const validSeverities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

    const vulnerabilities = vulns
      .filter((v: unknown) => {
        const vv = v as Record<string, unknown>;
        return vv && typeof vv.file === "string";
      })
      .map((v: unknown) => {
        const vv = v as Record<string, unknown>;
        const sev = typeof vv.severity === "string" && validSeverities.includes(vv.severity.toUpperCase())
          ? vv.severity.toUpperCase() as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
          : "MEDIUM";
        return {
          id: typeof vv.id === "string" ? vv.id : "SEC-000",
          severity: sev,
          category: typeof vv.category === "string" ? vv.category : "UNKNOWN",
          file: vv.file as string,
          line: typeof vv.line === "number" ? vv.line : 0,
          description: typeof vv.description === "string" ? vv.description : "Sem descrição",
          exploitationPath: typeof vv.exploitationPath === "string" ? vv.exploitationPath : "",
          recommendation: typeof vv.recommendation === "string" ? vv.recommendation : "Sem recomendação",
          owasp: typeof vv.owasp === "string" ? vv.owasp : "",
        };
      });

    const score = typeof obj.score === "number" ? Math.max(0, Math.min(100, obj.score)) : 50;
    const summary = typeof obj.summary === "string" ? obj.summary : "Análise completa";

    return { vulnerabilities, score, summary };
  } catch {
    return null;
  }
}
