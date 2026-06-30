---
name: criar-agente-mastra
description: Use esta skill sempre que precisar criar um agente de IA do backend do CodeLens (Orchestrator, Code Analyzer, Bug Hunter, Security Auditor, Doc Writer, Architect ou Reporter). Define o padrão exato de como um agente Mastra deve ser estruturado, chamado e validado neste projeto.
---

# Skill: Criar Agente Mastra

## Quando usar
Sempre que a tarefa for implementar um arquivo dentro de `backend/src/agents/`.

## Passo a passo obrigatório

1. **Leia a spec correspondente** em `specs/agents/<nome-do-agente>.spec.md` antes de
   escrever qualquer código. A spec define: entrada, saída (schema JSON), regras de
   negócio e critérios de aceitação. Nunca implemente sem ler a spec primeiro.

2. **Estrutura do arquivo do agente:**
```typescript
import { anthropic } from "@ai-sdk/anthropic"; // ou @anthropic-ai/sdk conforme o setup
import { z } from "zod";

// 1. Defina o schema de saída com Zod (espelhando exatamente o schema da spec)
const OutputSchema = z.object({
  // ...campos conforme a spec
});

// 2. Defina o system prompt (deve vir da seção "System Prompt" da spec, se houver)
const SYSTEM_PROMPT = `...`;

// 3. Função principal do agente
export async function runNomeDoAgente(input: InputType): Promise<OutputType> {
  // monta o prompt com os dados de entrada
  // chama o Claude API (model: claude-sonnet-4-6)
  // faz parse da resposta com o OutputSchema.parse()
  // se falhar o parse, faz 1 retry pedindo correção do formato
  // retorna o resultado tipado
}
```

3. **Tratamento de erros obrigatório:**
   - Se o JSON retornado pela IA for inválido, fazer retry uma vez com mensagem
     explícita pedindo para corrigir o formato
   - Se falhar novamente, lançar erro tipado `AgentExecutionError`
   - Nunca deixar a função quebrar silenciosamente

4. **Teste manual obrigatório ao final:**
   Criar (ou atualizar) um arquivo de teste simples que chama a função do agente
   com um input de exemplo e imprime o resultado no console, para confirmar que
   funciona antes de prosseguir.

5. **Validação contra a spec:**
   Depois de implementado, releia a spec e confirme item por item que os
   Critérios de Aceitação são atendidos. Liste isso explicitamente no final.

## Padrões de nomenclatura
- Arquivo: `backend/src/agents/<nomeDoAgente>.ts` (camelCase)
- Função exportada: `run<NomeDoAgente>` (ex: `runSecurityAuditor`)
- Tipos: `<NomeDoAgente>Input` e `<NomeDoAgente>Output`

## Regras de paralelismo
O Orchestrator deve rodar Code Analyzer, Bug Hunter, Security Auditor, Doc Writer
e Architect em paralelo via `Promise.all()`. O Reporter só roda depois que todos
os outros terminarem.
