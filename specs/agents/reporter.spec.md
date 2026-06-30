# SPEC — REPORTER AGENT

## Responsabilidade
Consolidar os outputs de todos os 5 agentes de análise (Code Analyzer, Bug
Hunter, Security Auditor, Doc Writer, Architect) em um único objeto JSON
estruturado, pronto para ser consumido pelo frontend.

## Entrada
```typescript
type ReporterInput = {
  codeAnalyzer: CodeAnalyzerOutput;
  bugHunter: BugHunterOutput;
  securityAuditor: SecurityAuditorOutput;
  docWriter: DocWriterOutput;
  architect: ArchitectOutput;
  repoUrl: string;
  filesAnalyzed: number;
}
```

## Saída
```typescript
type ReporterOutput = {
  repoUrl: string;
  filesAnalyzed: number;
  overallScore: number;        // média ponderada dos scores dos agentes
  executiveSummary: string;    // resumo em português, 2-3 frases
  sections: {
    quality: CodeAnalyzerOutput;
    bugs: BugHunterOutput;
    security: SecurityAuditorOutput;
    documentation: DocWriterOutput;
    architecture: ArchitectOutput;
  };
  generatedAt: string; // ISO timestamp
}
```

## Regras de negócio
1. `overallScore` deve ser calculado como média ponderada:
   - Security Auditor: peso 35% (é o mais crítico)
   - Code Analyzer: peso 25%
   - Bug Hunter: peso 20%
   - Architect: peso 10%
   - Doc Writer: peso 10%
2. O `executiveSummary` deve ser gerado via chamada à IA, resumindo os
   principais achados de forma humana e direta (não apenas concatenar dados)
3. Se algum agente falhar e retornar resultado vazio/nulo, o Reporter deve
   ainda assim gerar o relatório com os dados disponíveis, marcando a seção
   ausente claramente

## Critérios de aceitação
- DADO os 5 outputs de agentes completos
  QUANDO o Reporter processa
  ENTÃO deve retornar um objeto único com `overallScore` calculado corretamente
  conforme os pesos definidos

- DADO o Security Auditor retornando vulnerabilidades CRITICAL
  QUANDO o Reporter calcula o overallScore
  ENTÃO o score geral deve refletir fortemente essa penalização (peso 35%)

- DADO todos os agentes com resultado satisfatório
  QUANDO o Reporter gera o executiveSummary
  ENTÃO o resumo deve ser compreensível por alguém não técnico
