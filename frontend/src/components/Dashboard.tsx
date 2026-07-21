import { type FC, useState } from "react";
import { Shield, Bug, BarChart3, Download } from "lucide-react";
import jsPDF from "jspdf";
import type { ReporterOutput } from "../types";
import { ScoreCard } from "./ScoreCard";
import { SecurityPanel } from "./SecurityPanel";
import { BugList } from "./BugList";

type DashboardProps = {
  report: ReporterOutput;
  onNewAnalysis?: () => void;
};

const SummaryCard: FC<{
  icon: FC<{ className?: string }>;
  title: string;
  value: string | number;
  color: string;
}> = ({ icon: Icon, title, value, color }) => (
  <div className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-center gap-3">
      <div className={`rounded-lg p-2 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-lg font-bold text-gray-800">{value}</p>
      </div>
    </div>
  </div>
);

export const Dashboard: FC<DashboardProps> = ({ report, onNewAnalysis }) => {
  const [generating, setGenerating] = useState(false);

  const qualityScore = report.sections.quality?.score ?? 0;
  const bugCount = report.sections.bugs?.bugs.length ?? 0;
  const securityScore = report.sections.security?.score ?? 0;

  const handleDownloadPDF = () => {
    if (generating) return;
    setGenerating(true);

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const W = 210;
      let y = 15;

      const addLine = () => {
        doc.setDrawColor(200);
        doc.line(15, y, W - 15, y);
        y += 4;
      };

      const checkPage = (needed: number) => {
        if (y + needed > 280) {
          doc.addPage();
          y = 15;
        }
      };

      // HEADER
      doc.setFontSize(20);
      doc.setTextColor(30, 30, 30);
      doc.text("CodeLens AI", W / 2, y, { align: "center" });
      y += 8;

      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text("Relatorio de Analise de Repositorio", W / 2, y, { align: "center" });
      y += 10;

      doc.setFontSize(9);
      doc.text(`Repositorio: ${report.repoUrl}`, W / 2, y, { align: "center" });
      y += 5;
      doc.text(
        `Score: ${report.overallScore}/100 | Arquivos: ${report.filesAnalyzed} | ${new Date(report.generatedAt).toLocaleString("pt-BR")}`,
        W / 2,
        y,
        { align: "center" }
      );
      y += 8;
      addLine();

      // EXECUTIVE SUMMARY
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text("Resumo Executivo", 15, y);
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const summaryLines = doc.splitTextToSize(report.executiveSummary, W - 30);
      checkPage(summaryLines.length * 4 + 4);
      doc.text(summaryLines, 15, y);
      y += summaryLines.length * 4 + 4;
      addLine();

      // SECURITY
      if (report.sections.security) {
        checkPage(20);
        doc.setFontSize(12);
        doc.setTextColor(30, 30, 30);
        doc.text(`Seguranca (Score: ${report.sections.security.score}/100)`, 15, y);
        y += 6;

        for (const vuln of report.sections.security.vulnerabilities) {
          checkPage(25);
          const severityColors: Record<string, [number, number, number]> = {
            CRITICAL: [220, 38, 38],
            HIGH: [234, 88, 12],
            MEDIUM: [202, 138, 4],
            LOW: [22, 163, 74],
          };
          const [r, g, b] = severityColors[vuln.severity] || [100, 100, 100];

          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(r, g, b);
          doc.text(`[${vuln.severity}] ${vuln.id}`, 15, y);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(60, 60, 60);
          doc.text(` | ${vuln.category}`, 15 + doc.getTextWidth(`[${vuln.severity}] ${vuln.id}`), y);
          y += 4;

          doc.setTextColor(80, 80, 80);
          doc.text(`Arquivo: ${vuln.file}:${vuln.line}`, 19, y);
          y += 4;

          const descLines = doc.splitTextToSize(vuln.description, W - 38);
          doc.text(descLines, 19, y);
          y += descLines.length * 3.5 + 1;

          doc.setFont("helvetica", "bold");
          doc.text("Recomendacao:", 19, y);
          y += 4;
          doc.setFont("helvetica", "normal");
          const recLines = doc.splitTextToSize(vuln.recommendation, W - 38);
          doc.text(recLines, 19, y);
          y += recLines.length * 3.5 + 3;
        }
        addLine();
      }

      // BUGS
      if (report.sections.bugs) {
        checkPage(15);
        doc.setFontSize(12);
        doc.setTextColor(30, 30, 30);
        doc.text(`Bugs Encontrados (${bugCount})`, 15, y);
        y += 6;

        for (const bug of report.sections.bugs.bugs) {
          checkPage(15);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(80, 80, 80);
          doc.text(`[${bug.severity}] ${bug.id}`, 15, y);
          y += 4;
          doc.setFont("helvetica", "normal");
          doc.text(`${bug.file}:${bug.line}`, 19, y);
          y += 4;
          const bugDesc = doc.splitTextToSize(bug.description, W - 38);
          doc.text(bugDesc, 19, y);
          y += bugDesc.length * 3.5 + 3;
        }
        addLine();
      }

      // QUALITY
      if (report.sections.quality) {
        checkPage(15);
        doc.setFontSize(12);
        doc.setTextColor(30, 30, 30);
        doc.text(`Qualidade (Score: ${qualityScore}/100)`, 15, y);
        y += 6;

        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(
          `Funcao media: ${report.sections.quality.metrics.averageFunctionLength} linhas | Duplicacoes: ${report.sections.quality.metrics.duplicatedBlocks} | Sem tipos: ${report.sections.quality.metrics.filesWithoutTypes}`,
          15,
          y
        );
        y += 6;

        for (const issue of report.sections.quality.issues) {
          checkPage(10);
          doc.setFont("helvetica", "bold");
          doc.text(`[${issue.type}]`, 15, y);
          doc.setFont("helvetica", "normal");
          doc.text(` ${issue.file}:${issue.line}`, 15 + doc.getTextWidth(`[${issue.type}]`), y);
          y += 4;
          const issueDesc = doc.splitTextToSize(issue.description, W - 38);
          doc.text(issueDesc, 19, y);
          y += issueDesc.length * 3.5 + 2;
        }
      }

      // FOOTER
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
          `CodeLens AI | Pagina ${i}/${pageCount}`,
          W / 2,
          290,
          { align: "center" }
        );
      }

      const repoName = report.repoUrl.split("/").slice(-2).join("-");
      doc.save(`codelens-${repoName}-${Date.now()}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar PDF. Verifique o console para detalhes.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onNewAnalysis}
          className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          Nova análise
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={generating}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          <Download size={16} />
          {generating ? "Gerando PDF..." : "Gerar PDF"}
        </button>
      </div>

      <div className="space-y-6">
        <ScoreCard score={report.overallScore} />

        <div className="grid grid-cols-3 gap-4">
          <SummaryCard
            icon={BarChart3}
            title="Qualidade"
            value={`${qualityScore}/100`}
            color="bg-blue-100 text-blue-600"
          />
          <SummaryCard
            icon={Bug}
            title="Bugs"
            value={bugCount}
            color="bg-orange-100 text-orange-600"
          />
          <SummaryCard
            icon={Shield}
            title="Segurança"
            value={`${securityScore}/100`}
            color="bg-red-100 text-red-600"
          />
        </div>

        {report.sections.security && (
          <SecurityPanel
            vulnerabilities={report.sections.security.vulnerabilities}
            score={report.sections.security.score}
          />
        )}

        {report.sections.bugs && (
          <BugList bugs={report.sections.bugs.bugs} />
        )}
      </div>
    </div>
  );
};
