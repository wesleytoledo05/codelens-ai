import { type FC, useState } from "react";
import { X, Key, ExternalLink, CheckCircle, AlertCircle, Loader2, Shield } from "lucide-react";
import { BASE_URL } from "../lib/api";

type ApiKeys = {
  groqApiKey: string;
  githubToken: string;
};

type ValidationStatus = "idle" | "loading" | "valid" | "invalid";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  keys: ApiKeys;
  onSave: (keys: ApiKeys) => void;
};

export const SettingsModal: FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  keys,
  onSave,
}) => {
  const [localKeys, setLocalKeys] = useState(keys);
  const [saved, setSaved] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>("idle");
  const [validationMessage, setValidationMessage] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localKeys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleValidateKey = async () => {
    if (!localKeys.groqApiKey.trim()) {
      setValidationStatus("invalid");
      setValidationMessage("Digite uma chave primeiro");
      return;
    }

    setValidationStatus("loading");
    setValidationMessage("");

    try {
      const response = await fetch(`${BASE_URL}/validate-groq-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groqApiKey: localKeys.groqApiKey }),
      });

      const data = await response.json();

      if (data.valid) {
        setValidationStatus("valid");
        setValidationMessage(`Chave válida ✓ Modelo: ${data.model}`);
      } else {
        setValidationStatus("invalid");
        setValidationMessage(data.message || "Chave inválida");
      }
    } catch {
      setValidationStatus("invalid");
      setValidationMessage("Erro de conexão. Verifique se o backend está rodando.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
              <Key size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Configurar API Keys
              </h2>
              <p className="text-xs text-gray-500">
                Use suas próprias chaves para testar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Groq API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                Groq API Key *
              </label>
              {localKeys.groqApiKey ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle size={14} />
                  Configurada
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle size={14} />
                  Obrigatória
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={localKeys.groqApiKey}
                onChange={(e) => {
                  setLocalKeys({ ...localKeys, groqApiKey: e.target.value });
                  setValidationStatus("idle");
                  setValidationMessage("");
                }}
                placeholder="gsk_..."
                className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition-colors focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleValidateKey}
                disabled={validationStatus === "loading"}
                className="flex items-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validationStatus === "loading" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Shield size={16} />
                )}
                Validar
              </button>
            </div>
            {/* Validation feedback */}
            {validationStatus !== "idle" && validationMessage && (
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                  validationStatus === "valid"
                    ? "bg-green-50 text-green-700"
                    : validationStatus === "invalid"
                    ? "bg-red-50 text-red-700"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {validationStatus === "valid" && <CheckCircle size={14} />}
                {validationStatus === "invalid" && <AlertCircle size={14} />}
                {validationMessage}
              </div>
            )}
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-800">
                Como obter sua chave Groq (gratuita):
              </p>
              <ol className="mt-1.5 space-y-1 text-xs text-blue-700">
                <li>
                  1. Acesse{" "}
                  <a
                    href="https://console.groq.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium underline"
                  >
                    console.groq.com
                    <ExternalLink size={10} />
                  </a>
                </li>
                <li>2. Crie uma conta gratuita (Google ou GitHub)</li>
                <li>3. Vá em "API Keys" no menu lateral</li>
                <li>4. Clique em "Create API Key"</li>
                <li>5. Copie a chave e cole aqui</li>
              </ol>
              <p className="mt-1.5 text-[10px] text-blue-600">
                Plana gratuita: 30.000 tokens/minuto — suficiente para testar
              </p>
            </div>
          </div>

          {/* GitHub Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                GitHub Token{" "}
                <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              {localKeys.githubToken ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle size={14} />
                  Configurado
                </span>
              ) : null}
            </div>
            <input
              type="password"
              value={localKeys.githubToken}
              onChange={(e) =>
                setLocalKeys({ ...localKeys, githubToken: e.target.value })
              }
              placeholder="ghp_..."
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition-colors focus:border-indigo-500 focus:outline-none"
            />
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-700">
                Por que usar um token GitHub?
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
                <li>
                  • Acessar repositórios <strong>privados</strong>
                </li>
                <li>
                  • Evitar rate limit da API pública (60 req/hora sem token)
                </li>
                <li>
                  • Com token: 5.000 req/hora
                </li>
              </ul>
              <p className="mt-1.5 text-xs text-gray-500">
                Gere em{" "}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium text-indigo-600 underline"
                >
                  github.com/settings/tokens
                  <ExternalLink size={10} />
                </a>{" "}
                (permissão "public_repo" é suficiente)
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <p className="text-xs text-gray-400">
            Suas chaves ficam salvas apenas no seu navegador
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              {saved ? "Salvo!" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
