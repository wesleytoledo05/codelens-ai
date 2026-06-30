---
name: criar-componente-react
description: Use esta skill sempre que precisar criar um componente do frontend do CodeLens AI (RepoInput, Dashboard, SecurityPanel, ScoreCard, BugList, DocPreview, LoadingState). Define o padrão visual, estrutura de props e estilo Tailwind a ser seguido.
---

# Skill: Criar Componente React

## Quando usar
Sempre que a tarefa for implementar um arquivo dentro de `frontend/src/components/`.

## Passo a passo obrigatório

1. **Leia a spec correspondente** em `specs/frontend/<nome-do-componente>.spec.md`
   antes de implementar. A spec define: props, estados visuais, comportamento e
   critérios de aceitação.

2. **Padrão de estrutura do componente:**
```tsx
import { type FC } from "react";
// imports de ícones (lucide-react), tipos, etc.

type NomeDoComponenteProps = {
  // props conforme definido na spec
};

export const NomeDoComponente: FC<NomeDoComponenteProps> = ({ ...props }) => {
  return (
    // JSX com Tailwind
  );
};
```

3. **Regras visuais do projeto (NUNCA fugir disso):**
   - Cor principal: indigo-600 (botões, destaques, elementos ativos)
   - Severidade CRÍTICA: bg-red-100 text-red-800 border-red-200
   - Severidade ALTA: bg-orange-100 text-orange-800 border-orange-200
   - Severidade MÉDIA: bg-yellow-100 text-yellow-800 border-yellow-200
   - Severidade BAIXA: bg-green-100 text-green-800 border-green-200
   - Score 0-59: vermelho | 60-79: amarelo | 80-100: verde
   - Cantos arredondados: rounded-lg ou rounded-xl
   - Sombras suaves: shadow-sm ou shadow-md, nunca shadow-2xl
   - Ícones: sempre da biblioteca lucide-react
   - Espaçamento generoso: prefira p-6, gap-4, space-y-4

4. **Responsividade obrigatória:**
   Todo componente deve funcionar em mobile (largura mínima 360px) e desktop.
   Use classes responsivas do Tailwind (sm:, md:, lg:).

5. **Estados de loading/vazio:**
   Se o componente exibe dados que podem demorar ou vir vazios, sempre tratar
   esses estados explicitamente (nunca deixar tela branca ou quebrada).

6. **Validação contra a spec:**
   Ao terminar, confirme que todos os Critérios de Aceitação da spec foram
   atendidos. Liste isso explicitamente no final.

## Padrões de nomenclatura
- Arquivo: `frontend/src/components/NomeDoComponente.tsx` (PascalCase)
- Export: nomeado (named export), nunca default export
