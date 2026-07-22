import { z } from "zod";
import { mimoChat } from "../lib/mimo-client";
import type { ApiKeys } from "../types";

// Types
export type BugHunterInput = {
  files: Array<{
    path: string;
    content: string;
    extension: string;
  }>;
} & ApiKeys;

export type BugHunterOutput = {
  bugs: Array<{
    id: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    file: string;
    line: number;
    description: string;
    suggestion: string;
  }>;
};

const OutputSchema = z.object({
  bugs: z.array(z.object({
    id: z.string(),
    severity: z.enum(["HIGH", "MEDIUM", "LOW"]),
    file: z.string(),
    line: z.number(),
    description: z.string(),
    suggestion: z.string(),
  })),
});

const SYSTEM_PROMPT = `Você é um agente Caça-Bugs. Analise código em busca de bugs, antipatterns e code smells.

Encontre: código morto, condições impossíveis, acesso a null/undefined, loops infinitos, vazamentos de memória, promises sem tratamento, antipatterns.

Para cada bug forneça: id (BUG-001), severidade (HIGH/MEDIUM/LOW), arquivo, número da linha, descrição, sugestão.

IMPORTANTE: Retorne APENAS JSON válido. Sem markdown, sem explicação. As descrições e sugestões devem estar em português.`;

export class AgentExecutionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "AgentExecutionError";
  }
}

// Robust JSON extraction from AI response
function extractJSON(response: string): unknown {
  // 1. Try to extract from markdown code blocks
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // 2. Try to find first { to last } (handles text before/after JSON)
  const firstBrace = response.indexOf("{");
  const lastBrace = response.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(response.substring(firstBrace, lastBrace + 1));
    } catch {}
  }

  // 3. Try to find first [ to last ] (in case it returns an array)
  const firstBracket = response.indexOf("[");
  const lastBracket = response.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(response.substring(firstBracket, lastBracket + 1));
    } catch {}
  }

  throw new Error("No valid JSON found in response");
}

export async function runBugHunter(
  input: BugHunterInput
): Promise<BugHunterOutput> {
  const apiKey = input.groqApiKey;
  const filesContent = input.files
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join("\n\n");

  const userMessage = `Analise estes arquivos em busca de bugs e antipatterns.

${filesContent}

Retorne JSON: {"bugs": [{"id": "BUG-001", "severity": "HIGH|MEDIUM|LOW", "file": "path", "line": 1, "description": "descrição em português", "suggestion": "sugestão em português"}]}

Se não houver bugs: {"bugs": []}

Lembre-se: description e suggestion DEVEM estar em português brasileiro.`;

  let response: string;

  try {
    response = await mimoChat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      { maxTokens: 4096, apiKey }
    );
  } catch (error) {
    throw new AgentExecutionError(
      "Failed to call AI API",
      error instanceof Error ? error : undefined
    );
  }

  // Try to parse JSON from response
  let parsed: unknown;
  try {
    parsed = extractJSON(response);
  } catch {
    // Retry with explicit format request
    try {
      const retryResponse = await mimoChat(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
          { role: "assistant", content: response },
          {
            role: "user",
            content: "Your response was not valid JSON. Respond with ONLY a valid JSON object. No markdown, no explanation.",
          },
        ],
        { maxTokens: 4096, apiKey }
      );
      parsed = extractJSON(retryResponse);
    } catch (retryError) {
      throw new AgentExecutionError(
        "Failed to parse AI response as JSON after retry",
        retryError instanceof Error ? retryError : undefined
      );
    }
  }

  // Validate with Zod, or coerce
  const result = OutputSchema.safeParse(parsed);
  if (result.success) {
    const translated = result.data.bugs.map(bug => ({
      ...bug,
      description: translateToPortuguese(bug.description),
      suggestion: translateToPortuguese(bug.suggestion),
    }));
    return { bugs: translated } as BugHunterOutput;
  }

  // Try coercion
  const coerced = coerceBugHunterOutput(parsed);
  if (coerced) return coerced;

  throw new AgentExecutionError("AI response does not match expected schema");
}

function translateToPortuguese(text: string): string {
  if (!text) return text;
  const mappings: [RegExp, string][] = [
    // Padrões gerais
    [/is not set, which can cause ([^.]+)\./g, "não está definido(a), o que pode causar $1."],
    [/is not set\b/g, "não está definido(a)"],
    [/which can cause ([^.]+)\./g, "o que pode causar $1."],
    [/database connection issues/g, "problemas de conexão com o banco de dados"],
    [/Set a valid ([^.]+)\./g, "Defina um valor válido para $1."],
    [/is set to ([^,]+), but the ([^.]+) are not set\./g, "está configurado como $1, mas $2 não estão definidos."],
    [/is set to ([^,]+), but the ([^.]+) is not set\./g, "está configurado como $1, mas $2 não está definido(a)."],
    [/Verify the ([^.]+)\./g, "Verifique $1."],
    [/ensure they are correctly configured/g, "certifique-se de que estão corretamente configurados"],
    [/is not checked for null or undefined before being used/g, "não é verificado como nulo ou indefinido antes de ser usado"],
    [/should be checked to prevent null\/undefined access/g, "deve ser verificado para prevenir acesso a nulo/indefinido"],
    [/Add a null check for the ([^.]+) before using it/g, "Adicione uma verificação de nulo para $1 antes de usá-lo"],
    [/can be of type 'any'/g, "pode ser do tipo 'any'"],
    [/should be of type '([^']+)'/g, "deve ser do tipo '$1'"],
    [/to ensure type safety/g, "para garantir a segurança de tipos"],
    [/Change the type of the ([^.]+) to '([^']+)'/g, "Altere o tipo de $1 para '$2'"],
    [/to match the database type/g, "para corresponder ao tipo do banco de dados"],
    [/No description/g, "Sem descrição"],
    [/No suggestion/g, "Sem sugestão"],
    // Padrões mais longos
    [/The '([^']+)' parameter in the '([^']+)' and '([^']+)' methods can be of type 'any'\./g, "O parâmetro '$1' nos métodos '$2' e '$3' pode ser do tipo 'any'."],
    [/It should be of type '([^']+) to ensure type safety\./g, "Deve ser do tipo '$1' para garantir a segurança de tipos."],
    [/The '([^']+)' method does not check if the '([^']+)' parameter is null or undefined before using it\./g, "O método '$1' não verifica se o parâmetro '$2' é nulo ou indefinido antes de usá-lo."],
    [/It should be checked to prevent null\/undefined access\./g, "Deve ser verificado para prevenir acesso a nulo/indefinido."],
    [/The '([^']+)' property in the '([^']+)' type is of type '([^']+)', but it should be of type '([^']+)' to match the database type\./g, "A propriedade '$1' no tipo '$2' é do tipo '$3', mas deve ser do tipo '$4' para corresponder ao tipo do banco de dados."],
    [/The '([^']+)' variable is not checked for null or undefined before being used\./g, "A variável '$1' não é verificada como nulo ou indefinida antes de ser usada."],
    [/It should be checked to prevent null\/undefined access\./g, "Deve ser verificado para prevenir acesso a nulo/indefinido."],
    [/Change the type of the ([^.]+) to '([^']+)'\./g, "Altere o tipo de $1 para '$2'."],
    [/Verify the ([^.]+) and ensure they are correctly configured\./g, "Verifique $1 e certifique-se de que estão corretamente configurados."],
    // Tradução de frases inteiras comuns
    [/The '([^']+)' ([^ ]+) is not checked for null or undefined before being used\./g, "O $2 '$1' não é verificado como nulo ou indefinido antes de ser usado."],
    [/The ([^ ]+) ([^ ]+) is not checked for null or undefined before being used\./g, "O $1 $2 não é verificado como nulo ou indefinido antes de ser usado."],
    [/should be checked to prevent null\/undefined access\./g, "deve ser verificado para prevenir acesso a nulo/indefinido."],
    [/Add a null check for the ([^.]+) before using it\./g, "Adicione uma verificação de nulo para $1 antes de usá-lo."],
    // Padrões de "Change the type"
    [/Change the type of the ([^ ]+) property to '([^']+)'\./g, "Altere o tipo da propriedade $1 para '$2'."],
    [/Change the type of the ([^ ]+) parameter to '([^']+)'\./g, "Altere o tipo do parâmetro $1 para '$2'."],
    // Padrões de "Verify"
    [/Verify the ([^ ]+) settings and ensure they are correctly configured\./g, "Verifique as configurações de $1 e certifique-se de que estão corretamente configurados."],
    // catch-all para frases que ainda estejam em inglês
    [/The ([^ ]+) ([^ ]+) ([^ ]+) is not checked/g, "O $1 $2 $3 não é verificado"],
    [/should be checked to prevent/g, "deve ser verificado para prevenir"],
    [/before being used/g, "antes de ser usado"],
    [/to prevent null\/undefined access/g, "para prevenir acesso a nulo/indefinido"],
  ];
  let result = text;
  for (const [pattern, replacement] of mappings) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function coerceBugHunterOutput(raw: unknown): BugHunterOutput | null {
  try {
    const obj = raw as Record<string, unknown>;
    const bugsArr = Array.isArray(obj.bugs) ? obj.bugs : [];
    const validSeverities = ["HIGH", "MEDIUM", "LOW"];

    const bugs = bugsArr
      .filter((b: unknown) => {
        const bb = b as Record<string, unknown>;
        return bb && typeof bb.file === "string";
      })
      .map((b: unknown, i: number) => {
        const bb = b as Record<string, unknown>;
        const sev = typeof bb.severity === "string" && validSeverities.includes(bb.severity.toUpperCase())
          ? bb.severity.toUpperCase() as "HIGH" | "MEDIUM" | "LOW"
          : "MEDIUM";
        return {
          id: typeof bb.id === "string" ? bb.id : `BUG-${String(i + 1).padStart(3, "0")}`,
          severity: sev,
          file: bb.file as string,
          line: typeof bb.line === "number" ? bb.line : 0,
          description: translateToPortuguese(typeof bb.description === "string" ? bb.description : "Sem descrição"),
          suggestion: translateToPortuguese(typeof bb.suggestion === "string" ? bb.suggestion : "Sem sugestão"),
        };
      });

    return { bugs };
  } catch {
    return null;
  }
}
