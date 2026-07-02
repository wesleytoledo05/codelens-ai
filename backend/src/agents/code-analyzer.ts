import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Zod schema matching the spec output exactly
const IssueSchema = z.object({
  file: z.string(),
  line: z.number(),
  type: z.string(),
  description: z.string(),
  suggestion: z.string(),
});

const OutputSchema = z.object({
  score: z.number().min(0).max(100),
  metrics: z.object({
    averageFunctionLength: z.number(),
    duplicatedBlocks: z.number(),
    filesWithoutTypes: z.number(),
  }),
  issues: z.array(IssueSchema),
});

type CodeAnalyzerOutput = z.infer<typeof OutputSchema>;

export type CodeAnalyzerInput = {
  files: Array<{
    path: string;
    content: string;
    extension: string;
  }>;
};

const SYSTEM_PROMPT = `You are a code quality analyzer. Analyze the provided code files and return a JSON object with the following structure:

{
  "score": number (0-100, where 0-59 is bad quality, 60-79 is regular, 80-100 is good),
  "metrics": {
    "averageFunctionLength": number (average lines per function),
    "duplicatedBlocks": number (count of code duplications found),
    "filesWithoutTypes": number (count of .js/.ts files without adequate typing)
  },
  "issues": [
    {
      "file": "path/to/file",
      "line": number,
      "type": "ISSUE_TYPE",
      "description": "What's wrong",
      "suggestion": "Concrete improvement suggestion"
    }
  ]
}

Analyze for:
- Cyclomatic complexity (too many nested ifs/loops)
- Code duplication between files
- Function size (functions > 50 lines are suspicious)
- Variable/function naming (generic names like data, temp, x)
- TypeScript type coverage (excessive use of any)
- Excessive comments indicating unclear code

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanation.`;

function buildUserPrompt(files: CodeAnalyzerInput["files"]): string {
  const fileContents = files
    .map((f) => `=== ${f.path} (${f.extension}) ===\n${f.content}`)
    .join("\n\n");

  return `Analyze the following code files for quality issues:\n\n${fileContents}`;
}

function extractJSON(response: string): unknown {
  // Try to extract JSON from the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in response");
  }
  return JSON.parse(jsonMatch[0]);
}

class AgentExecutionError extends Error {
  constructor(
    message: string,
    public readonly agentName: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AgentExecutionError";
  }
}

export async function runCodeAnalyzer(
  input: CodeAnalyzerInput
): Promise<CodeAnalyzerOutput> {
  const client = new Anthropic();

  const userPrompt = buildUserPrompt(input.files);

  let lastError: unknown;

  // First attempt
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const parsed = extractJSON(content.text);
    return OutputSchema.parse(parsed);
  } catch (error) {
    lastError = error;
  }

  // Retry with explicit format request
  try {
    const retryResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userPrompt },
        {
          role: "assistant",
          content:
            "I need to analyze the code. Let me provide the analysis.",
        },
        {
          role: "user",
          content:
            "Please provide the analysis in valid JSON format exactly as specified. Return ONLY the JSON object, nothing else.",
        },
      ],
    });

    const content = retryResponse.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const parsed = extractJSON(content.text);
    return OutputSchema.parse(parsed);
  } catch (error) {
    throw new AgentExecutionError(
      "Failed to get valid analysis from Code Analyzer after retry",
      "CodeAnalyzer",
      lastError
    );
  }
}
