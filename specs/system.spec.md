# SPEC DO SISTEMA — CODELENS AI

## 1. OBJETIVO DO SISTEMA
Plataforma web onde o usuário cola a URL de um repositório público do GitHub e
recebe, em até 60 segundos, um dashboard completo de análise de código gerado
por um time de 7 agentes de IA especializados.

**Problema que resolve:** desenvolvedores não têm tempo de fazer code review
manual completo (qualidade + bugs + segurança + documentação + arquitetura) em
cada repositório que avaliam ou mantêm.

**Usuário-alvo:** desenvolvedores, tech leads e recrutadores técnicos avaliando
repositórios.

## 2. FLUXO PRINCIPAL (happy path)
1. Usuário acessa a plataforma (tela RepoInput)
2. Cola a URL de um repositório GitHub público
3. Sistema valida o formato da URL
4. Orchestrator busca os arquivos relevantes via Octokit
5. 5 agentes rodam em paralelo: Code Analyzer, Bug Hunter, Security Auditor,
   Doc Writer, Architect
6. Reporter consolida os resultados de todos os agentes
7. Dashboard exibe o relatório completo com todos os painéis

## 3. REQUISITOS FUNCIONAIS

| ID | Requisito |
|----|-----------|
| RF-001 | O sistema deve aceitar apenas URLs no formato `https://github.com/{owner}/{repo}` |
| RF-002 | O sistema deve rejeitar URLs de repositórios privados com mensagem clara |
| RF-003 | O sistema deve buscar todos os arquivos de código-fonte relevantes do repositório |
| RF-004 | O sistema deve ignorar pastas: node_modules, .git, dist, build |
| RF-005 | O sistema deve ignorar arquivos binários (imagens, vídeos, PDFs) |
| RF-006 | O sistema deve limitar a análise a no máximo 300 arquivos por repositório |
| RF-007 | O Code Analyzer deve retornar um score de qualidade de 0 a 100 |
| RF-008 | O Bug Hunter deve retornar lista de bugs com severidade e localização |
| RF-009 | O Security Auditor deve categorizar vulnerabilidades por severidade (CRITICAL/HIGH/MEDIUM/LOW) |
| RF-010 | O Security Auditor deve identificar a categoria OWASP de cada vulnerabilidade |
| RF-011 | O Doc Writer deve gerar um README.md completo em markdown |
| RF-012 | O Architect deve mapear a estrutura de pastas e dependências entre módulos |
| RF-013 | O Reporter deve consolidar todos os resultados em um único JSON |
| RF-014 | O sistema deve mostrar progresso em tempo real durante a análise |
| RF-015 | O sistema deve exibir mensagem de erro clara em caso de falha |
| RF-016 | O Dashboard deve ser totalmente responsivo (mobile e desktop) |
| RF-017 | O sistema deve permitir analisar um novo repositório sem recarregar a página |
| RF-018 | O SecurityPanel deve exibir vulnerabilidades agrupadas por severidade |
| RF-019 | O sistema deve ter timeout de 60 segundos por análise completa |
| RF-020 | O sistema deve funcionar sem necessidade de login do usuário |

## 4. REQUISITOS NÃO FUNCIONAIS
- **Performance:** análise completa deve terminar em até 60 segundos
- **Segurança:** chaves de API (Anthropic, GitHub) nunca expostas no frontend
- **Escalabilidade:** suportar repositórios de até 300 arquivos relevantes
- **Usabilidade:** interface utilizável sem nenhuma explicação prévia

## 5. CRITÉRIOS DE ACEITAÇÃO GERAIS
- DADO uma URL válida de repositório público
  QUANDO o usuário submete a análise
  ENTÃO o sistema deve retornar um dashboard completo em até 60 segundos

- DADO uma URL de repositório privado ou inexistente
  QUANDO o usuário submete a análise
  ENTÃO o sistema deve exibir mensagem de erro clara sem quebrar a aplicação

- DADO um repositório com vulnerabilidades de segurança conhecidas
  QUANDO a análise é executada
  ENTÃO o Security Auditor deve detectar e categorizar essas vulnerabilidades corretamente

## 6. FORA DE ESCOPO (não construir nesta versão)
- Autenticação de usuários
- Histórico de análises anteriores
- Comparação entre múltiplos repositórios
- Suporte a repositórios privados
- Análise de Pull Requests específicos
- Webhooks ou integração contínua (CI)
