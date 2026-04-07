import express, { Request, Response } from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import crypto from "crypto";
import { AccessToken } from "livekit-server-sdk";

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
  CREATE TABLE IF NOT EXISTS webhook_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER,
    event TEXT,
    bot_id TEXT,
    payload TEXT
  );
`);

async function startServer() {
  // --- EXTERNAL BACKEND SYNC ---
const EXTERNAL_BACKEND_URL = "https://hot-mic-backend-409019309412.us-central1.run.app";

async function syncToExternalBackend(botId: string, rawTranscript: any) {
  if (rawTranscript.is_partial) return;

  try {
    const speaker = rawTranscript.speaker || rawTranscript.participant?.name || "Unknown";
    let text = "";
    if (rawTranscript.words && Array.isArray(rawTranscript.words)) {
      text = rawTranscript.words.map((w: any) => w.text || w.word || "").join(" ").trim();
    } else {
      text = rawTranscript.text || "";
    }

    if (!text) return;

    const payload = {
      data: {
        bot: { id: botId },
        data: {
          words: [{ text: text }],
          participant: { name: speaker }
        }
      }
    };

    // Note: We don't have the 'pendingToken' from the Electron snippet here, 
    // but we can send it if we had it. For now, we'll send without auth or use a generic one if needed.
    await fetch(`${EXTERNAL_BACKEND_URL}/webhook/recall/transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error("[External Sync] Error:", e);
  }
}

const app = express();
  app.use(cors());
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // ─── Logging middleware ───────────────────────────────────────────────────
  app.use((req, res, next) => {
    if (req.path !== "/api/debug/webhooks") { // Don't log the debug log fetch itself
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
  });

  // ─── WebSocket clients (for legacy WS support) ───────────────────────────
  const clients = new Map<string, Set<WebSocket>>();

  // ─── SSE clients ──────────────────────────────────────────────────────────
  // Map of botId → Set of SSE response objects
  const sseClients = new Map<string, Set<Response>>();

  wss.on("connection", (ws) => {
    let currentBotId: string | null = null;

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "subscribe" && data.botId) {
          currentBotId = data.botId;
          if (!clients.has(currentBotId)) {
            clients.set(currentBotId, new Set());
          }
          clients.get(currentBotId)!.add(ws);
          console.log(`[WS] Client subscribed to bot: ${currentBotId}`);
        }
      } catch (e) {
        console.error("[WS] Error parsing message:", e);
      }
    });

    ws.on("close", () => {
      if (currentBotId && clients.has(currentBotId)) {
        clients.get(currentBotId)!.delete(ws);
        if (clients.get(currentBotId)!.size === 0) {
          clients.delete(currentBotId);
        }
      }
    });
  });

  // ─── Broadcast to both WebSocket and SSE clients ─────────────────────────
  const broadcastTranscript = (botId: string, transcript: any) => {
    // WebSocket broadcast
    if (clients.has(botId)) {
      const payload = JSON.stringify({ type: "transcript", transcript });
      clients.get(botId)!.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }

    // SSE broadcast
    if (sseClients.has(botId)) {
      const normalize = (seg: any) => {
        if (typeof seg === "string")
          return { speaker: "Unknown", text: seg, start_time: null, is_partial: false };
        const speaker = seg.speaker || seg.participant?.name || "Unknown";
        let text = "";
        let startTime = seg.start_time || seg.words?.[0]?.start_timestamp?.relative || null;
        if (seg.words && Array.isArray(seg.words)) {
          text = seg.words.map((w: any) => w.text || w.word || "").join(" ").trim();
          if (startTime === null && seg.words[0]) {
            startTime = seg.words[0].start_time ?? seg.words[0].start_timestamp?.relative ?? null;
          }
        } else {
          text = seg.text || "";
        }
        return { speaker, text, start_time: startTime, is_partial: seg.is_partial || false };
      };

      const segments = Array.isArray(transcript)
        ? transcript.map(normalize)
        : [normalize(transcript)];

      const deadClients = new Set<Response>();
      sseClients.get(botId)!.forEach((res) => {
        try {
          segments.forEach((seg, i) => {
            (res as any).write(
              `event: transcript\ndata: ${JSON.stringify({ ...seg, id: Date.now() + i })}\n\n`
            );
          });
        } catch (e) {
          deadClients.add(res);
        }
      });
      // Clean up dead SSE connections
      deadClients.forEach((r) => sseClients.get(botId)!.delete(r));
    }
  };

  // ─── Webhook signature verification helper ───────────────────────────────
  // Recall.ai signs webhooks with HMAC-SHA256 using the whsec_ key.
  // The secret is base64-encoded after stripping the "whsec_" prefix.
  const verifyWebhookSignature = (
    rawBody: Buffer,
    signatureHeader: string | undefined,
    secret: string
  ): boolean => {
    if (!signatureHeader || !secret) return true; // skip if not configured
    try {
      // Strip "whsec_" prefix and base64-decode
      const keyBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
      const hmac = crypto.createHmac("sha256", keyBytes);
      hmac.update(rawBody);
      const computed = hmac.digest("hex");
      // Recall.ai sends: "v1=<hex>"
      const parts = signatureHeader.split(",");
      return parts.some((part) => {
        const [, sig] = part.split("=");
        return sig && crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sig));
      });
    } catch (e) {
      console.error("[Webhook] Signature verification error:", e);
      return false;
    }
  };

  // ─── Parse JSON but keep raw body for webhook signature verification ─────
  // We need the raw body ONLY for the webhook route. All other routes use normal JSON.
  app.use((req, res, next) => {
    if (req.path === "/webhook/recall/transcript") {
      let data = Buffer.alloc(0);
      req.on("data", (chunk) => {
        data = Buffer.concat([data, chunk]);
      });
      req.on("end", () => {
        (req as any).rawBody = data;
        try {
          (req as any).body = JSON.parse(data.toString());
        } catch {
          (req as any).body = {};
        }
        next();
      });
    } else {
      express.json({ limit: "50mb" })(req, res, next);
    }
  });

  // ─── History API Routes ───────────────────────────────────────────────────
  app.get("/api/history", (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM history ORDER BY timestamp DESC");
      const rows = stmt.all();
      const history = rows.map((row: any) => ({
        ...row,
        result: JSON.parse(row.result),
      }));
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  app.post("/api/history", (req, res) => {
    try {
      const { id, timestamp, transcript, result } = req.body;
      const stmt = db.prepare(
        "INSERT OR REPLACE INTO history (id, timestamp, transcript, result) VALUES (?, ?, ?, ?)"
      );
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

  // ─── Recall.ai API Routes ─────────────────────────────────────────────────
  app.post("/api/recall/join", async (req, res) => {
    try {
      const { meeting_url, bot_name } = req.body;
      const apiKey = process.env.RECALL_AI_API_KEY;
      const region = process.env.RECALL_AI_REGION || "us-west-2";
      const appUrl = process.env.APP_URL || "";

      if (!apiKey) {
        return res
          .status(500)
          .json({
            error:
              "Recall.ai API Key not configured. Please set RECALL_AI_API_KEY in your environment variables.",
          });
      }

      // Always derive webhook URL from APP_URL so it's always reachable
      let webhookUrl = process.env.WEBHOOK_SERVER_URL;
      if (!webhookUrl && appUrl) {
        webhookUrl = `${appUrl.replace(/\/$/, "")}/webhook/recall/transcript`;
      }

      console.log(`[Join] region=${region} webhook=${webhookUrl}`);

      if (!webhookUrl || !webhookUrl.startsWith("http")) {
        console.error("[Join] ERROR: Webhook URL is not absolute or missing. Recall.ai will reject this with a 400 error.");
        return res.status(400).json({ error: "Application APP_URL is not configured. Webhook URL must be absolute." });
      }

      const response = await fetch(`https://${region}.recall.ai/api/v1/bot/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${apiKey}`,
        },
        body: JSON.stringify({
          meeting_url,
          bot_name: bot_name || "Meeting Bot",
          is_recording: true, // Explicitly enable recording
          recording_config: {
            transcript: {
              provider: {
                recallai_streaming: {
                  mode: "prioritize_low_latency",
                  language_code: "en",
                },
              },
              diarization: {
                use_separate_streams_when_available: true,
              },
            },
            realtime_endpoints: [
              {
                type: "webhook",
                url: webhookUrl,
                events: [
                  "transcript.data",
                  "transcript.partial_data",
                  "participant_events.join",
                  "participant_events.update",
                  "participant_events.speech_on",
                  "participant_events.speech_off"
                ],
              },
            ],
          },
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error("Failed to parse Recall.ai response:", text);
        throw new Error(
          `Invalid response from Recall.ai (Status ${response.status}): ${text.substring(0, 100)}`
        );
      }

      if (!response.ok) {
        console.error("Recall.ai API Error Details:", JSON.stringify(data, null, 2));
        throw new Error(
          data.error ||
            data.message ||
            JSON.stringify(data) ||
            `Recall.ai API returned ${response.status}: ${response.statusText}`
        );
      }

      // Register session with external backend (from Electron snippet)
      if (data.id) {
        try {
          console.log(`[External Sync] Registering session ${data.id}...`);
          await fetch(`${EXTERNAL_BACKEND_URL}/desktop/register-session`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer manual_test_token`, // Using placeholder as in snippet
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
              recording_id: String(data.id),
              meeting_url: "https://meet.google.com/hot-mic-mode", // Using placeholder as in snippet
              platform: "Web"
            })
          });
        } catch (e) {
          console.error("[External Sync] Register Error (Ignored):", e);
        }
      }

      res.json(data);
    } catch (error: any) {
      console.error("Recall.ai Join Error:", error);
      res.status(500).json({ error: error.message || "Failed to join meeting" });
    }
  });

  app.post("/api/recall/sdk-upload", async (req, res) => {
    console.log(`[Server] Handling SDK upload request...`);
    try {
      const apiKey = process.env.RECALL_AI_API_KEY;
      const region = process.env.RECALL_AI_REGION || "us-west-2";
      const appUrl = process.env.APP_URL || "";

      if (!apiKey) {
        console.warn("[Server] Recall.ai API Key not configured.");
        return res.status(500).json({ error: "Recall.ai API Key not configured." });
      }

      console.log(`[Server] Requesting SDK upload from Recall.ai (${region})...`);

      // Ensure webhook is included in recording_config for live transcripts
      const body = req.body || {};
      if (!body.recording_config) body.recording_config = {};
      if (!body.recording_config.realtime_endpoints) body.recording_config.realtime_endpoints = [];

      let webhookUrl = process.env.WEBHOOK_SERVER_URL;
      if (!webhookUrl && appUrl) {
        webhookUrl = `${appUrl.replace(/\/$/, "")}/webhook/recall/transcript`;
      }

      // Add webhook if not already present
      const hasWebhook = body.recording_config.realtime_endpoints.some((e: any) => e.type === "webhook");
      if (!hasWebhook && webhookUrl && webhookUrl.startsWith("http")) {
        body.recording_config.realtime_endpoints.push({
          type: "webhook",
          url: webhookUrl,
          events: [
            "transcript.data",
            "transcript.partial_data",
            "participant_events.join",
            "participant_events.update",
            "participant_events.speech_on",
            "participant_events.speech_off"
          ],
        });
      }

      const response = await fetch(`https://${region}.recall.ai/api/v1/sdk_upload/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[Server] Recall.ai SDK Upload API Error (${response.status}):`, text);
        throw new Error(`Recall.ai API returned ${response.status}: ${text.substring(0, 100)}`);
      }
      const data = await response.json();
      console.log(`[Server] SDK upload created successfully: ${data.id}`);
      res.json(data);
    } catch (error: any) {
      console.error("Recall.ai SDK Upload Error:", error);
      res.status(500).json({ error: error.message || "Failed to create SDK upload" });
    }
  });

  app.get("/api/recall/bot/:botId", async (req, res) => {
    try {
      const { botId } = req.params;
      const force = req.query.force === "true";
      console.log(`[API] Fetching transcript for ID: ${botId} (force: ${force})`);

      if (!force) {
        const stmt = db.prepare("SELECT transcript FROM transcripts WHERE bot_id = ?");
        const row = stmt.get(botId) as { transcript: string } | undefined;
        if (row) {
          const transcript = JSON.parse(row.transcript);
          console.log(`[API] Found ${transcript.length} segments in local DB for ID: ${botId}`);
          return res.json({ transcript, status: "recording" });
        }
      }

      const apiKey = process.env.RECALL_AI_API_KEY;
      const region = process.env.RECALL_AI_REGION || "us-west-2";

      if (!apiKey) {
        return res.status(500).json({ error: "Recall.ai API Key not configured." });
      }

      let botResponse = await fetch(`https://${region}.recall.ai/api/v1/bot/${botId}/`, {
        headers: { Authorization: `Token ${apiKey}` },
      });

      let isSdkUpload = false;
      if (!botResponse.ok && botResponse.status === 404) {
        botResponse = await fetch(`https://${region}.recall.ai/api/v1/sdk_upload/${botId}/`, {
          headers: { Authorization: `Token ${apiKey}` },
        });
        isSdkUpload = true;
      }

      if (!botResponse.ok) {
        const text = await botResponse.text();
        throw new Error(`Recall.ai API returned ${botResponse.status}: ${text.substring(0, 100)}`);
      }

      const botData = await botResponse.json();
      const endpointPrefix = isSdkUpload ? "sdk_upload" : "bot";

      const transcriptResponse = await fetch(
        `https://${region}.recall.ai/api/v1/${endpointPrefix}/${botId}/transcript/`,
        { headers: { Authorization: `Token ${apiKey}` } }
      );

      let transcriptData = [];
      if (transcriptResponse.ok) {
        transcriptData = await transcriptResponse.json();
      }

      res.json({
        transcript: transcriptData,
        status:
          botData.status_code || botData.status?.code || (isSdkUpload ? "recording" : "recording"),
      });
    } catch (error: any) {
      console.error("Recall.ai Fetch Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch details" });
    }
  });

  // ─── LiveKit API Routes ───────────────────────────────────────────────────
  app.post("/api/livekit/token", async (req, res) => {
    try {
      const { room_name, participant_name } = req.body;
      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;

      if (!apiKey || !apiSecret) {
        return res.status(500).json({ error: "LiveKit credentials not configured." });
      }

      const at = new AccessToken(apiKey, apiSecret, {
        identity: participant_name || "Meeting Bot",
      });

      at.addGrant({
        roomJoin: true,
        room: room_name || "default-room",
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const token = await at.toJwt();
      res.json({ token, url: process.env.LIVEKIT_URL });
    } catch (error: any) {
      console.error("LiveKit Token Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate token" });
    }
  });

  app.post("/api/livekit/join-meeting", async (req, res) => {
    try {
      const { meeting_url, bot_name } = req.body;
      const apiKey = process.env.RECALL_AI_API_KEY;
      const region = process.env.RECALL_AI_REGION || "us-west-2";
      const livekitUrl = process.env.LIVEKIT_URL;
      const livekitApiKey = process.env.LIVEKIT_API_KEY;
      const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

      if (!apiKey) {
        return res.status(500).json({ error: "Recall.ai API Key not configured." });
      }
      if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
        return res.status(500).json({ error: "LiveKit credentials not configured." });
      }

      // Generate a unique room name based on the meeting URL or a random ID
      const roomName = `meeting-${crypto.createHash('md5').update(meeting_url).digest('hex').substring(0, 8)}`;

      // 1. Trigger Recall.ai to join and stream to LiveKit
      const recallRequestBody = {
        meeting_url,
        bot_name: bot_name || "Meeting Bot",
        recording_config: {
          transcript: {
            provider: {
              recallai_streaming: {
                mode: "prioritize_low_latency",
                language_code: "en",
              },
            },
          },
          realtime_endpoints: [
            {
              type: "livekit",
              url: livekitUrl,
              api_key: livekitApiKey,
              api_secret: livekitApiSecret,
              room_name: roomName
            }
          ]
        }
      };

      console.log("[LiveKit Join] Sending request to Recall.ai:", JSON.stringify(recallRequestBody, null, 2));

      const recallResponse = await fetch(`https://${region}.recall.ai/api/v1/bot/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${apiKey}`,
        },
        body: JSON.stringify(recallRequestBody),
      });

      const responseText = await recallResponse.text();
      let botData;
      try {
        botData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error("Failed to parse Recall.ai response:", responseText);
        throw new Error(`Invalid JSON from Recall.ai: ${responseText.substring(0, 100)}`);
      }

      if (!recallResponse.ok) {
        console.error("Recall.ai API Error:", JSON.stringify(botData, null, 2));
        
        // Robust error message extraction
        let errorMessage = "Recall.ai failed to join meeting";
        if (botData.error) errorMessage = botData.error;
        else if (botData.message) errorMessage = botData.message;
        else if (botData.detail) errorMessage = botData.detail;
        else if (typeof botData === 'object') {
          // If it's a field-level error (e.g. { "meeting_url": ["Invalid URL"] })
          const firstKey = Object.keys(botData)[0];
          if (firstKey && Array.isArray(botData[firstKey])) {
            errorMessage = `${firstKey}: ${botData[firstKey][0]}`;
          } else {
            errorMessage = JSON.stringify(botData);
          }
        }
        
        throw new Error(errorMessage);
      }

      // 2. Generate token for the frontend to join the same room
      const at = new AccessToken(livekitApiKey, livekitApiSecret, {
        identity: "Web Client",
      });
      at.addGrant({
        roomJoin: true,
        room: roomName,
        canSubscribe: true,
      });
      const token = await at.toJwt();

      res.json({ 
        token, 
        url: livekitUrl, 
        roomName,
        botId: botData.id 
      });
    } catch (error: any) {
      console.error("LiveKit Join Meeting Error:", error);
      res.status(500).json({ error: error.message || "Failed to join meeting via LiveKit Bot" });
    }
  });

  // ─── SSE: Real-time transcript stream ─────────────────────────────────────
  // This is what transcriptStreamService.ts calls: GET /api/transcripts/:botId
  app.get("/api/transcripts/:botId", (req, res) => {
    const { botId } = req.params;
    console.log(`[SSE] Client connected for bot: ${botId}`);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering on Cloud Run
    res.flushHeaders();

    // Send a connected status event
    res.write(
      `event: status\ndata: ${JSON.stringify({ message: "Connected to transcript stream" })}\n\n`
    );

    // Immediately replay any existing transcript from the DB
    try {
      const stmt = db.prepare("SELECT transcript FROM transcripts WHERE bot_id = ?");
      const row = stmt.get(botId) as { transcript: string } | undefined;
      if (row) {
        const segments = JSON.parse(row.transcript);
        console.log(`[SSE] Replaying ${segments.length} existing segments for bot: ${botId}`);
        segments.forEach((seg: any, i: number) => {
          res.write(
            `event: transcript\ndata: ${JSON.stringify({ ...seg, id: i + 1 })}\n\n`
          );
        });
      }
    } catch (e) {
      console.error("[SSE] Error replaying existing transcript:", e);
    }

    // Register this SSE connection
    if (!sseClients.has(botId)) {
      sseClients.set(botId, new Set());
    }
    sseClients.get(botId)!.add(res as any);

    // Heartbeat to keep connection alive (Cloud Run closes idle connections after 60s)
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 30000);

    // Cleanup on disconnect
    req.on("close", () => {
      clearInterval(heartbeat);
      if (sseClients.has(botId)) {
        sseClients.get(botId)!.delete(res as any);
        if (sseClients.get(botId)!.size === 0) {
          sseClients.delete(botId);
        }
      }
      console.log(`[SSE] Client disconnected for bot: ${botId}`);
    });
  });

  // ─── Debug Routes ─────────────────────────────────────────────────────────
  app.get("/api/debug/webhooks", (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM webhook_logs ORDER BY timestamp DESC LIMIT 20");
      const logs = stmt.all();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch debug logs" });
    }
  });

  app.get("/api/debug/config", (req, res) => {
    res.json({
      APP_URL: process.env.APP_URL || "(not set)",
      WEBHOOK_SERVER_URL: process.env.WEBHOOK_SERVER_URL || "(not set — will use APP_URL)",
      RECALL_AI_REGION: process.env.RECALL_AI_REGION || "us-west-2",
      RECALL_AI_API_KEY: process.env.RECALL_AI_API_KEY ? "✓ set" : "✗ missing",
      RECALL_AI_VERIFICATION_SECRET: process.env.RECALL_AI_VERIFICATION_SECRET ? "✓ set" : "✗ missing",
      effectiveWebhookUrl:
        process.env.WEBHOOK_SERVER_URL ||
        `${process.env.APP_URL || "(APP_URL not set)"}/webhook/recall/transcript`,
    });
  });

  app.post("/api/debug/test-webhook", (req, res) => {
    try {
      const { botId } = req.body;
      const dummyTranscript = {
        words: [
          {
            text: "This is a real-time test transcript segment.",
            start_timestamp: { relative: Date.now() / 1000 },
          },
        ],
        participant: { name: "Test Speaker" },
      };

      try {
        const stmtLog = db.prepare(
          "INSERT INTO webhook_logs (timestamp, event, bot_id, payload) VALUES (?, ?, ?, ?)"
        );
        stmtLog.run(
          Date.now(),
          "transcript.data",
          botId || "test-bot-id",
          JSON.stringify({ event: "transcript.data", data: { bot_id: botId, data: dummyTranscript } })
        );
      } catch (e) {}

      if (botId) {
        broadcastTranscript(botId, dummyTranscript);
      }

      console.log("[Debug] Test webhook triggered and broadcasted for bot:", botId);
      res.json({ success: true, message: "Test webhook triggered and broadcasted." });
    } catch (error) {
      console.error("Failed to trigger test webhook:", error);
      res.status(500).json({ error: "Failed to trigger test webhook" });
    }
  });

  // ─── Webhook handler for Recall.ai ───────────────────────────────────────
  app.post("/webhook/recall/transcript", async (req, res) => {
    try {
      // Verify webhook signature if secret is configured
      const secret = process.env.RECALL_AI_VERIFICATION_SECRET;
      const sigHeader =
        req.headers["recall-signature"] as string ||
        req.headers["x-recall-signature"] as string ||
        req.headers["webhook-signature"] as string;

      if (secret && secret !== "whsec_YZjuwU1uZtzJnIl1uc6e1OiMBH+5xWnONZQQaFAmuT1IrKccAwv3QG4XBo86r+ua") {
        const rawBody = (req as any).rawBody as Buffer;
        const valid = verifyWebhookSignature(rawBody, sigHeader, secret);
        if (!valid) {
          console.warn(`[Webhook] Signature verification FAILED for bot ${botId} — rejecting request`);
          return res.status(401).send("Invalid signature");
        }
        console.log(`[Webhook] Signature verified ✓ for bot ${botId}`);
      } else if (secret) {
        console.log(`[Webhook] Skipping signature verification (placeholder secret detected) for bot ${botId}`);
      }

      const { event, data } = req.body;
      const botId =
        data?.bot_id ||
        data?.data?.bot_id ||
        data?.sdk_upload_id ||
        data?.data?.sdk_upload_id ||
        data?.bot?.id ||
        req.body.data?.bot?.id;

      console.log(`[Webhook] Received event: ${event} for bot: ${botId}`);

      // Log to debug table
      try {
        const stmtLog = db.prepare(
          "INSERT INTO webhook_logs (timestamp, event, bot_id, payload) VALUES (?, ?, ?, ?)"
        );
        stmtLog.run(Date.now(), event, botId || "unknown", JSON.stringify(req.body));
      } catch (e) {
        console.error("Failed to log webhook:", e);
      }

      const isTranscriptEvent = [
        "bot.transcript",
        "bot.transcription_completed",
        "bot.transcription.data",
        "bot.transcription.done",
        "transcript",
        "transcript.done",
        "transcript.data",
        "transcript.partial_data",
      ].includes(event);

      const isParticipantEvent = [
        "participant_events.join",
        "participant_events.update",
        "participant_events.speech_on",
        "participant_events.speech_off"
      ].includes(event);

      if (isTranscriptEvent) {
        let rawTranscript = null;
        const isPartial = event === "transcript.partial_data";

        if (event === "transcript.data" || event === "transcript.partial_data") {
          rawTranscript = data?.data;
          if (rawTranscript) {
            rawTranscript.is_partial = isPartial;
          }
        } else {
          rawTranscript = data?.transcript ?? data?.data?.transcript ?? null;
        }

        // Broadcast immediately so SSE/WS clients get it in real-time
        if (botId && rawTranscript) {
          broadcastTranscript(botId, rawTranscript);
        }

        // transcript.done: fetch full transcript from Recall.ai
        if (event === "transcript.done" && !rawTranscript) {
          console.log(`Transcript done for bot ${botId}, fetching full transcript...`);
          const apiKey = process.env.RECALL_AI_API_KEY;
          const region = process.env.RECALL_AI_REGION || "us-west-2";

          if (apiKey && botId) {
            try {
              const botResponse = await fetch(
                `https://${region}.recall.ai/api/v1/bot/${botId}/`,
                { headers: { Authorization: `Token ${apiKey}` } }
              );

              if (botResponse.ok) {
                const botData = await botResponse.json();
                const downloadUrl = botData.recordings
                  ?.find((r: any) => r.media_shortcuts?.transcript?.data?.download_url)
                  ?.media_shortcuts?.transcript?.data?.download_url;

                if (downloadUrl) {
                  const transcriptResponse = await fetch(downloadUrl, {
                    headers: { Authorization: `Token ${apiKey}` },
                  });

                  if (transcriptResponse.ok) {
                    rawTranscript = await transcriptResponse.json();
                    console.log(
                      `Successfully fetched full transcript for bot ${botId} (${rawTranscript.length} segments)`
                    );

                    const stmtUpdate = db.prepare(
                      "INSERT OR REPLACE INTO transcripts (bot_id, transcript) VALUES (?, ?)"
                    );
                    const normalizedTranscript = rawTranscript.map((seg: any) => {
                      const speaker = seg.speaker || seg.participant?.name || "Unknown";
                      let text = "";
                      let startTime =
                        seg.start_time || seg.words?.[0]?.start_timestamp?.relative || null;
                      if (seg.words && Array.isArray(seg.words)) {
                        text = seg.words.map((w: any) => w.text || w.word || "").join(" ").trim();
                        if (startTime === null && seg.words[0]) {
                          startTime =
                            seg.words[0].start_time ??
                            seg.words[0].start_timestamp?.relative ??
                            null;
                        }
                      } else {
                        text = seg.text || "";
                      }
                      return { speaker, text, start_time: startTime };
                    });

                    stmtUpdate.run(botId, JSON.stringify(normalizedTranscript));
                    return res.status(200).send("OK");
                  }
                }
              }
            } catch (err) {
              console.error(`Failed to fetch full transcript for bot ${botId}:`, err);
            }
          }
        }

        if (botId && rawTranscript) {
          const stmtSelect = db.prepare(
            "SELECT transcript FROM transcripts WHERE bot_id = ?"
          );
          const row = stmtSelect.get(botId) as { transcript: string } | undefined;

          let transcriptList: any[] = [];
          if (row) {
            try {
              transcriptList = JSON.parse(row.transcript);
              if (!Array.isArray(transcriptList)) transcriptList = [transcriptList];
            } catch {
              transcriptList = [];
            }
          }

          const normalize = (seg: any) => {
            if (typeof seg === "string")
              return { speaker: "Unknown", text: seg, start_time: null, is_partial: false };
            const speaker = seg.speaker || seg.participant?.name || "Unknown";
            let text = "";
            let startTime = seg.start_time || seg.words?.[0]?.start_timestamp?.relative || null;
            if (seg.words && Array.isArray(seg.words)) {
              text = seg.words.map((w: any) => w.text || w.word || "").join(" ").trim();
              if (startTime === null && seg.words[0]) {
                startTime =
                  seg.words[0].start_time ?? seg.words[0].start_timestamp?.relative ?? null;
              }
            } else {
              text = seg.text || "";
            }
            return { speaker, text, start_time: startTime, is_partial: seg.is_partial || false };
          };

          const newSegments = Array.isArray(rawTranscript)
            ? rawTranscript.map(normalize)
            : [normalize(rawTranscript)];

          for (const newSeg of newSegments) {
            const existingIndex = transcriptList.findIndex(
              (s: any) =>
                s.speaker === newSeg.speaker &&
                s.start_time !== null &&
                newSeg.start_time !== null &&
                Math.abs(s.start_time - newSeg.start_time) < 0.1
            );
            if (existingIndex !== -1) {
              transcriptList[existingIndex] = newSeg;
            } else {
              transcriptList.push(newSeg);
            }
          }

          transcriptList.sort((a: any, b: any) => (a.start_time || 0) - (b.start_time || 0));

          const stmtUpdate = db.prepare(
            "INSERT OR REPLACE INTO transcripts (bot_id, transcript) VALUES (?, ?)"
          );
          stmtUpdate.run(botId, JSON.stringify(transcriptList));
          console.log(
            `Updated transcript for bot ${botId} (Total segments: ${transcriptList.length})`
          );
        }
      } else if (isParticipantEvent) {
        // Broadcast participant events to clients
        if (botId) {
          broadcastTranscript(botId, {
            event_type: "participant_event",
            event: event,
            data: data
          });
        }
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).send("Error");
    }
  });

  // ─── Vite / Static middleware ─────────────────────────────────────────────
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

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();