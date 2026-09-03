import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Request Logging Middleware for API endpoints
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    });
  }
  next();
});

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI API Proxy
app.post("/api/chat/openai", async (req, res, next) => {
  try {
    const { messages, model = "gpt-4o" } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      console.error("[OpenAI] Missing API Key");
      return res.status(500).json({ 
        error: "OPENAI_API_KEY is not configured.",
        code: "MISSING_API_KEY"
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: "Invalid messages format.",
        code: "INVALID_INPUT"
      });
    }

    console.log(`[OpenAI] Starting stream for model: ${model}`);

    const stream = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
    console.log("[OpenAI] Stream completed successfully");
  } catch (error: any) {
    const status = error.status || error.statusCode || 500;
    const isRateLimitOrBilling = status === 429 || (error.message && (error.message.includes("429") || error.message.includes("billing") || error.message.includes("not active")));

    if (isRateLimitOrBilling) {
      console.warn(`[OpenAI] RateLimit or inactive account (429): ${error.message}`);
      return res.status(429).json({
        error: "Konto OpenAI jest nieaktywne lub przekroczyło limit zapytań (429).",
        details: error.message,
        code: "OPENAI_RATE_LIMIT"
      });
    }

    console.error("[OpenAI] Error:", error);
    next(error);
  }
});

// Endpoint pobierania dokumentacji technologicznej PDF
app.get(["/api/documentation/pdf", "/dokumentacja_technologiczna_adipoz.pdf"], (req, res) => {
  const pdfPath = path.join(process.cwd(), "public", "dokumentacja_technologiczna_adipoz.pdf");
  if (fs.existsSync(pdfPath)) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="dokumentacja_technologiczna_adipoz.pdf"');
    res.sendFile(pdfPath);
  } else {
    res.status(404).json({ error: "Dokumentacja PDF nie została odnaleziona." });
  }
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  res.status(statusCode).json({
    error: message,
    code: err.code || "INTERNAL_ERROR",
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
