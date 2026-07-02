import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Types
export type BugHunterInput = {
  files: Array<{
    path: string;
    content: string;
    extension: string;
  }>;
};

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

// Zod schema for output validation
const BugSchema = z.object({
  id: z.string().regex(/^BUG-\d{3}$/),
  severity: z.enum(["HIGH", "MEDIUM", "LOW"]),
  file: z.string(),
  line: z.number(),
  description: z.string(),
  suggestion: z.string(),
});

const OutputSchema = z.object({
  bugs: z.array(BugSchema),
});

// System prompt for the Bug Hunter agent
const SYSTEM_PROMPT = `You are a Bug Hunter agent specialized in analyzing code for potential bugs, antipatterns, and code smells.

Your job is to analyze the provided code files and identify:
1. Dead code (functions/variables declared but never used)
2. Logically impossible conditions (e.g., if (x > 10 && x < 5))
3. Possible null/undefined access without prior checks
4. Loops with potential for infinite execution (missing or unreachable stop conditions)
5. Potential memory leaks (listeners not removed, intervals not cleared)
6. Known antipatterns: callback hell, magic numbers, direct state mutation in React
7. Unhandled promises (missing .catch() or await without try/catch)

For each bug found, provide:
- A unique ID in format BUG-001, BUG-002, etc.
- Severity: HIGH (critical bugs, crashes, security risks), MEDIUM (potential issues, antipatterns), LOW (minor issues, style)
- The exact file path
- The approximate line number
- A clear description of the issue
- A specific suggestion for fixing it

Prioritize HIGH and MEDIUM severity bugs. Only include LOW if there are few findings.

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
export async function runBugHunter(
  input: BugHunterInput
): Promise<BugHunterOutput> {
  const anthropic = new Anthropic();

  // Build the user message with all files
  const filesContent = input.files
    .map(
      (f) =>
        `--- File: ${f.path} (${f.extension}) ---\n${f.content}\n--- End: ${f.path} ---`
    )
    .join("\n\n");

  const userMessage = `Analyze the following code files for potential bugs, antipatterns, and code smells:

${filesContent}

Return your findings as a JSON object with this exact structure:
{
  "bugs": [
    {
      "id": "BUG-001",
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "file": "path/to/file.ts",
      "line": 42,
      "description": "Description of the bug",
      "suggestion": "How to fix it"
    }
  ]
}

If no bugs are found, return {"bugs": []}`;

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
    return result as BugHunterOutput;
  } catch (schemaError) {
    throw new AgentExecutionError(
      "Claude response does not match expected schema",
      schemaError instanceof Error ? schemaError : undefined
    );
  }
}
