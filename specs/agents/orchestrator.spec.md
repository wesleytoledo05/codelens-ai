# SPEC — ORCHESTRATOR AGENT

## Responsabilidade
Coordenar todo o fluxo de análise: receber a URL, buscar os arquivos do
repositório, distribuir o trabalho entre os 5 agentes de análise e encaminhar
os resultados ao Reporter.

## Entrada
```typescript
type OrchestratorInput = {
  repoUrl: string; // ex: "https://github.com/expressjs/express"
}
```

## Saída
```typescript
type OrchestratorOutput = {
  status: "complete" | "timeout" | "error";
  agentResults: {
    codeAnalyzer: CodeAnalyzerOutput;
    bugHunter: BugHunterOutput;
    securityAuditor: SecurityAuditorOutput;
    docWriter: DocWriterOutput;
    architect: ArchitectOutput;
  };
  filesAnalyzed: number;
  errorMessage?: string;
}
```

## Regras de negócio
1. Validar que a URL segue o padrão `https://github.com/{owner}/{repo}`
2. Usar Octokit para buscar recursivamente todos os arquivos do repositório
3. Filtrar arquivos antes de processar:
   - Ignorar pastas: `node_modules/`, `.git/`, `dist/`, `build/`, `.next/`, `coverage/`
   - Ignorar extensões binárias: `.png`, `.jpg`, `.jpeg`, `.gif`, `.pdf`, `.ico`, `.woff`, `.ttf`
   - Ignorar arquivos de lock: `package-lock.json`, `yarn.lock`
4. Se o repositório tiver mais de 300 arquivos relevantes, priorizar nesta ordem:
   `src/`, `app/`, `lib/`, `components/`, raiz do projeto
5. Disparar os 5 agentes de análise EM PARALELO usando `Promise.all()`
6. Aplicar timeout global de 55 segundos (margem de 5s para o Reporter)
7. Se o repositório for privado ou não existir, retornar status "error" com
   mensagem clara em português

## Ferramenta utilizada
`backend/src/tools/githubFetcher.ts` — responsável pela busca via Octokit

## Critérios de aceitação
- DADO a URL `https://github.com/expressjs/express`
  QUANDO o Orchestrator processa
  ENTÃO deve retornar status "complete" com os 5 resultados de agentes preenchidos

- DADO uma URL malformada (ex: "github.com/algo")
  QUANDO o Orchestrator processa
  ENTÃO deve retornar status "error" sem chamar nenhum agente

- DADO um repositório com mais de 300 arquivos
  QUANDO o Orchestrator processa
  ENTÃO deve filtrar e analisar apenas os 300 arquivos mais relevantes

- DADO o processamento excedendo 55 segundos
  QUANDO o timeout é atingido
  ENTÃO deve retornar status "timeout" com os resultados parciais disponíveis
