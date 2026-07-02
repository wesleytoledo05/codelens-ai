// Shared types mirroring backend agent output schemas

export type CodeAnalyzerOutput = {
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

export type SecurityAuditorOutput = {
  vulnerabilities: Array<{
    id: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    category: string;
    file: string;
    line: number;
    description: string;
    exploitationPath: string;
    recommendation: string;
    owasp: string;
  }>;
  score: number;
  summary: string;
};

export type DocWriterOutput = {
  readme: string;
  missingDocs: Array<{
    file: string;
    description: string;
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

export type ReporterOutput = {
  repoUrl: string;
  filesAnalyzed: number;
  overallScore: number;
  executiveSummary: string;
  sections: {
    quality: CodeAnalyzerOutput | null;
    bugs: BugHunterOutput | null;
    security: SecurityAuditorOutput | null;
    documentation: DocWriterOutput | null;
    architecture: ArchitectOutput | null;
  };
  generatedAt: string;
};

export type SSEEvent = {
  event: "progress" | "complete" | "error";
  data: ReporterOutput | { message: string };
};
