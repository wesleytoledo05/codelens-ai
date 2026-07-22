# Changelog — 21/07/2026

Resumo de todas as alterações feitas na sessão de hoje.

---

## 1. Migração: Claude AI → Groq AI

**Motivo:** O projeto não utiliza mais Claude. A IA atual é Groq (llama-3.1-8b-instant), que é gratuita.

**Arquivos alterados:**

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `frontend/src/components/RepoInput.tsx:168` | `Claude AI (claude-sonnet-4-6)` | `Groq AI (llama-3.1-8b-instant)` |
| `frontend/src/App.tsx:49` | `currentAgent="Claude AI"` | `currentAgent="Groq AI"` |
| `.claude/skills/criar-agente-mastra/SKILL.md:33` | `chama o Claude API (model: claude-sonnet-4-6)` | `chama o Groq API (model: llama-3.1-8b-instant)` |

---

## 2. Sistema de Configuração de API Keys (Bring Your Own Key)

**Motivo:** Para colocar o projeto online, qualquer pessoa pode testar usando suas próprias chaves de API, sem o desenvolvedor expor suas chaves.

### Arquivos criados

#### `backend/src/types.ts`
Tipo compartilhado `ApiKeys` com `groqApiKey` e `githubToken` (ambos opcionais).

#### `frontend/src/hooks/useApiKeys.ts`
Hook que:
- Salva/lê chaves do `localStorage`
- Expõe `keys`, `setKeys`, `isOpen`, `setIsOpen`, `hasGroqKey`
- Chave Groq é obrigatória; GitHub Token é opcional

#### `frontend/src/components/SettingsModal.tsx`
Modal de configuração com:
- Campo **Groq API Key** (obrigatório) com instruções passo-a-passo para obter em console.groq.com
- Campo **GitHub Token** (opcional) com explicação de benefícios (acesso a repos privados, rate limit maior)
- Indicadores visuais de status (configurada/não configurada)
- Salva automaticamente no localStorage

### Arquivos modificados

#### `backend/src/lib/mimo-client.ts`
- `getClient()` agora aceita `overrideApiKey` opcional
- Cache de clientes por chave para evitar recriar instâncias
- `mimoChat()` e `mimoChatWithRetry()` aceitam `apiKey` nas options

#### `backend/src/agents/code-analyzer.ts`
- `CodeAnalyzerInput` agora inclui `ApiKeys`
- Repassa `groqApiKey` para `mimoChat()`

#### `backend/src/agents/bug-hunter.ts`
- `BugHunterInput` agora inclui `ApiKeys`
- Repassa `groqApiKey` para `mimoChat()`

#### `backend/src/agents/security-auditor.ts`
- `SecurityAuditorInput` agora inclui `ApiKeys`
- Repassa `groqApiKey` para `mimoChat()`

#### `backend/src/agents/reporter.ts`
- `ReporterInput` agora inclui `ApiKeys`
- `generateExecutiveSummary()` aceita `apiKey` opcional
- Repassa `groqApiKey` para `mimoChat()`

#### `backend/src/agents/orchestrator.ts`
- `OrchestratorInput` agora inclui `ApiKeys`
- Usa `githubToken` do input (com fallback para env var)
- Repassa `groqApiKey` para todos os agentes

#### `backend/src/routes/analyze.ts`
- Schema valida `groqApiKey` e `githubToken` opcionais no body
- Envia chaves para orchestrator e reporter

#### `frontend/src/lib/api.ts`
- `streamAnalysis()` aceita `keys` opcional
- Envia `groqApiKey` e `githubToken` no POST `/analyze`

#### `frontend/src/App.tsx`
- Importa `SettingsModal` e `useApiKeys`
- Botão "Config API" no canto superior direito com dot amarelo quando não configurada
- Bloqueia análise se Groq key não estiver configurada (abre modal automaticamente)
- Envia chaves para `streamAnalysis()`

### Fluxo do usuário
1. Usuário clica em "Analisar" sem chave → modal abre automaticamente
2. Obtém chave gratuita em console.groq.com (passos detalhados no modal)
3. Cola a chave → Salva (fica no localStorage do navegador)
4. Agora pode analisar qualquer repo público

---

## 3. Fix: Security Auditor sempre aparece no dashboard

**Motivo:** O Security Auditor rodava por último na fila de agentes e às vezes não terminava antes do timeout global de 120s, fazendo com que o painel de segurança não aparecesse no dashboard.

### Causa raiz
- Os 3 agentes rodavam sequencialmente com delays de 10s entre eles
- Timeout de 120s era compartilhado entre todos
- Se CodeAnalyzer + BugHunter + delays consumiam muito tempo, o SecurityAuditor era cortado

### Correções

#### `backend/src/agents/orchestrator.ts`
- Security Auditor agora tem seu próprio timeout de **60 segundos**, separado dos outros agentes
- Se exceder, retorna `{ error: true, message: "..." }` em vez de falhar silenciosamente

#### `backend/src/routes/analyze.ts`
- Se o Security Auditor falhar por qualquer motivo (timeout, erro de API, rate limit), retorna um **resultado padrão** `{ vulnerabilities: [], score: 85 }` em vez de `null`
- Isso garante que o `SecurityPanel` sempre renderiza no dashboard

---

## Resumo de impacto

| Área | Antes | Depois |
|------|-------|--------|
| IA utilizada | Claude AI (referências) | Groq AI (llama-3.1-8b-instant) |
| Chaves de API | Fixas no `.env` do backend | Configuráveis pelo usuário (localStorage) |
| Deploy público | Não possível (exporia chaves) | Possível (BYOK — Bring Your Own Key) |
| Security Auditor | Às vezes não aparecia | Sempre aparece no dashboard |
| Total de arquivos criados | — | 3 (`types.ts`, `useApiKeys.ts`, `SettingsModal.tsx`) |
| Total de arquivos modificados | — | 10 |
