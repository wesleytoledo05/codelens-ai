# CODELENS AI — CONSTITUIÇÃO DO PROJETO

## O que é este projeto
Plataforma web onde o usuário cola uma URL de repositório GitHub e recebe um
dashboard completo de análise gerado por um time de 7 agentes de IA.

## Stack técnica
- Frontend: React + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Node.js + Express + TypeScript
- Orquestração de agentes: Mastra
- LLM: Claude API (claude-sonnet-4-6)
- GitHub API: Octokit
- Deploy: Vercel (frontend) + Railway (backend)

## Estrutura de pastas
```
codelens-ai/
├── frontend/     # React app
├── backend/      # Node.js API + agentes
│   ├── agents/   # Os 7 agentes de IA
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
5. Doc Writer — gera README e documentação
6. Architect — mapa de estrutura e dependências
7. Reporter — consolida outputs de todos os agentes em JSON final

## Componentes do sistema (frontend)
1. RepoInput — tela inicial onde o usuário cola a URL
2. LoadingState — progresso da análise em tempo real
3. Dashboard — orquestra todos os painéis de resultado
4. ScoreCard — score geral de 0-100
5. SecurityPanel — painel de vulnerabilidades (componente mais importante visualmente)
6. BugList — lista de bugs encontrados
7. DocPreview — preview do README gerado

## Status atual do projeto
[ ] Fase 0: Setup inicial
[ ] Fase 1: Backend + Agentes
[ ] Fase 2: Frontend
[ ] Fase 3: Deploy

## Como este projeto é construído (IMPORTANTE)
Este projeto usa execução por subagentes isolados. Cada spec é implementada por
um subagente com contexto próprio, consultando o skill apropriado em .claude/skills/.
Use o arquivo EXECUTAR-TODAS.md como guia de orquestração.
