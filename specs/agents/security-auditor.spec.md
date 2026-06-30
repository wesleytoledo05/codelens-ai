# SPEC — SECURITY AUDITOR AGENT

> Este é o agente mais importante do projeto. Capricha aqui.

## Responsabilidade

Analisar o código-fonte do repositório buscando vulnerabilidades de segurança,
categorizando-as por severidade e mapeando para a classificação OWASP Top 10
quando aplicável.

## Entrada

```typescript
type SecurityAuditorInput = {
  files: Array<{
    path: string;
    content: string;
    extension: string;
  }>;
};
```

## Saída

```typescript
type SecurityAuditorOutput = {
  vulnerabilities: Array<{
    id: string; // ex: "SEC-001"
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    category: string; // ex: "SQL_INJECTION", "HARDCODED_SECRET", "XSS"
    file: string;
    line: number;
    description: string; // descrição clara do problema
    exploitationPath: string; //Passo a passo de como um invasor exploraria essa falha
    recommendation: string; // como corrigir
    owasp: string; // ex: "A03:2021 - Injection"
  }>;
  score: number; // 0-100, onde 100 = nenhuma vulnerabilidade
  summary: string; // resumo executivo em português
};
```

## Categorias que o agente DEVE detectar

- Secrets hardcoded (API keys, senhas, tokens diretamente no código)
- SQL Injection (concatenação de strings em queries SQL)
- Cross-Site Scripting (XSS) — innerHTML sem sanitização, dangerouslySetInnerHTML
- Autenticação fraca (JWT sem validação de assinatura, senha em texto puro)
- CORS permissivo (`Access-Control-Allow-Origin: *` em produção)
- Dependências com CVEs conhecidos (analisar package.json se presente)
- Comunicação sem HTTPS (URLs http:// hardcoded para APIs externas)
- Injeção de comandos (shell injection via exec/spawn com input do usuário)
- Path Traversal (concatenação de paths sem sanitização)
- Exposição de informações sensíveis em logs ou mensagens de erro

## System Prompt do agente

```
Você é um especialista sênior em segurança de aplicações (AppSec) com
certificação OSCP. Analise o código fornecido buscando vulnerabilidades de
segurança reais e específicas — não genéricas.

Para cada vulnerabilidade encontrada:
1. Identifique o arquivo exato e a linha aproximada.
2. Classifique a severidade e mapeie para OWASP Top 10 2021.
3. No campo 'exploitationPath', descreva de forma técnica e didática o passo a passo que um atacante seguiria para explorar essa falha específica (ex: qual payload usaria, qual seria o impacto final).

Seja rigoroso mas preciso: não invente vulnerabilidades que não existem no
código fornecido. Se o código estiver seguro, retorne um array vazio e score alto.

Retorne APENAS um objeto JSON válido, sem markdown, sem blocos de código,
sem explicações antes ou depois. Siga EXATAMENTE o schema fornecido.
```

## Regras de negócio

1. Score deve ser calculado considerando: nenhuma CRITICAL/HIGH = score alto (80-100);
   presença de CRITICAL = score baixo (0-40)
2. Cada vulnerabilidade deve ter um ID único sequencial (SEC-001, SEC-002...)
3. Se não houver vulnerabilidades, retornar `vulnerabilities: []` e `score: 95-100`
4. O campo `owasp` é opcional quando a vulnerabilidade não mapeia para nenhuma
   categoria OWASP — usar string vazia nesse caso
5. Limitar a análise a no máximo 50 vulnerabilidades reportadas (priorizar
   CRITICAL e HIGH se houver excesso)

## Critérios de aceitação

- DADO um arquivo contendo `const API_KEY = "sk-abc123xyz"`
  QUANDO o agente analisar
  ENTÃO deve retornar uma vulnerabilidade CRITICAL de categoria HARDCODED_SECRET

- DADO um arquivo contendo `query("SELECT * FROM users WHERE id = " + req.params.id)`
  QUANDO o agente analisar
  ENTÃO deve retornar vulnerabilidade CRITICAL ou HIGH categoria SQL_INJECTION
  mapeada para "A03:2021 - Injection"

- DADO um repositório sem nenhuma vulnerabilidade identificável
  QUANDO o agente analisar
  ENTÃO deve retornar `vulnerabilities: []` e `score >= 90`

- DADO a resposta da IA vier em formato JSON inválido
  QUANDO o agente tentar fazer o parse
  ENTÃO deve fazer 1 retry pedindo correção do formato antes de lançar erro
