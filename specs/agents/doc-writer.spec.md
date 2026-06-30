# SPEC — DOC WRITER AGENT

## Responsabilidade
Gerar documentação técnica do repositório analisado, incluindo um README
completo e identificação de funções/módulos sem documentação.

## Entrada
```typescript
type DocWriterInput = {
  files: Array<{
    path: string;
    content: string;
    extension: string;
  }>;
  repoName: string;
}
```

## Saída
```typescript
type DocWriterOutput = {
  readme: string;        // markdown completo gerado
  missingDocs: Array<{
    file: string;
    description: string; // ex: "função exportada sem comentário JSDoc"
  }>;
}
```

## Estrutura obrigatória do README gerado
1. Título do projeto + descrição curta (inferida do código)
2. Seção "Instalação" com comandos prováveis (npm install, etc)
3. Seção "Como usar" com exemplo básico
4. Seção "Estrutura do projeto" (árvore simplificada)
5. Seção "Tecnologias utilizadas" (inferidas do package.json se presente)

## Regras de negócio
- O README deve ser gerado mesmo se o projeto não tiver nenhuma documentação prévia
- Se já existir um README no repositório, usar como base e sugerir melhorias
  em vez de substituir completamente
- `missingDocs` deve listar no máximo 20 itens, priorizando funções/classes
  exportadas (públicas) sem nenhum comentário

## Critérios de aceitação
- DADO um repositório sem nenhum README
  QUANDO o agente processa
  ENTÃO deve gerar um README completo com todas as seções obrigatórias

- DADO uma função exportada sem nenhum comentário JSDoc
  QUANDO o agente processa
  ENTÃO deve listá-la em `missingDocs`
