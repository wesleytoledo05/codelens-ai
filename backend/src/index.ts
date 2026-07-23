import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import analyzeRouter from "./routes/analyze";
import validateGroqKeyRouter from "./routes/validate-groq-key";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(healthRouter);
app.use(analyzeRouter);
app.use(validateGroqKeyRouter);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

export default app;
