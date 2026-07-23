import { useState, useCallback } from "react";
import { AlertTriangle, RotateCcw, Settings } from "lucide-react";
import { RepoInput } from "./components/RepoInput";
import { LoadingState } from "./components/LoadingState";
import { Dashboard } from "./components/Dashboard";
import { SettingsModal } from "./components/SettingsModal";
import { useApiKeys } from "./hooks/useApiKeys";
import { streamAnalysis } from "./lib/api";
import type { ReporterOutput } from "./types";

type AppStage = "idle" | "loading" | "success" | "error";

function App() {
  const [stage, setStage] = useState<AppStage>("idle");
  const [report, setReport] = useState<ReporterOutput | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentMessage, setCurrentMessage] = useState("");
  const [lastUrl, setLastUrl] = useState("");
  const { keys, setKeys, isOpen, setIsOpen, hasGroqKey } = useApiKeys();

  const handleAnalyze = useCallback(
    (url: string) => {
      if (!hasGroqKey) {
        setIsOpen(true);
        return;
      }
      setLastUrl(url);
      setStage("loading");
      setCurrentMessage("Iniciando análise...");

      streamAnalysis(
        url,
        {
          onProgress: (msg) => setCurrentMessage(msg),
          onComplete: (result) => {
            setReport(result);
            setStage("success");
          },
          onError: (msg) => {
            setErrorMessage(msg);
            setStage("error");
          },
        },
        keys
      );
    },
    [keys, hasGroqKey, setIsOpen]
  );

  const handleRetry = () => {
    if (lastUrl) handleAnalyze(lastUrl);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Settings button — top right */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-4 z-40 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
        title="Configurar API Keys"
      >
        <Settings size={16} />
        <span className="hidden sm:inline">Config API</span>
        {!hasGroqKey && (
          <span className="flex h-2 w-2 rounded-full bg-amber-500" />
        )}
      </button>

      {/* Settings modal */}
      <SettingsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        keys={keys}
        onSave={setKeys}
      />

      {stage === "idle" && (
        <RepoInput
          onSubmit={handleAnalyze}
          isLoading={false}
          hasGroqKey={hasGroqKey}
          onOpenSettings={() => setIsOpen(true)}
        />
      )}

      {stage === "loading" && (
        <LoadingState currentStage={currentMessage} />
      )}

      {stage === "success" && report && (
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <Dashboard
            report={report}
            onNewAnalysis={() => {
              setStage("idle");
              setReport(null);
            }}
          />
        </div>
      )}

      {stage === "error" && (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Erro na análise
            </h2>
            <p className="text-gray-600">{errorMessage}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <RotateCcw size={18} />
                Tentar novamente
              </button>
              <button
                onClick={() => {
                  setStage("idle");
                  setReport(null);
                  setErrorMessage("");
                }}
                className="rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
