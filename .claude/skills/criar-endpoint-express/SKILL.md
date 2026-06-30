---
name: criar-endpoint-express
description: Use esta skill sempre que precisar criar ou modificar uma rota/endpoint do backend Express do CodeLens AI. Define o padrão de validação, tratamento de erros e formato de resposta.
---

# Skill: Criar Endpoint Express

## Quando usar
Sempre que a tarefa for implementar um arquivo dentro de `backend/src/routes/`.

## Passo a passo obrigatório

1. **Leia a spec correspondente** em `specs/agents/orchestrator.spec.md` (para o
   endpoint /analyze) ou na spec de sistema, antes de implementar.

2. **Padrão de estrutura de uma rota:**
```typescript
import { Router } from "express";
import { z } from "zod";

const router = Router();

const RequestSchema = z.object({
  // campos esperados no body
});

router.post("/", async (req, res) => {
  // 1. Validar body com RequestSchema.safeParse()
  // 2. Se inválido, retornar 400 com { error: "mensagem clara" }
  // 3. Executar lógica de negócio (chamar agentes, etc)
  // 4. Tratar timeout e erros inesperados com try/catch
  // 5. Retornar resposta no formato esperado pela spec
});

export default router;
```

3. **Regras obrigatórias de toda rota:**
   - Sempre validar entrada com Zod antes de processar
   - Nunca deixar um erro não tratado quebrar o servidor (sempre try/catch)
   - Mensagens de erro devem ser claras e em português para o usuário final
   - Logar erros no console com contexto suficiente para debug

4. **Para o endpoint /analyze especificamente:**
   - Implementar via Server-Sent Events (SSE) para progresso em tempo real
   - Headers obrigatórios: `Content-Type: text/event-stream`, `Cache-Control: no-cache`
   - Enviar eventos no formato: `data: ${JSON.stringify({event, data})}\n\n`
   - Timeout global de 55 segundos (deixando margem para o Reporter finalizar)

5. **Teste obrigatório ao final:**
   Fornecer o comando `curl` exato para testar o endpoint manualmente.

## Padrões de nomenclatura
- Arquivo: `backend/src/routes/<nome>.ts` (camelCase)
- Registro no index.ts: `app.use('/<nome>', <nome>Router)`
