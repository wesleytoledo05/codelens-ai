# SPEC — DASHBOARD (e componentes auxiliares)

## Responsabilidade
Orquestrar a exibição de todos os painéis de resultado após a análise
completa, além dos componentes auxiliares ScoreCard, BugList, DocPreview e
LoadingState.

## Componente: Dashboard
### Props
```typescript
type DashboardProps = {
  report: ReporterOutput; // schema definido em specs/agents/reporter.spec.md
}
```
### Estrutura (nesta ordem vertical)
1. ScoreCard com o `overallScore`
2. Grid de 4 cards de resumo: Qualidade | Bugs | Segurança | Documentação
3. SecurityPanel (seção completa)
4. BugList (seção completa)
5. DocPreview (seção completa)
6. Mapa de arquitetura (lista simples de pastas e padrões identificados)

## Componente: ScoreCard
### Props
```typescript
type ScoreCardProps = { score: number; label?: string }
```
- Número grande (text-6xl) com animação simples de contagem ao montar
- Cor: vermelho (0-59) | amarelo (60-79) | verde (80-100)
- Texto abaixo do número: "Ruim" / "Regular" / "Bom" / "Excelente"

## Componente: BugList
### Props
```typescript
type BugListProps = { bugs: BugHunterOutput["bugs"] }
```
- Lista agrupada por arquivo
- Cada bug com ícone de severidade e descrição + sugestão

## Componente: DocPreview
### Props
```typescript
type DocPreviewProps = { readme: string }
```
- Renderiza o markdown do README (pode usar uma lib simples de markdown-to-html
  ou apenas `<pre>` com estilização monoespaçada se preferir simplicidade)
- Botão "Copiar conteúdo" que copia o markdown para a área de transferência

## Componente: LoadingState
### Props
```typescript
type LoadingStateProps = { currentStage: string; currentAgent?: string }
```
- Skeleton animado (pulse do Tailwind)
- Barra de progresso visual
- Mensagem dinâmica: ex. "Security Auditor analisando vulnerabilidades..."

## Critérios de aceitação
- DADO um overallScore de 45
  QUANDO o ScoreCard renderiza
  ENTÃO deve exibir o número em vermelho com o texto "Ruim"

- DADO o relatório completo carregado
  QUANDO o Dashboard renderiza
  ENTÃO todas as 6 seções devem estar presentes na ordem especificada

- DADO o clique no botão "Copiar conteúdo" do DocPreview
  QUANDO o clique ocorre
  ENTÃO o conteúdo do README deve ser copiado para a área de transferência
