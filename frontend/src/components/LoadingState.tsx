import { type FC, useState, useEffect } from "react";
import { Loader2, GitBranch, FileSearch, Bug, Shield, FileText, CheckCircle2 } from "lucide-react";

type LoadingStateProps = {
  currentStage: string;
};

const CODE_LINES = [
  { text: "const repo = await fetchFiles(url);", color: "text-blue-400" },
  { text: "function analyze(code) {", color: "text-purple-400" },
  { text: "  const issues = detectBugs(code);", color: "text-green-400" },
  { text: "  return calculateScore(issues);", color: "text-yellow-400" },
  { text: "}", color: "text-purple-400" },
  { text: "const security = auditVulnerabilities();", color: "text-red-400" },
  { text: "await generateReport(results);", color: "text-cyan-400" },
  { text: "export default analyze;", color: "text-blue-400" },
];

function CodeAnimation() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines((prev) => (prev >= CODE_LINES.length ? 0 : prev + 1));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto mb-6 w-full max-w-md overflow-hidden rounded-lg bg-gray-900 p-4 font-mono text-xs shadow-lg">
      <div className="mb-2 flex gap-1.5">
        <div className="h-3 w-3 rounded-full bg-red-500" />
        <div className="h-3 w-3 rounded-full bg-yellow-500" />
        <div className="h-3 w-3 rounded-full bg-green-500" />
      </div>
      <div className="space-y-1">
        {CODE_LINES.map((line, i) => (
          <div
            key={i}
            className={`transition-all duration-300 ${
              i < visibleLines
                ? "translate-x-0 opacity-100"
                : "-translate-x-2 opacity-0"
            }`}
          >
            <span className="mr-2 select-none text-gray-500">{i + 1}</span>
            <span className={line.color}>{line.text}</span>
          </div>
        ))}
        {visibleLines <= CODE_LINES.length && (
          <span className="inline-block h-4 w-2 animate-pulse bg-green-400" />
        )}
      </div>
    </div>
  );
}

const STEPS = [
  { key: "repo", label: "Conectando ao repositório", icon: GitBranch, keywords: ["conectando", "repositório", "arquivos"] },
  { key: "quality", label: "Analisando qualidade do código", icon: FileSearch, keywords: ["qualidade", "código"] },
  { key: "bugs", label: "Detectando bugs e antipatterns", icon: Bug, keywords: ["bugs", "antipatterns", "detectando"] },
  { key: "security", label: "Verificando vulnerabilidades", icon: Shield, keywords: ["vulnerabilidades", "segurança", "owasp"] },
  { key: "report", label: "Gerando relatório final", icon: FileText, keywords: ["relatório", "consolidando", "concluída"] },
];

function getActiveStep(message: string): number {
  const lower = message.toLowerCase();
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (STEPS[i].keywords.some((kw) => lower.includes(kw))) {
      return i;
    }
  }
  return 0;
}

function isStepDone(message: string, stepIndex: number): boolean {
  const activeIndex = getActiveStep(message);
  return stepIndex < activeIndex;
}

export const LoadingState: FC<LoadingStateProps> = ({ currentStage }) => {
  const activeIndex = getActiveStep(currentStage);

  const progressPercent = Math.min(
    Math.round((activeIndex / (STEPS.length - 1)) * 90) + 10,
    100
  );

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Code animation */}
        <CodeAnimation />

        {/* Progress bar */}
        <div className="mb-6 h-3 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Steps timeline */}
        <div className="mb-6 space-y-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const done = isStepDone(currentStage, i);
            const active = i === activeIndex && !done;

            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300 ${
                  active
                    ? "bg-indigo-50 border border-indigo-200"
                    : done
                      ? "bg-green-50"
                      : "bg-gray-50 opacity-50"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    done
                      ? "bg-green-100 text-green-600"
                      : active
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    done
                      ? "text-green-700"
                      : active
                        ? "text-indigo-700"
                        : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current message */}
        <div className="flex items-center justify-center gap-3 rounded-lg bg-gray-100 px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          <p className="text-center text-sm text-gray-600">{currentStage}</p>
        </div>
      </div>
    </div>
  );
};
