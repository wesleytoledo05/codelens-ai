# EXECUTAR-TODAS — Orquestração por Subagentes

> Cole este arquivo na raiz do projeto e diga ao Claude Code:
> "Leia e execute o arquivo EXECUTAR-TODAS.md"

## Como isso funciona
Cada item abaixo deve ser executado por um **subagente separado**, com
contexto próprio e isolado. Isso significa: o subagente lê APENAS a spec e o
skill indicados — não carrega o histórico de outras specs já implementadas.
Isso reduz drasticamente o consumo de tokens e o risco de erro por contexto
poluído.

Para cada subagente, sempre:
1. Ler primeiro o `CLAUDE.md` (contexto geral do projeto — leve)
2. Ler a SPEC indicada
3. Ler o SKILL indicado
4. Implementar
5. Rodar a skill `validar-contra-spec` ao final
6. Reportar status (✅ ou ⚠️) antes de finalizar aquele subagente

---

## ORDEM DE EXECUÇÃO

### 🔹 GRUPO 1 — Setup (executar primeiro, sequencial)
> Estes não usam subagentes paralelos pois cada um depende do anterior.

1. **Setup do projeto**
   - Criar estrutura de pastas conforme CLAUDE.md
   - Inicializar backend (`npm init`, instalar dependências, tsconfig)
   - Inicializar frontend (Vite + Tailwind)

**Prompt para disparar este grupo:**
```
Execute o GRUPO 1 do arquivo EXECUTAR-TODAS.md.

Crie a estrutura de pastas do projeto conforme o CLAUDE.md (backend/,
frontend/, specs/ já existem — confirme que estão corretas).

Depois:
1. Inicialize o backend em backend/: npm init, instale express, cors,
   dotenv, @anthropic-ai/sdk, @mastra/core, octokit, zod como dependências,
   e typescript, @types/express, @types/cors, @types/node, ts-node, nodemon
   como dev dependencies. Crie o tsconfig.json com strict: true. Crie um
   endpoint GET /health que retorna { status: "ok" } para teste.

2. Inicialize o frontend em frontend/: npm create vite@latest . --
   --template react-ts, depois instale e configure Tailwind CSS, e instale
   lucide-react e recharts.

Ao final, mostre a estrutura de pastas resultante e confirme que ambos os
projetos rodam (backend respondendo em /health, frontend com a tela padrão
do Vite na porta 5173).
```

---

> ⚠️ **Antes de iniciar o GRUPO 2:** crie o arquivo `backend/.env` com a linha
> `ANTHROPIC_API_KEY=sua_chave_aqui` (pegue sua chave em console.anthropic.com).
> Sem isso, os agentes do Grupo 2 não conseguem ser testados, mesmo que o
> código seja gerado corretamente.

### 🔹 GRUPO 2 — Agentes de Backend (subagentes em paralelo)
> Cada um destes pode ser um subagente independente. Eles não dependem entre si.

| # | Subagente | Spec | Skill |
|---|---|---|---|
| 1 | Code Analyzer    | `specs/agents/code-analyzer.spec.md`     | `criar-agente-mastra` |
| 2 | Bug Hunter        | `specs/agents/bug-hunter.spec.md`        | `criar-agente-mastra` |
| 3 | Security Auditor  | `specs/agents/security-auditor.spec.md`  | `criar-agente-mastra` |
| 4 | Doc Writer        | `specs/agents/doc-writer.spec.md`        | `criar-agente-mastra` |
| 5 | Architect         | `specs/agents/architect.spec.md`         | `criar-agente-mastra` |

**Prompt para disparar este grupo:**
```
Execute os 5 agentes do GRUPO 2 do arquivo EXECUTAR-TODAS.md.
Use um subagente isolado para cada um. Cada subagente deve ler apenas a
spec e o skill indicados na tabela, implementar o agente correspondente em
backend/src/agents/, e validar contra a spec ao final usando o skill
validar-contra-spec.
```

---

### 🔹 GRUPO 3 — Reporter e Orchestrator (sequencial, depende do Grupo 2)
> Estes dependem dos tipos de saída dos agentes do Grupo 2, então rodam depois.

| # | Subagente | Spec | Skill |
|---|---|---|---|
| 1 | Reporter      | `specs/agents/reporter.spec.md`     | `criar-agente-mastra` |
| 2 | Orchestrator  | `specs/agents/orchestrator.spec.md` | `criar-agente-mastra` |

**Prompt para disparar este grupo:**
```
Execute os 2 subagentes do GRUPO 3 do arquivo EXECUTAR-TODAS.md, em
subagentes isolados, na ordem: Reporter primeiro, Orchestrator depois (o
Orchestrator importa e chama todos os outros agentes, incluindo o Reporter).
Valide cada um contra sua spec ao final.
```

---

### 🔹 GRUPO 4 — Endpoint da API (sequencial, depende do Grupo 3)

| # | Subagente | Spec | Skill |
|---|---|---|---|
| 1 | Endpoint /analyze | `specs/agents/orchestrator.spec.md` (seção de uso via API) | `criar-endpoint-express` |

**Prompt para disparar este grupo:**
```
Execute o subagente do GRUPO 4. Crie o endpoint POST /analyze em
backend/src/routes/analyze.ts usando o skill criar-endpoint-express.

IMPORTANTE: confirme antes de tudo que backend/src/agents/orchestrator.ts
exporta uma função chamável (ex: runOrchestrator(input)) que pode ser
importada diretamente nesta rota. Se a função exportada tiver outro nome,
ajuste o import de acordo — não invente um novo arquivo de integração.

Conecte o endpoint a essa função, implementando o fluxo via Server-Sent
Events conforme a spec. Valide contra a spec ao final.
```

---

### 🔹 GRUPO 5 — Frontend Setup (sequencial, primeiro do frontend)

| # | Subagente | Spec | Skill |
|---|---|---|---|
| 1 | Setup frontend | `specs/frontend/setup.spec.md` | — |

**Prompt para disparar este grupo:**
```
Execute o subagente do GRUPO 5. Configure o projeto frontend conforme
specs/frontend/setup.spec.md.
```

---

### 🔹 GRUPO 6 — Componentes do Frontend (subagentes em paralelo)
> Cada componente pode ser um subagente independente.

| # | Subagente | Spec | Skill |
|---|---|---|---|
| 1 | RepoInput     | `specs/frontend/repo-input.spec.md`     | `criar-componente-react` |
| 2 | SecurityPanel | `specs/frontend/security-panel.spec.md` | `criar-componente-react` |
| 3 | Dashboard (+ ScoreCard, BugList, DocPreview, LoadingState) | `specs/frontend/dashboard.spec.md` | `criar-componente-react` |

**Prompt para disparar este grupo:**
```
Execute os 3 subagentes do GRUPO 6 do arquivo EXECUTAR-TODAS.md, em
subagentes isolados e paralelos. Cada subagente lê a spec e o skill
criar-componente-react, implementa o(s) componente(s) correspondente(s) em
frontend/src/components/, e valida contra a spec ao final.
```

---

### 🔹 GRUPO 7 — Integração final (sequencial, último)
> Conecta tudo: App.tsx consumindo a API e renderizando os componentes.

**Prompt para disparar este grupo:**
```
Antes de tudo, confirme que frontend/src/lib/api.ts (criado no GRUPO 5) já
contém a função streamAnalysis. Se não existir ainda, implemente-a agora
seguindo specs/frontend/setup.spec.md antes de prosseguir com a integração.

Agora integre tudo no frontend/src/App.tsx:
- Estado global: idle | loading | success | error
- No estado idle: renderizar RepoInput
- No estado loading: renderizar LoadingState
- No estado success: renderizar Dashboard com o relatório recebido
- No estado error: renderizar mensagem de erro com botão de retry
- Conectar com a função streamAnalysis de frontend/src/lib/api.ts

Depois, suba o backend (cd backend && npm run dev) e o frontend
(cd frontend && npm run dev) e faça um teste manual completo analisando
o repositório https://github.com/expressjs/express.
```

---

## RESUMO DE EXECUÇÃO

```
GRUPO 1 (sequencial)  → Setup
GRUPO 2 (paralelo)    → 5 agentes de análise
GRUPO 3 (sequencial)  → Reporter → Orchestrator
GRUPO 4 (sequencial)  → Endpoint /analyze
GRUPO 5 (sequencial)  → Setup frontend
GRUPO 6 (paralelo)    → Componentes React
GRUPO 7 (sequencial)  → Integração final + teste end-to-end
```

## Comando único para iniciar tudo
Se quiser que o Claude Code gerencie a sequência inteira sozinho, use:

```
Leia o arquivo EXECUTAR-TODAS.md por completo. Execute os grupos na ordem
indicada (1 a 7), respeitando quais são paralelos (subagentes simultâneos)
e quais são sequenciais. Ao final de cada grupo, me dê um resumo do status
(✅/⚠️) antes de avançar para o próximo grupo. Pare e me avise se qualquer
subagente reportar ⚠️ com pendências.
```

> Recomendação: não rode tudo de uma vez na primeira tentativa. Rode grupo
> por grupo, revisando o resultado antes de avançar — principalmente entre
> o GRUPO 2 e o GRUPO 3, já que o Orchestrator depende fortemente do que os
> outros agentes produzirem.
