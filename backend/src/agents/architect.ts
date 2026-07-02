import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Types
export type ArchitectInput = {
  files: Array<{
    path: string;
    content: string;
    extension: string;
  }>;
};

export type ArchitectOutput = {
  structure: {
    folders: string[];
    layers: string[];
  };
  dependencies: Array<{
    from: string;
    to: string;
  }>;
  patterns: string[];
  suggestions: string[];
};

// Zod schema for output validation
const OutputSchema = z.object({
  structure: z.object({
    folders: z.array(z.string()),
    layers: z.array(z.string()),
  }),
  dependencies: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
    })
  ),
  patterns: z.array(z.string()),
  suggestions: z.array(z.string()),
});

// System prompt for the Architect agent
const SYSTEM_PROMPT = `You are an Architect agent specialized in analyzing code repository structure and architecture.

Your job is to analyze the provided code files and identify:
1. Folder structure and what each folder represents
2. Import/export relationships between files (direct dependencies)
3. Recognizable architectural patterns (MVC, Layered Architecture, Microservices, Repository Pattern, Singleton, etc.)
4. Excessive coupling between modules that should be independent
5. Lack of separation of concerns (e.g., business logic mixed with presentation logic)

For the analysis, provide:
- structure.folders: Main folders identified in the project
- structure.layers: Architectural layers detected (e.g., ["controllers", "services", "models"])
- dependencies: Direct import relationships between files (limit to top 100 most relevant if project is large)
- patterns: Recognized architectural patterns
- suggestions: Actionable improvement suggestions (NOT generic like "improve architecture")

IMPORTANT RULES:
- Suggestions MUST be specific and actionable. Instead of "improve separation of concerns", say "Extract database queries from route handlers into a dedicated repository layer"
- Dependencies should be limited to 100 most relevant relationships
- Focus on structural issues, not code style or bugs (other agents handle those)

IMPORTANT: You MUST respond with valid JSON only. No markdown, no explanation outside the JSON.`;

// Custom error class for agent execution failures
export class AgentExecutionError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "AgentExecutionError";
  }
}

// Main agent function
export async function runArchitect(
  input: ArchitectInput
): Promise<ArchitectOutput> {
  const anthropic = new Anthropic();

  // Build the user message with all files
  const filesContent = input.files
    .map(
      (f) =>
        `--- File: ${f.path} (${f.extension}) ---\n${f.content}\n--- End: ${f.path} ---`
    )
    .join("\n\n");

  const userMessage = `Analyze the following code files for architectural structure, dependencies, and patterns:

${filesContent}

Return your analysis as a JSON object with this exact structure:
{
  "structure": {
    "folders": ["folder1", "folder2"],
    "layers": ["layer1", "layer2"]
  },
  "dependencies": [
    {
      "from": "path/to/file1.ts",
      "to": "path/to/file2.ts"
    }
  ],
  "patterns": ["Pattern1", "Pattern2"],
  "suggestions": ["Specific actionable suggestion 1", "Specific actionable suggestion 2"]
}

Remember:
- Limit dependencies to 100 most relevant if project is large
- Suggestions must be specific and actionable, not generic
- Focus on architecture, not code quality or bugs`;

  let response: string | undefined;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // Extract text from response
    const block = message.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      throw new Error("No text block in Claude response");
    }
    response = block.text.trim();
  } catch (error) {
    throw new AgentExecutionError(
      "Failed to call Claude API",
      error instanceof Error ? error : undefined
    );
  }

  // Parse and validate the response
  let parsed: unknown;
  try {
    // Try to extract JSON if wrapped in markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    parsed = JSON.parse(jsonStr.trim());
  } catch (parseError) {
    // Retry once with explicit format request
    try {
      const retryMessage = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: userMessage },
          {
            role: "assistant",
            content: response,
          },
          {
            role: "user",
            content:
              "Your previous response was not valid JSON. Please respond with ONLY a valid JSON object matching the required structure. No markdown, no explanation, just the raw JSON.",
          },
        ],
      });

      const retryBlock = retryMessage.content.find((b) => b.type === "text");
      if (!retryBlock || retryBlock.type !== "text") {
        throw new Error("No text block in retry response");
      }
      const retryJsonMatch = retryBlock.text.match(
        /```(?:json)?\s*([\s\S]*?)```/
      );
      const retryJsonStr = retryJsonMatch
        ? retryJsonMatch[1]
        : retryBlock.text.trim();
      parsed = JSON.parse(retryJsonStr.trim());
    } catch (retryError) {
      throw new AgentExecutionError(
        "Failed to parse Claude response as JSON after retry",
        retryError instanceof Error
          ? retryError
          : parseError instanceof Error
            ? parseError
            : undefined
      );
    }
  }

  // Validate against Zod schema
  try {
    const result = OutputSchema.parse(parsed);
    return result as ArchitectOutput;
  } catch (schemaError) {
    throw new AgentExecutionError(
      "Claude response does not match expected schema",
      schemaError instanceof Error ? schemaError : undefined
    );
  }
}
