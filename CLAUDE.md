# CODELENS AI — CONSTITUIÇÃO DO PROJETO

## O que é este projeto
Plataforma web onde o usuário cola uma URL de repositório GitHub e recebe um
dashboard completo de análise gerado por um time de agentes de IA.

## Stack técnica
- Frontend: React + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Node.js + Express + TypeScript
- LLM: Groq API (llama-3.1-8b-instant) — gratuito
- GitHub API: Octokit
- Deploy: Vercel (frontend) + Railway (backend)

## Estrutura de pastas
```
codelens-ai/
├── frontend/     # React app
├── backend/      # Node.js API + agentes
│   ├── agents/   # Os agentes de IA
│   ├── lib/      # Cliente de IA compartilhado
│   ├── tools/    # Ferramentas dos agentes
│   └── routes/   # Endpoints da API
└── specs/        # Especificações SDD (NÃO APAGAR)
```

## Regras absolutas (nunca violar)
- SEMPRE ler a spec correspondente em specs/ antes de implementar qualquer arquivo
- NUNCA gerar código sem que exista uma spec aprovada para aquele componente
- Cada agente backend tem sua spec em specs/agents/
- Cada componente frontend tem sua spec em specs/frontend/
- TypeScript estrito em todo o projeto (strict: true no tsconfig)
- Commits pequenos e descritivos após cada tarefa concluída
- Ao terminar uma tarefa, validar o resultado contra os Critérios de Aceitação da spec usada

## Agentes do sistema (backend)
1. Orchestrator — coordena todos os agentes, busca arquivos via Octokit
2. Code Analyzer — qualidade e complexidade de código
3. Bug Hunter — antipatterns e code smells
4. Security Auditor — OWASP Top 10 e vulnerabilidades (agente mais importante)
5. Reporter — consolida outputs de todos os agentes em JSON final

## Componentes do sistema (frontend)
1. RepoInput — tela inicial onde o usuário cola a URL
2. LoadingState — progresso da análise em tempo real
3. Dashboard — orquestra todos os painéis de resultado
4. ScoreCard — score geral de 0-100
5. SecurityPanel — painel de vulnerabilidades (componente mais importante visualmente)
6. BugList — lista de bugs encontrados

## Configuração da IA (.env do backend)
```env
AI_PROVIDER=groq
GROQ_API_KEY=sua-chave-aqui
GROQ_MODEL=llama-3.1-8b-instant
GITHUB_TOKEN=seu-token-aqui
```

## Status atual do projeto
[x] Fase 0: Setup inicial
[x] Fase 1: Backend + Agentes
[x] Fase 2: Frontend
[ ] Fase 3: Deploy
