---
name: validar-contra-spec
description: Use esta skill ao final da implementação de qualquer agente, componente ou endpoint para validar formalmente que o código atende à spec que o originou. Esta é a etapa de "Validate" do ciclo Spec Driven Development (SDD).
---

# Skill: Validar Contra Spec

## Quando usar
Sempre como ÚLTIMA etapa de qualquer subagente, depois de implementar o código.
Nunca finalize uma tarefa sem rodar esta validação.

## Passo a passo obrigatório

1. Releia a spec original usada para esta implementação.

2. Extraia todos os "Critérios de Aceitação" e "Requisitos" listados na spec.

3. Para cada um, verifique no código implementado se está atendido. Gere uma
   tabela neste formato:

```markdown
| Critério                                  | Status | Observação              |
|--------------------------------------------|--------|--------------------------|
| DADO X QUANDO Y ENTÃO Z                    | ✅     | Implementado em linha N |
| Schema de saída bate com o definido        | ✅     |                          |
| Trata erro de input inválido               | ❌     | FALTA implementar       |
```

4. Se houver qualquer item com ❌, corrija o código IMEDIATAMENTE antes de
   considerar a tarefa concluída. Não passe a tarefa adiante com pendências.

5. Ao final, escreva uma linha de resumo:
   `✅ Spec [nome-da-spec] 100% validada e implementada.`
   ou
   `⚠️ Spec [nome-da-spec] implementada com ressalvas: [listar]`

## Por que isso importa
Esta etapa é o que diferencia Spec Driven Development de vibe coding. Sem essa
validação explícita, código pode "parecer" certo mas não atender ao que foi
realmente especificado, gerando retrabalho mais tarde.
