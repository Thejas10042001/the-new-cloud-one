import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite Database
const db = new Database("spikedai.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    timestamp INTEGER,
    transcript TEXT,
    result TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // History API Routes
  app.get("/api/history", (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM history ORDER BY timestamp DESC");
      const rows = stmt.all();
      const history = rows.map((row: any) => ({
        ...row,
        result: JSON.parse(row.result)
      }));
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  app.post("/api/history", (req, res) => {
    try {
      const { id, timestamp, transcript, result } = req.body;
      const stmt = db.prepare("INSERT OR REPLACE INTO history (id, timestamp, transcript, result) VALUES (?, ?, ?, ?)");
      stmt.run(id, timestamp, transcript, JSON.stringify(result));
      res.json({ success: true });
    } catch (error) {
      console.error("DB Error:", error);
      res.status(500).json({ error: "Failed to save history" });
    }
  });

  app.delete("/api/history/:id", (req, res) => {
    try {
      const { id } = req.params;
      const stmt = db.prepare("DELETE FROM history WHERE id = ?");
      stmt.run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete history item" });
    }
  });

  // Recall.ai API Proxy Routes
  const RECALL_API_KEY = process.env.RECALL_AI_API_KEY;
  const RECALL_BASE_URL = "https://api.recall.ai/api/v1";

  app.post("/api/recall/bot", async (req, res) => {
    try {
      const { meeting_url, bot_name } = req.body;
      if (!RECALL_API_KEY) {
        return res.status(500).json({ error: "RECALL_AI_API_KEY not configured" });
      }

      const response = await fetch(`${RECALL_BASE_URL}/bot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${RECALL_API_KEY}`,
        },
        body: JSON.stringify({
          meeting_url,
          bot_name: bot_name || "Spiked AI Architect",
          transcription_options: {
            provider: "assemblyai",
          },
        }),
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error("Recall API Error:", error);
      res.status(500).json({ error: "Failed to create Recall bot" });
    }
  });

  app.get("/api/recall/bot/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await fetch(`${RECALL_BASE_URL}/bot/${id}`, {
        headers: {
          Authorization: `Token ${RECALL_API_KEY}`,
        },
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bot status" });
    }
  });

  app.get("/api/recall/bot/:id/transcript", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await fetch(`${RECALL_BASE_URL}/bot/${id}/transcript`, {
        headers: {
          Authorization: `Token ${RECALL_API_KEY}`,
        },
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transcript" });
    }
  });

  // Real-Time Transcript SSE Endpoint
  app.get("/api/transcripts/:botId", (req, res) => {
    const { botId } = req.params;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    console.log(`SSE Client connected for bot: ${botId}`);

    // Mock transcript generation for demonstration
    // In a real app, this would be triggered by Recall.ai webhooks
    let segmentId = 1;
    const speakers = ["Architect", "CTO", "VP Ops", "Security Lead"];
    const phrases = [
      "We need to consider the latency requirements for the new API.",
      "The current database is struggling with the analytical load.",
      "Security is our top priority for this modernization.",
      "What is the estimated timeline for the pilot phase?",
      "We should look into AWS Lambda for the processing layer.",
      "The budget for OpEx is strictly capped at $20k.",
      "How are we handling data residency for GDPR compliance?",
      "The legacy system has too much technical debt.",
      "We need a robust CI/CD pipeline for the new microservices.",
      "Zero Trust architecture is the way forward."
    ];

    const interval = setInterval(() => {
      const segment = {
        id: segmentId++,
        speaker: speakers[Math.floor(Math.random() * speakers.length)],
        text: phrases[Math.floor(Math.random() * phrases.length)],
        start: segmentId * 5,
        end: segmentId * 5 + 4,
        language: "en",
        created_at: new Date().toISOString()
      };

      res.write(`data: ${JSON.stringify(segment)}\n\n`);

      // Reset simulation
      if (segmentId > 50) segmentId = 1;
    }, 3000);

    req.on("close", () => {
      clearInterval(interval);
      console.log(`SSE Client disconnected for bot: ${botId}`);
      res.end();
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
