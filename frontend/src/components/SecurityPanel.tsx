import { type FC, useState } from "react";
import { Shield, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

type SecurityPanelProps = {
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
};

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const SEVERITY_LABELS = {
  CRITICAL: "CRÍTICAS",
  HIGH: "ALTAS",
  MEDIUM: "MÉDIAS",
  LOW: "BAIXAS",
};
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW: "bg-green-100 text-green-800 border-green-200",
};
const SEVERITY_BG: Record<string, string> = {
  CRITICAL: "bg-red-50 border-l-red-500",
  HIGH: "bg-orange-50 border-l-orange-500",
  MEDIUM: "bg-yellow-50 border-l-yellow-500",
  LOW: "bg-green-50 border-l-green-500",
};
const SCORE_COLORS: Record<string, string> = {
  low: "text-red-600 bg-red-100",
  mid: "text-yellow-600 bg-yellow-100",
  high: "text-green-600 bg-green-100",
};

export const SecurityPanel: FC<SecurityPanelProps> = ({
  vulnerabilities,
  score,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...vulnerabilities].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  const counts = {
    CRITICAL: vulnerabilities.filter((v) => v.severity === "CRITICAL").length,
    HIGH: vulnerabilities.filter((v) => v.severity === "HIGH").length,
    MEDIUM: vulnerabilities.filter((v) => v.severity === "MEDIUM").length,
    LOW: vulnerabilities.filter((v) => v.severity === "LOW").length,
  };

  const scoreColor =
    score < 60
      ? SCORE_COLORS.low
      : score < 80
        ? SCORE_COLORS.mid
        : SCORE_COLORS.high;

  if (vulnerabilities.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md sm:p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
          <h2 className="mb-2 text-xl font-bold text-gray-800">
            Auditoria de Segurança
          </h2>
          <p className="text-lg text-green-600">
            Nenhuma vulnerabilidade encontrada 🎉
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-md sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-indigo-100 p-2">
          <Shield className="h-6 w-6 text-indigo-600" />
        </div>
        <h2 className="flex-1 text-xl font-bold text-gray-800 sm:text-2xl">
          Auditoria de Segurança
        </h2>
        <div
          className={`rounded-lg px-4 py-2 text-lg font-bold ${scoreColor}`}
        >
          {score}/100
        </div>
      </div>

      {/* Severity counters */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => (
          <div
            key={sev}
            className={`rounded-lg border p-3 text-center ${SEVERITY_COLORS[sev]}`}
          >
            <div className="text-2xl font-bold">{counts[sev]}</div>
            <div className="text-xs font-medium uppercase">
              {SEVERITY_LABELS[sev]}
            </div>
          </div>
        ))}
      </div>

      {/* Vulnerability list */}
      <div className="space-y-4">
        {sorted.map((vuln) => (
          <div
            key={vuln.id}
            className={`rounded-lg border-l-4 bg-white p-4 shadow-sm sm:p-5 ${SEVERITY_BG[vuln.severity]}`}
          >
            {/* Top row: badge + file + owasp */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_COLORS[vuln.severity]}`}
              >
                {vuln.severity}
              </span>
              <span className="text-sm text-gray-500">
                {vuln.file}:{vuln.line}
              </span>
              {vuln.owasp && (
                <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                  {vuln.owasp}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="mb-3 text-sm text-gray-700">{vuln.description}</p>

            {/* Caminho de Exploração */}
            <div className="mb-3 rounded-lg bg-gray-100 p-3">
              <p className="mb-1 text-xs font-semibold uppercase text-gray-500">
                Caminho de Exploração
              </p>
              <p className="text-sm text-gray-600">{vuln.exploitationPath}</p>
            </div>

            {/* Expandable recommendation */}
            <button
              onClick={() =>
                setExpandedId(expandedId === vuln.id ? null : vuln.id)
              }
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <span>Recomendação</span>
              {expandedId === vuln.id ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedId === vuln.id && (
              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                {vuln.recommendation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
