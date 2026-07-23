# SPEC — VALIDAÇÃO DE GROQ_API_KEY

## Responsabilidade
Adicionar validação em tempo real da chave de API Groq no modal de configurações,
permitindo ao usuário verificar se a chave é válida antes de salvá-la.

## Componentes Envolvidos
- Backend: Novo endpoint `POST /api/validate-groq-key`
- Frontend: Atualização do `SettingsModal.tsx`

## Tarefas
1. Criar endpoint `POST /api/validate-groq-key` no backend
2. Adicionar validação no frontend com feedback visual

## Endpoint: POST /api/validate-groq-key

### Request
```json
{
  "groqApiKey": "gsk_..."
}
```

### Response (sucesso)
```json
{
  "valid": true,
  "message": "Chave válida",
  "model": "llama-3.1-8b-instant"
}
```

### Response (erro)
```json
{
  "valid": false,
  "message": "Chave inválida ou expirada"
}
```

### Validação
1. Enviar uma requisição leve para a API Groq (listar modelos ou completar uma frase curta)
2. Se retornar 200 → chave válida
3. Se retornar 401/403 → chave inválida
4. Se retornar erro de rede → informar ao usuário

## Critérios de Aceitação
- DADO um modal de configurações aberto
  QUANDO o usuário digita uma chave Groq
  ENTÃO deve aparecer um botão "Validar Chave"

- DADO o botão "Validar Chave" clicado
  QUANDO a chave é válida
  ENTÃO exibir ✓ "Chave válida" em verde

- DADO o botão "Validar Chave" clicado
  QUANDO a chave é inválida
  ENTÃO exibir ✗ "Chave inválida ou expirada" em vermelho

- DADO uma validação em andamento
  QUANDO aguardando resposta
  ENTÃO exibir indicador de carregamento
