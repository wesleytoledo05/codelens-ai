# SPEC — SETUP DO FRONTEND

## Responsabilidade
Configurar a base do projeto frontend: Vite + React + TypeScript + Tailwind,
além da camada de comunicação com o backend.

## Tarefas
1. Inicializar projeto Vite com template `react-ts`
2. Instalar e configurar Tailwind CSS
3. Instalar `lucide-react` (ícones) e `recharts` (gráficos, se necessário)
4. Criar `frontend/src/lib/api.ts` com:
   - `BASE_URL` lendo de `import.meta.env.VITE_API_URL` com fallback para
     `http://localhost:3001`
   - Função `streamAnalysis(repoUrl, callbacks)` que consome o endpoint
     `/analyze` via Server-Sent Events
5. Criar `frontend/src/types.ts` com todos os tipos compartilhados (espelhando
   os schemas definidos nas specs dos agentes do backend)

## Critérios de aceitação
- DADO o comando `npm run dev`
  QUANDO executado dentro de `frontend/`
  ENTÃO o servidor Vite deve iniciar na porta 5173 sem erros

- DADO a variável de ambiente `VITE_API_URL` não definida
  QUANDO a aplicação roda localmente
  ENTÃO `BASE_URL` deve usar o fallback `http://localhost:3001`
