import { type FC, useState } from "react";
import {
  Search,
  Cpu,
  Shield,
  Bug,
  BookOpen,
  LayoutGrid,
  BarChart3,
  Download,
} from "lucide-react";

type RepoInputProps = {
  onSubmit: (url: string) => void;
  isLoading: boolean;
};

const EXAMPLES = [
  { label: "facebook/react", url: "https://github.com/facebook/react" },
  { label: "expressjs/express", url: "https://github.com/expressjs/express" },
  { label: "vuejs/core", url: "https://github.com/vuejs/core" },
];

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[^/]+\/[^/]+$/;

export const RepoInput: FC<RepoInputProps> = ({ onSubmit, isLoading }) => {
  const [url, setUrl] = useState("");

  const isValid = GITHUB_URL_PATTERN.test(url);
  const isDisabled = isLoading || !isValid;

  const handleSubmit = () => {
    if (!isDisabled) {
      onSubmit(url);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        <h1 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">
          Analise qualquer repositório GitHub com IA
        </h1>

        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://github.com/usuario/repositorio"
              disabled={isLoading}
              className={`flex-1 rounded-xl border-2 px-5 py-4 text-lg transition-colors ${
                url && !isValid
                  ? "border-red-500 focus:border-red-500 focus:outline-none"
                  : "border-gray-300 focus:border-indigo-600 focus:outline-none"
              } disabled:opacity-50`}
            />
            <button
              onClick={handleSubmit}
              disabled={isDisabled}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search size={20} />
              Analisar
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                onClick={() => setUrl(example.url)}
                disabled={isLoading}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        {/* How it works — sequential pipeline */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-center text-lg font-semibold text-gray-800">
            Como funciona a análise
          </h2>
          <p className="mb-6 text-center text-sm text-gray-500">
            Fluxo completo em 7 etapas — do URL ao relatório final
          </p>

          <div className="space-y-0">
            {[
              {
                step: 1,
                icon: <Download size={18} className="text-indigo-600" />,
                title: "Clone do repositório",
                desc: "A GitHub API é consultada para obter a árvore de arquivos do repositório. São filtrados automaticamente pastas como node_modules, .git, dist e extensões binárias (.png, .jpg, .pdf). Se houver mais de 300 arquivos relevantes, os 300 mais importantes são selecionados por prioridade (src/ primeiro, depois app/, lib/, components/).",
              },
              {
                step: 2,
                icon: <Cpu size={18} className="text-indigo-600" />,
                title: "Code Analyzer",
                desc: "Analisa a qualidade geral do código: complexidade ciclomática (quantidade deifs/loops aninhados), duplicação entre arquivos, tamanho de funções (suspeitas acima de 50 linhas), nomenclatura de variáveis (nomes genéricos como data, temp, x), cobertura de tipos TypeScript (uso excessivo de any) e comentários excessivos que indicam código pouco claro. Gera um score de 0 a 100.",
              },
              {
                step: 3,
                icon: <Bug size={18} className="text-orange-600" />,
                title: "Bug Hunter",
                desc: "Detecta bugs potenciais e code smells: código morto (funções/variáveis nunca usadas), condições logicamente impossíveis (x > 10 && x < 5), acesso a null/undefined sem verificação, loops potencialmente infinitos, vazamento de memória (listeners não removidos, intervals não limpos), antipatterns (callback hell, magic numbers, mutação direta de estado em React), e Promises sem tratamento de erro (.catch() ausente ou await sem try/catch).",
              },
              {
                step: 4,
                icon: <Shield size={18} className="text-red-600" />,
                title: "Security Auditor",
                desc: "O agente mais crítico. Busca vulnerabilidades reais mapeadas para OWASP Top 10: secrets hardcoded (API keys, senhas no código), SQL Injection (concatenação em queries), XSS (innerHTML sem sanitização, dangerouslySetInnerHTML), autenticação fraca (JWT sem validação), CORS permissivo (Access-Control-Allow-Origin: *), dependências com CVEs, comunicação sem HTTPS, injeção de comandos (shell injection via exec/spawn), path traversal, e exposição de informações sensíveis em logs.",
              },
              {
                step: 5,
                icon: <BookOpen size={18} className="text-green-600" />,
                title: "Doc Writer",
                desc: "Gera documentação técnica completa: cria um README com seções obrigatórias (título + descrição, Instalação, Como usar, Estrutura do projeto, Tecnologias utilizadas). Identifica funções e classes exportadas sem documentação JSDoc, listando até 20 itens mais críticos. Se já existir um README, usa como base e sugere melhorias.",
              },
              {
                step: 6,
                icon: <LayoutGrid size={18} className="text-purple-600" />,
                title: "Architect",
                desc: "Mapeia a arquitetura do repositório: organizações de pastas e camadas (controllers, services, models), relações de import/export entre arquivos (dependências diretas), padrões de design reconhecíveis (MVC, Repository, Singleton), acoplamento excessivo entre módulos, e ausência de separação de responsabilidades. Gera sugestões acionáveis de melhoria estrutural.",
              },
              {
                step: 7,
                icon: <BarChart3 size={18} className="text-blue-600" />,
                title: "Reporter + Score Final",
                desc: "Consolida os resultados dos 5 agentes em um único relatório estruturado. Calcula o score geral com pesos: Security Auditor 35% (mais crítico), Code Analyzer 25%, Bug Hunter 20%, Architect 10%, Doc Writer 10%. Para agentes sem score numérico (Bug Hunter, Architect, Doc Writer), o score é derivado automaticamente: bugs por severidade, padrões arquiteturais identificados, e cobertura de documentação. Gera um resumo executivo em linguagem natural via Claude IA, compreensível para não-técnicos. O resultado é exibido no Dashboard com score animado, grid de resumo, painel de segurança com vulnerabilidades expandíveis, lista de bugs agrupados por arquivo, preview do README com botão copiar, mapa de arquitetura, e opção de gerar PDF do relatório completo.",
              },
            ].map((item, i) => (
              <div key={item.step}>
                <div className="flex gap-4">
                  {/* Step number + icon */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 ring-2 ring-gray-200">
                      {item.icon}
                    </div>
                    {i < 6 && (
                      <div className="flex-1 w-px bg-gray-200 my-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">
                        ETAPA {item.step}
                      </span>
                      {item.step >= 2 && item.step <= 6 && (
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">
                          IA
                        </span>
                      )}
                    </div>
                    <h3 className="mt-0.5 text-sm font-semibold text-gray-800">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 rounded-lg bg-indigo-50 p-4 text-center">
            <p className="text-sm font-medium text-indigo-800">
              Etapas 2 a 6 rodam em paralelo via Claude AI (claude-sonnet-4-6)
            </p>
            <p className="text-xs text-indigo-500">
              Tempo estimado: 1-2 minutos depending do tamanho do repositório
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
