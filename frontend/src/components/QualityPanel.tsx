import { type FC } from "react";
import { BarChart3, CheckCircle } from "lucide-react";
import type { CodeAnalyzerOutput } from "../types";

type QualityPanelProps = {
  quality: CodeAnalyzerOutput | null;
};

const SCORE_COLORS: Record<string, string> = {
  low: "text-red-600 bg-red-100",
  mid: "text-yellow-600 bg-yellow-100",
  high: "text-green-600 bg-green-100",
};

const ISSUE_TYPE_TRANSLATIONS: Record<string, string> = {
  complexity: "Complexidade",
  duplication: "Duplicação",
  naming: "Nomenclatura",
  documentation: "Documentação",
  type_safety: "Segurança de tipos",
  performance: "Performance",
  maintainability: "Mantibilidade",
  readability: "Legibilidade",
  dead_code: "Código morto",
  error_handling: "Tratamento de erros",
};

export const QualityPanel: FC<QualityPanelProps> = ({ quality }) => {
  if (!quality) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md sm:p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="mb-4 h-16 w-16 text-gray-400" />
          <h2 className="mb-2 text-xl font-bold text-gray-800">
            Análise de Qualidade
          </h2>
          <p className="text-lg text-gray-500">
            Dados indisponíveis
          </p>
        </div>
      </div>
    );
  }

  const scoreColor =
    quality.score < 60
      ? SCORE_COLORS.low
      : quality.score < 80
        ? SCORE_COLORS.mid
        : SCORE_COLORS.high;

  return (
    <div className="rounded-xl bg-white p-4 shadow-md sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-100 p-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="flex-1 text-xl font-bold text-gray-800 sm:text-2xl">
          Análise de Qualidade
        </h2>
        <div
          className={`rounded-lg px-4 py-2 text-lg font-bold ${scoreColor}`}
        >
          {quality.score}/100
        </div>
      </div>

      {/* Metrics */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="text-2xl font-bold text-gray-800">
            {quality.metrics.averageFunctionLength}
          </div>
          <div className="text-xs text-gray-500">Linhas/função (média)</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="text-2xl font-bold text-gray-800">
            {quality.metrics.duplicatedBlocks}
          </div>
          <div className="text-xs text-gray-500">Blocos duplicados</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="text-2xl font-bold text-gray-800">
            {quality.metrics.filesWithoutTypes}
          </div>
          <div className="text-xs text-gray-500">Sem tipos</div>
        </div>
      </div>

      {/* Issues */}
      {quality.issues.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-700">
            Nenhum problema de qualidade encontrado
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-600">
            Problemas encontrados ({quality.issues.length})
          </h3>
          {quality.issues.slice(0, 10).map((issue, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 p-3 shadow-sm"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {ISSUE_TYPE_TRANSLATIONS[issue.type] || issue.type}
                </span>
                <span className="text-xs text-gray-400">
                  {issue.file}:{issue.line}
                </span>
              </div>
              <p className="text-sm text-gray-700">{issue.description}</p>
              {issue.suggestion && (
                <p className="mt-1 text-xs text-gray-500">
                  <span className="font-medium">Sugestão:</span> {issue.suggestion}
                </p>
              )}
            </div>
          ))}
          {quality.issues.length > 10 && (
            <p className="text-xs text-gray-500">
              ...e mais {quality.issues.length - 10} problemas
            </p>
          )}
        </div>
      )}
    </div>
  );
};
