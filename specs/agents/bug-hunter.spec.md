# SPEC — BUG HUNTER AGENT

## Responsabilidade
Detectar bugs potenciais, antipatterns e code smells no código analisado.

## Entrada
```typescript
type BugHunterInput = {
  files: Array<{
    path: string;
    content: string;
    extension: string;
  }>;
}
```

## Saída
```typescript
type BugHunterOutput = {
  bugs: Array<{
    id: string; // ex: "BUG-001"
    severity: "HIGH" | "MEDIUM" | "LOW";
    file: string;
    line: number;
    description: string;
    suggestion: string;
  }>;
}
```

## O que o agente deve detectar
- Código morto (funções/variáveis declaradas e nunca usadas)
- Condições logicamente impossíveis (ex: `if (x > 10 && x < 5)`)
- Possível acesso a `null`/`undefined` sem verificação prévia
- Loops com potencial infinito (condição de parada ausente ou inalcançável)
- Vazamento de memória potencial (listeners não removidos, intervals não limpos)
- Antipatterns conhecidos: callback hell, magic numbers, mutação de estado direta em React
- Promises sem tratamento de erro (`.catch()` ausente ou `await` sem try/catch)

## Regras de negócio
- Cada bug deve ter localização exata (arquivo + linha aproximada)
- Sugestão deve ser específica ao problema encontrado
- Priorizar bugs HIGH e MEDIUM na lista (LOW só se houver poucos achados)

## Critérios de aceitação
- DADO um código com `useState` sendo mutado diretamente (ex: `state.push(item)`)
  QUANDO o agente analisar um arquivo React
  ENTÃO deve reportar bug de severidade MEDIUM ou HIGH sobre mutação direta de estado

- DADO uma função `async` sem try/catch chamando uma API externa
  QUANDO o agente analisar
  ENTÃO deve reportar bug sobre tratamento de erro ausente
