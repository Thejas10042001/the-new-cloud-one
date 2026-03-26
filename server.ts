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
const db = new Database("history.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    timestamp INTEGER,
    transcript TEXT,
    result TEXT
  );
  CREATE TABLE IF NOT EXISTS transcripts (
    bot_id TEXT PRIMARY KEY,
    transcript TEXT
  );
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

  // Recall.ai API Routes
  app.post("/api/recall/join", async (req, res) => {
    try {
      const { meeting_url, bot_name } = req.body;
      const apiKey = process.env.RECALL_AI_API_KEY;
      const region = process.env.RECALL_AI_REGION || "us-west-2";

      if (!apiKey) {
        return res.status(500).json({ error: "Recall.ai API Key not configured. Please set RECALL_AI_API_KEY in your environment variables." });
      }

      console.log(`Attempting to join meeting with Recall.ai bot. Region: ${region}`);

      const response = await fetch(`https://${region}.recall.ai/api/v1/bot/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${apiKey}`,
        },
        body: JSON.stringify({
          meeting_url,
          bot_name: bot_name || "Meeting Bot",
          webhook_url: process.env.WEBHOOK_SERVER_URL || `${process.env.APP_URL}/webhook/recall/transcript`
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error("Failed to parse Recall.ai response:", text);
        throw new Error(`Invalid response from Recall.ai (Status ${response.status}): ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        console.error("Recall.ai API Error:", {
          status: response.status,
          statusText: response.statusText,
          data
        });
        throw new Error(data.error || data.message || `Recall.ai API returned ${response.status}: ${response.statusText}`);
      }

      res.json(data);
    } catch (error: any) {
      console.error("Recall.ai Join Error:", error);
      res.status(500).json({ error: error.message || "Failed to join meeting" });
    }
  });

  app.get("/api/recall/bot/:botId", async (req, res) => {
    try {
      const { botId } = req.params;
      
      // First check our local database for transcripts received via webhook
      const stmt = db.prepare("SELECT transcript FROM transcripts WHERE bot_id = ?");
      const row = stmt.get(botId) as { transcript: string } | undefined;
      
      if (row) {
        return res.json({ transcript: JSON.parse(row.transcript), status: 'recording' });
      }

      // If not in DB, try to fetch from Recall.ai directly
      const apiKey = process.env.RECALL_AI_API_KEY;
      const region = process.env.RECALL_AI_REGION || "us-west-2";

      if (!apiKey) {
        return res.status(500).json({ error: "Recall.ai API Key not configured." });
      }

      // Fetch bot details for status
      const botResponse = await fetch(`https://${region}.recall.ai/api/v1/bot/${botId}/`, {
        method: "GET",
        headers: {
          "Authorization": `Token ${apiKey}`,
        },
      });
      
      if (!botResponse.ok) {
        const text = await botResponse.text();
        throw new Error(`Recall.ai API returned ${botResponse.status}: ${text.substring(0, 100)}`);
      }
      const botData = await botResponse.json();

      // Fetch transcript
      const transcriptResponse = await fetch(`https://${region}.recall.ai/api/v1/bot/${botId}/transcript/`, {
        method: "GET",
        headers: {
          "Authorization": `Token ${apiKey}`,
        },
      });
      
      let transcriptData = [];
      if (transcriptResponse.ok) {
        transcriptData = await transcriptResponse.json();
      }

      res.json({ 
        transcript: transcriptData, 
        status: botData.status_code || botData.status?.code || 'recording' 
      });
    } catch (error: any) {
      console.error("Recall.ai Fetch Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch bot details" });
    }
  });

  // Webhook handler for Recall.ai
  app.post("/webhook/recall/transcript", (req, res) => {
    try {
      console.log("Webhook received:", JSON.stringify(req.body, null, 2));
      const { event, data } = req.body;
      
      // Support all Recall.ai webhook event name variants
      const isTranscriptEvent = [
        'bot.transcript',
        'bot.transcription_completed',
        'bot.transcription.data',
        'bot.transcription.done',
        'transcript',
      ].includes(event);

      if (isTranscriptEvent) {
        const botId = data?.bot_id || data?.data?.bot_id;
        // Recall.ai v2 sends segments under data.data.transcript or data.transcript
        const rawTranscript = data?.transcript ?? data?.data?.transcript ?? null;
        const newTranscript = rawTranscript;
        
        if (botId && newTranscript) {
          // Fetch existing transcript
          const stmtSelect = db.prepare("SELECT transcript FROM transcripts WHERE bot_id = ?");
          const row = stmtSelect.get(botId) as { transcript: string } | undefined;
          
          let transcriptList = [];
          if (row) {
            try {
              transcriptList = JSON.parse(row.transcript);
              if (!Array.isArray(transcriptList)) {
                transcriptList = [transcriptList];
              }
            } catch (e) {
              transcriptList = [];
            }
          }
          
          // Normalize segments: Recall.ai v2 uses { speaker, words: [{text,start_time,end_time}] }
          // Flatten to { speaker, text, start_time } for our frontend
          const normalize = (seg: any) => {
            if (typeof seg === 'string') return { speaker: 'Unknown', text: seg, start_time: null };
            if (seg.words && Array.isArray(seg.words)) {
              return {
                speaker: seg.speaker || 'Unknown',
                text: seg.words.map((w: any) => w.text || w.word || '').join(' ').trim(),
                start_time: seg.words[0]?.start_time ?? seg.start_time ?? null,
              };
            }
            return { speaker: seg.speaker || 'Unknown', text: seg.text || '', start_time: seg.start_time || null };
          };

          // Append new transcript (if it's an array, append all, otherwise append single)
          if (Array.isArray(newTranscript)) {
            transcriptList = [...transcriptList, ...newTranscript.map(normalize)];
          } else {
            transcriptList.push(normalize(newTranscript));
          }
          
          // Store updated transcript
          const stmtUpdate = db.prepare("INSERT OR REPLACE INTO transcripts (bot_id, transcript) VALUES (?, ?)");
          stmtUpdate.run(botId, JSON.stringify(transcriptList));
          console.log(`Updated transcript for bot ${botId} (Total segments: ${transcriptList.length})`);
        }
      }
      
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).send("Error");
    }
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