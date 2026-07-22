# 🛡️ CodeLens AI

> Deep GitHub Repository Analysis powered by Multi-Agent AI and Spec-Driven Development.

CodeLens AI é uma plataforma de análise inteligente de repositórios GitHub, orquestrada por um time de agentes de IA especializados.

Em menos de um minuto, a plataforma realiza uma auditoria completa do projeto, analisando:

- 🔒 Segurança
- 🏗️ Arquitetura
- 🧹 Qualidade de código
- 📚 Documentação
- 🐛 Possíveis bugs
- 📊 Relatórios executivos

---

# 🚀 Diferencial Técnico

## Spec-Driven Development (SDD)

Este projeto foi desenvolvido seguindo a metodologia **Spec-Driven Development**, onde cada módulo e cada agente de IA possuem especificações e contratos definidos antes da implementação.

### Principais características

- 📄 Especificações formais para todos os agentes
- 🧠 Isolamento de contexto entre agentes para reduzir interferências e alucinações
- ✅ Contratos fortemente tipados utilizando Zod
- ⚡ Execução paralela das análises utilizando `Promise.all`
- 🔄 Arquitetura modular orientada a agentes

---

# 🤖 Multi-Agent Architecture

O sistema é composto por sete agentes especializados.

## 🎯 Orchestrator

Responsável por coordenar todo o fluxo da aplicação, coletando os dados do repositório através da API do GitHub e distribuindo as tarefas para os demais agentes.

## 🔒 Security Auditor

Analisa vulnerabilidades seguindo referências como OWASP Top 10 e gera um possível caminho de exploração (*Exploitation Path*) para facilitar o entendimento do impacto.

## 🧹 Code Analyzer

Avalia qualidade do código, complexidade, padrões de desenvolvimento e oportunidades de melhoria.

## 🐞 Bug Hunter

Detecta code smells, possíveis bugs e antipadrões.

## 🏗️ Architect

Analisa a arquitetura do projeto, organização das pastas, dependências e estrutura geral.

## 📚 Documentation Writer

Gera documentação técnica automaticamente, incluindo READMEs e descrições da arquitetura.

## 📊 Reporter

Consolida todas as análises em um relatório executivo único.

---

# 🛠️ Tech Stack

## Front-end

- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts

## Back-end

- Node.js
- Express
- Mastra (Agent Framework)

## Inteligência Artificial

- Groq API (llama-3.1-8b-instant)
- Gemini (fallback)
- OpenRouter (fallback)
- Zod

## Infraestrutura

- Vercel
- Railway
- GitHub Actions

---

# ⚠️ Limitações Técnicas

## Por que nem todos os arquivos são analisados

O CodeLens AI utiliza a **API gratuita da Groq**, que possui limites rígidos de uso:

- **6.000 Tokens Por Minuto (TPM)** no tier gratuito
- Cada um dos 3 agentes de IA (CodeAnalyzer, BugHunter, SecurityAuditor) envia **todo o conteúdo dos arquivos em um único prompt**
- O timeout global da análise é de **120 segundos**, com delays de 10s entre agentes para respeitar o rate limit

Para garantir que a análise execute sem erros de rate limit, o sistema aplica duas camadas de limitação:

### 1. Limite de arquivos (máximo 300)

O repositório é escaneado e os arquivos são filtrados automaticamente:
- **Excluídos**: `node_modules/`, `.git/`, `dist/`, `build/`, `.next/`, `coverage/`, imagens, fontes, lock files
- **Priorizados**: pastas `src/`, `app/`, `lib/`, `components/` vêm primeiro
- Se houver mais de 300 arquivos relevantes, apenas os 300 com maior prioridade são mantidos

### 2. Limite de conteúdo (2.000 caracteres por agente)

Mesmo com até 300 arquivos baixados, o **conteúdo total** enviado a cada agente de IA é limitado a **2.000 caracteres** (configurável via variável de ambiente `MAX_INPUT_CHARS`).

Isso significa:
- Arquivos pequenos (100 chars) → ~20 arquivos analisados de fato
- Arquivos médios (500 chars) → ~4 arquivos analisados
- Arquivos grandes podem ser truncados no meio

**Por quê?** O token equivalente a 2.000 caracteres já consome uma parcela significativa do orçamento de 6.000 TPM. Enviar mais ultrapassaria o limite e causaria erros 429 (rate limit), interrompendo a análise.

### 3. Resultados podem variar

Como a IA utilizada (LLM) é **não-determinística** (mesmo com temperature 0.3), execuções diferentes do mesmo repositório podem gerar:
- Severidades diferentes para os mesmos bugs
- Issues encontradas ou não encontradas
- Scores levemente diferentes

Isso é comportamento esperado de modelos de linguagem — não é um bug.

### Resumo das limitações

| Parâmetro | Valor | Configurável |
|-----------|-------|-------------|
| Máximo de arquivos baixados | 300 | Não |
| Conteúdo máximo por agente | 2.000 chars | Sim (`MAX_INPUT_CHARS`) |
| Timeout global | 120s | Não |
| Timeout do SecurityAuditor | 60s | Não |
| TPM da Groq (free tier) | 6.000 | Não (plano) |
| Temperature do modelo | 0.3 | Não |

---

# 🔒 Auditoria de Segurança

Além de detectar vulnerabilidades, o CodeLens AI busca explicar **como elas podem ser exploradas**, fornecendo um possível *Exploitation Path* para auxiliar desenvolvedores na compreensão dos riscos encontrados.

O objetivo é transformar cada vulnerabilidade em uma oportunidade de aprendizado e correção.

---

# ⚙️ Como executar

## Pré-requisitos

- Node.js 18+
- Chave da API da Groq (gratuita em console.groq.com)
- GitHub Personal Access Token (opcional para repositórios públicos)

## Instalação

```bash
git clone https://github.com/seu-usuario/codelens-ai.git
```

### Backend

```bash
cd backend
npm install
```

Crie um arquivo `.env`

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_key
GROQ_MODEL=llama-3.1-8b-instant
GITHUB_TOKEN=your_token  # opcional
```

### Frontend

```bash
cd ../frontend
npm install
```

## Executando

Backend

```bash
npm run dev
```

Frontend

```bash
npm run dev
```

---

# 🎯 Objetivos do Projeto

- Demonstrar o uso de sistemas Multi-Agent
- Explorar Spec-Driven Development (SDD)
- Aplicar IA em Engenharia de Software
- Automatizar auditorias de código
- Gerar documentação técnica automaticamente

---

# 👨‍💻 Autor

**José Wesley**

Front-end Developer • AI Agent Systems • Spec-Driven Development • Software Architecture

---

⭐ Se este projeto foi útil para você, considere deixar uma estrela no repositório.
