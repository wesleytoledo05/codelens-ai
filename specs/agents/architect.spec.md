# SPEC — ARCHITECT AGENT

## Responsabilidade
Mapear a estrutura arquitetural do repositório: organização de pastas,
dependências entre módulos, padrões de design identificados e sugestões de
melhoria estrutural.

## Entrada
```typescript
type ArchitectInput = {
  files: Array<{
    path: string;
    content: string;
    extension: string;
  }>;
}
```

## Saída
```typescript
type ArchitectOutput = {
  structure: {
    folders: string[];        // pastas principais identificadas
    layers: string[];         // ex: ["controllers", "services", "models"]
  };
  dependencies: Array<{
    from: string;              // arquivo que importa
    to: string;                // arquivo importado
  }>;
  patterns: string[];          // ex: ["MVC", "Repository Pattern", "Singleton"]
  suggestions: string[];       // sugestões de melhoria arquitetural
}
```

## O que o agente deve analisar
- Estrutura de pastas e o que cada uma parece representar
- Relações de import/export entre arquivos (dependências diretas)
- Padrões de arquitetura reconhecíveis (MVC, camadas, microsserviços, etc)
- Acoplamento excessivo entre módulos que deveriam ser independentes
- Ausência de separação de responsabilidades (ex: lógica de negócio misturada
  com lógica de apresentação)

## Regras de negócio
- Limitar o mapeamento de dependências aos 100 relacionamentos mais relevantes
  caso o projeto seja muito grande
- Sugestões devem ser acionáveis, não genéricas (evitar "melhore a arquitetura")

## Critérios de aceitação
- DADO um projeto com pastas `controllers/`, `services/`, `models/`
  QUANDO o agente analisar
  ENTÃO deve identificar o padrão "MVC" ou "Layered Architecture" em `patterns`

- DADO um arquivo de rota importando diretamente código de acesso a banco de dados
  sem camada intermediária
  QUANDO o agente analisar
  ENTÃO deve sugerir a criação de uma camada de serviço/repositório
