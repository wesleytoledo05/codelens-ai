import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// --- Zod Schemas ---

const MissingDocSchema = z.object({
  file: z.string(),
  description: z.string(),
});

const OutputSchema = z.object({
  readme: z.string().describe("Complete markdown README generated"),
  missingDocs: z
    .array(MissingDocSchema)
    .describe("List of files missing documentation, max 20 items"),
});

// --- Types ---

export type DocWriterInput = {
  files: Array<{
    path: string;
    content: string;
    extension: string;
  }>;
  repoName: string;
};

export type DocWriterOutput = z.infer<typeof OutputSchema>;

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

// --- System Prompt ---

const SYSTEM_PROMPT = `You are a technical documentation writer for software projects.
Your task is to generate a comprehensive README.md file and identify documentation gaps.

REQUIREMENTS FOR README:
1. Title + short description (inferred from code)
2. Installation section with likely commands (npm install, etc.)
3. Usage section with basic example
4. Project structure section (simplified tree)
5. Technologies used section (inferred from package.json if present)

RULES:
- Generate README even if project has no prior documentation
- If README exists, use as base and suggest improvements instead of complete replacement
- missingDocs should list max 20 items, prioritizing exported functions/classes without JSDoc comments

OUTPUT FORMAT:
Return a JSON object with:
- readme: Complete markdown string
- missingDocs: Array of objects with "file" and "description" fields

Be concise, technical, and accurate. Infer information from the codebase provided.
Retorne APENAS um objeto JSON válido, sem markdown, sem blocos de código,
sem explicações antes ou depois. Siga EXATAMENTE o schema fornecido.`;

// --- Agent Function ---

export async function runDocWriter(
  input: DocWriterInput
): Promise<DocWriterOutput> {
  const filesDescription = input.files
    .map(
      (f) =>
        `--- FILE: ${f.path} (${f.extension}) ---\n${f.content}\n--- END FILE ---`
    )
    .join("\n\n");

  const userPrompt = `Generate comprehensive documentation for the repository "${input.repoName}".

Files in repository:
${filesDescription}

Schema de resposta JSON:
{
  "readme": "Complete markdown README with all mandatory sections",
  "missingDocs": [
    {
      "file": "path/to/file",
      "description": "exported function without JSDoc comment"
    }
  ]
}

Mandatory README sections:
1. Title + description
2. Installation
3. Usage
4. Project structure (tree)
5. Technologies used

Rules:
- Generate README even if no prior documentation exists
- If README exists, improve it instead of replacing
- missingDocs: max 20 items, prioritize exported functions/classes without JSDoc`;

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
  let parsed: DocWriterOutput;
  try {
    parsed = OutputSchema.parse(JSON.parse(rawText));
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
      parsed = OutputSchema.parse(JSON.parse(retryText));
    } catch (retryErr) {
      throw new AgentExecutionError(
        "DocWriter",
        "Failed to parse AI response as valid JSON after retry",
        retryErr
      );
    }
  }

  // Ensure missingDocs doesn't exceed 20 items
  if (parsed.missingDocs.length > 20) {
    parsed.missingDocs = parsed.missingDocs.slice(0, 20);
  }

  return parsed;
}