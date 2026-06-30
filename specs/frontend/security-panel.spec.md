# SPEC — COMPONENTE SecurityPanel

> Este é o componente visualmente mais importante do projeto. Deve parecer um
> relatório de pentest profissional.

## Responsabilidade

Exibir as vulnerabilidades de segurança encontradas pelo Security Auditor,
categorizadas por severidade, de forma visualmente impactante.

## Props

```typescript
type SecurityPanelProps = {
  vulnerabilities: Array<{
    id: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    category: string;
    file: string;
    line: number;
    description: string;
    exploitationPath: string;
    recommendation: string;
    owasp: string;
  }>;
  score: number;
};
```

## Estrutura visual obrigatória

1. **Header:** ícone de escudo (lucide-react `Shield`) + título "Auditoria de
   Segurança" + score de segurança em destaque
2. **Contadores no topo:** 4 cards pequenos mostrando a contagem de
   vulnerabilidades por severidade: CRÍTICAS | ALTAS | MÉDIAS | BAIXAS
3. **Lista de vulnerabilidades**, cada item exibindo:
   - Badge de severidade colorido (ver cores no skill `criar-componente-react`)
   - Nome do arquivo + número da linha
   - Descrição do problema
   - Caminho de Exploração: Seção com destaque visual (ex: fundo cinza claro) explicando o passo a passo do ataque
   - Seção expansível (clique para expandir) com a recomendação de correção
   - Tag pequena com a classificação OWASP, se presente
4. **Estado vazio:** se `vulnerabilities.length === 0`, mostrar ícone de check
   verde grande com mensagem "Nenhuma vulnerabilidade encontrada 🎉"

## Ordenação

A lista deve ser ordenada por severidade: CRITICAL primeiro, depois HIGH,
MEDIUM e LOW por último.

## Cores (replicar exatamente do skill criar-componente-react)

- CRITICAL: `bg-red-100 text-red-800 border-red-200`
- HIGH: `bg-orange-100 text-orange-800 border-orange-200`
- MEDIUM: `bg-yellow-100 text-yellow-800 border-yellow-200`
- LOW: `bg-green-100 text-green-800 border-green-200`

## Critérios de aceitação

- DADO um array com 3 vulnerabilidades CRITICAL e 1 LOW
  QUANDO o componente renderiza
  ENTÃO as 3 CRITICAL devem aparecer antes da LOW na lista

- DADO um array vazio de vulnerabilidades
  QUANDO o componente renderiza
  ENTÃO deve exibir o estado vazio de sucesso, não uma lista em branco

- DADO o clique em uma vulnerabilidade da lista
  QUANDO o clique ocorre
  ENTÃO a seção de recomendação deve expandir/colapsar
