# SPEC — CODE ANALYZER AGENT

## Responsabilidade
Analisar a qualidade geral do código: complexidade, duplicação, nomenclatura,
tamanho de funções e cobertura de tipagem (no caso de TypeScript).

## Entrada
```typescript
type CodeAnalyzerInput = {
  files: Array<{
    path: string;
    content: string;
    extension: string;
  }>;
}
```

## Saída
```typescript
type CodeAnalyzerOutput = {
  score: number; // 0-100
  metrics: {
    averageFunctionLength: number;
    duplicatedBlocks: number;
    filesWithoutTypes: number; // arquivos .js/.ts sem tipagem adequada
  };
  issues: Array<{
    file: string;
    line: number;
    type: string; // ex: "FUNCAO_MUITO_LONGA", "NOME_POUCO_DESCRITIVO"
    description: string;
    suggestion: string;
  }>;
}
```

## O que o agente deve analisar
- Complexidade ciclomática de funções (muitos ifs/loops aninhados)
- Duplicação de código entre arquivos
- Tamanho de funções (funções com mais de 50 linhas são suspeitas)
- Nomenclatura de variáveis e funções (nomes genéricos como `data`, `temp`, `x`)
- Cobertura de tipos em TypeScript (uso excessivo de `any`)
- Comentários excessivos indicando código pouco claro

## Regras de negócio
- Score 0-59: qualidade ruim
- Score 60-79: qualidade regular
- Score 80-100: qualidade boa
- Cada issue deve ter sugestão de melhoria concreta, não genérica

## Critérios de aceitação
- DADO um arquivo com uma função de 120 linhas
  QUANDO o agente analisar
  ENTÃO deve reportar issue do tipo FUNCAO_MUITO_LONGA com sugestão de quebrar em funções menores

- DADO um projeto TypeScript bem tipado sem uso de `any`
  QUANDO o agente analisar
  ENTÃO `metrics.filesWithoutTypes` deve ser 0 ou próximo de 0
