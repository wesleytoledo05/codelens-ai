import { Router } from "express";
import { z } from "zod";

const router = Router();

const RequestSchema = z.object({
  groqApiKey: z.string().min(1, "Chave é obrigatória"),
});

router.post("/validate-groq-key", async (req, res) => {
  const parsed = RequestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      valid: false,
      message: "Dados inválidos",
    });
    return;
  }

  const { groqApiKey } = parsed.data;

  try {
    // Valida a chave fazendo uma requisição leve para a API Groq
    // Usamos o endpoint de modelos que é rápido e não consome tokens
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      // Chave válida - tenta obter o modelo padrão
      const data = (await response.json()) as { data?: { id: string }[] };
      const models = data.data?.map((m: { id: string }) => m.id) || [];
      const defaultModel = models.find((m: string) => m.includes("llama")) || models[0] || "unknown";

      res.json({
        valid: true,
        message: "Chave válida",
        model: defaultModel,
      });
    } else if (response.status === 401 || response.status === 403) {
      res.json({
        valid: false,
        message: "Chave inválida ou expirada",
      });
    } else {
      // Outro erro (rate limit, etc)
      res.json({
        valid: false,
        message: `Erro ao validar: HTTP ${response.status}`,
      });
    }
  } catch (error) {
    res.json({
      valid: false,
      message: "Erro de conexão. Verifique sua internet.",
    });
  }
});

export default router;
