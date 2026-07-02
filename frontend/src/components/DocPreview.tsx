import { type FC, useState } from "react";
import { FileText, Copy, Check } from "lucide-react";

type DocPreviewProps = {
  readme: string;
};

export const DocPreview: FC<DocPreviewProps> = ({ readme }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(readme);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!readme) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md sm:p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-4 h-16 w-16 text-gray-300" />
          <h2 className="mb-2 text-xl font-bold text-gray-800">
            Documentação
          </h2>
          <p className="text-lg text-gray-500">
            Nenhum README gerado
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-md sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-100 p-2">
            <FileText className="h-6 w-6 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">
            Documentação
          </h2>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copiar conteúdo
            </>
          )}
        </button>
      </div>

      <div className="overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700">
          {readme}
        </pre>
      </div>
    </div>
  );
};
