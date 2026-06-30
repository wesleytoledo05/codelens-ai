# SPEC — COMPONENTE RepoInput

## Responsabilidade
Tela inicial onde o usuário cola a URL do repositório GitHub a ser analisado.

## Props
```typescript
type RepoInputProps = {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}
```

## Comportamento obrigatório
1. Campo de texto grande, centralizado, com placeholder
   `https://github.com/usuario/repositorio`
2. Validação visual em tempo real: borda vermelha se a URL não seguir o
   padrão `https://github.com/{owner}/{repo}`
3. Botão "Analisar" com ícone de lupa (lucide-react `Search`), desabilitado
   enquanto `isLoading === true` ou enquanto a URL for inválida
4. Três botões de exemplo clicáveis com repositórios públicos conhecidos
   (ex: facebook/react, expressjs/express, vuejs/core) que preenchem o campo
   automaticamente ao clicar
5. Ao submeter (Enter ou clique no botão), chamar `onSubmit(url)`

## Visual
- Container centralizado vertical e horizontalmente
- Título grande: "Analise qualquer repositório GitHub com IA"
- Campo de input com `rounded-xl`, `border-2`, padding generoso
- Botão principal: `bg-indigo-600 hover:bg-indigo-700 text-white`

## Critérios de aceitação
- DADO uma URL inválida digitada
  QUANDO o usuário tenta submeter
  ENTÃO o botão deve permanecer desabilitado e a borda do input vermelha

- DADO o clique em um dos botões de exemplo
  QUANDO o clique ocorre
  ENTÃO o campo de input deve ser preenchido automaticamente com aquela URL
