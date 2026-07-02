import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// --- Zod Schemas ---

const VulnerabilitySchema = z.object({
  id: z.string(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  category: z.string(),
  file: z.string(),
  line: z.number(),
  description: z.string(),
  exploitationPath: z.string(),
  recommendation: z.string(),
  owasp: z.string(),
});

const SecurityAuditorOutputSchema = z.object({
  vulnerabilities: z.array(VulnerabilitySchema),
  score: z.number().min(0).max(100),
  summary: z.string(),
});

// --- Types ---

export type SecurityAuditorInput = {
  files: Array<{
    path: string;
    content: string;
    extension: string;
  }>;
};

export type SecurityAuditorOutput = z.infer<typeof SecurityAuditorOutputSchema>;

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

// --- System Prompt (from spec) ---

const SYSTEM_PROMPT = `Você é um especialista sênior em segurança de aplicações (AppSec) com
certificação OSCP. Analise o código fornecido buscando vulnerabilidades de
segurança reais e específicas — não genéricas.

Para cada vulnerabilidade encontrada:
1. Identifique o arquivo exato e a linha aproximada.
2. Classifique a severidade e mapeie para OWASP Top 10 2021.
3. No campo 'exploitationPath', descreva de forma técnica e didática o passo a passo que um atacante seguiria para explorar essa falha específica (ex: qual payload usaria, qual seria o impacto final).

Seja rigoroso mas preciso: não invente vulnerabilidades que não existem no
código fornecido. Se o código estiver seguro, retorne um array vazio e score alto.

Retorne APENAS um objeto JSON válido, sem markdown, sem blocos de código,
sem explicações antes ou depois. Siga EXATAMENTE o schema fornecido.`;

// --- Agent Function ---

export async function runSecurityAuditor(
  input: SecurityAuditorInput
): Promise<SecurityAuditorOutput> {
  const filesDescription = input.files
    .map(
      (f) =>
        `--- FILE: ${f.path} (${f.extension}) ---\n${f.content}\n--- END FILE ---`
    )
    .join("\n\n");

  const userPrompt = `Analise os seguintes arquivos de código em busca de vulnerabilidades de segurança.

Arquivos:
${filesDescription}

Schema de resposta JSON:
{
  "vulnerabilities": [
    {
      "id": "SEC-001",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW",
      "category": "ex: SQL_INJECTION, HARDCODED_SECRET, XSS",
      "file": "caminho/do/arquivo",
      "line": 10,
      "description": "Descrição clara do problema",
      "exploitationPath": "Passo a passo de como um invasor exploraria essa falha",
      "recommendation": "Como corrigir",
      "owasp": "A03:2021 - Injection (ou string vazia se não mapear)"
    }
  ],
  "score": 0-100,
  "summary": "Resumo executivo em português"
}

Regras de score:
- Nenhuma vulnerabilidade CRITICAL/HIGH: score 80-100
- Presença de CRITICAL: score 0-40
- Sem vulnerabilidades: score 95-100

Limite máximo: 50 vulnerabilidades. Priorize CRITICAL e HIGH.
IDs sequenciais: SEC-001, SEC-002, SEC-003...
O campo owasp pode ser string vazia quando não mapeia para OWASP.`;

  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawText =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Attempt parse
  let parsed: SecurityAuditorOutput;
  try {
    parsed = SecurityAuditorOutputSchema.parse(JSON.parse(rawText));
  } catch {
    // Retry once asking for correct format
    const retryResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userPrompt },
        {
          role: "assistant",
          content: rawText,
        },
        {
          role: "user",
          content:
            "Sua resposta anterior não estava em JSON válido. Retorne APENAS um objeto JSON válido seguindo EXATAMENTE o schema fornecido. Sem markdown, sem blocos de código, sem texto antes ou depois.",
        },
      ],
    });

    const retryText =
      retryResponse.content[0].type === "text"
        ? retryResponse.content[0].text
        : "";

    try {
      parsed = SecurityAuditorOutputSchema.parse(JSON.parse(retryText));
    } catch (retryErr) {
      throw new AgentExecutionError(
        "SecurityAuditor",
        "Failed to parse AI response as valid JSON after retry",
        retryErr
      );
    }
  }

  // Ensure sequential IDs
  parsed.vulnerabilities = parsed.vulnerabilities.map((v, i) => ({
    ...v,
    id: `SEC-${String(i + 1).padStart(3, "0")}`,
  }));

  // Enforce max 50 vulnerabilities, prioritizing CRITICAL and HIGH
  if (parsed.vulnerabilities.length > 50) {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    parsed.vulnerabilities.sort(
      (a, b) =>
        severityOrder[a.severity] - severityOrder[b.severity]
    );
    parsed.vulnerabilities = parsed.vulnerabilities.slice(0, 50);
    // Re-number after truncation
    parsed.vulnerabilities = parsed.vulnerabilities.map((v, i) => ({
      ...v,
      id: `SEC-${String(i + 1).padStart(3, "0")}`,
    }));
  }

  // Validate score bounds
  parsed.score = Math.max(0, Math.min(100, parsed.score));

  return parsed;
}
