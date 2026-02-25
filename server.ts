import express from "express";
import { createServer as createViteServer } from "vite";
import { AccessToken } from "livekit-server-sdk";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: {
        hasLiveKitKey: !!process.env.LIVEKIT_API_KEY,
        hasLiveKitSecret: !!process.env.LIVEKIT_API_SECRET,
        hasLiveKitUrl: !!process.env.LIVEKIT_URL,
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
      }
    });
  });

  // LiveKit Token Generation Endpoint
  app.get("/api/token", async (req, res) => {
    const room = req.query.room as string;
    const username = req.query.username as string;

    if (!room || !username) {
      return res.status(400).json({ error: "Missing room or username" });
    }

    const apiKey = process.env.LIVEKIT_API_KEY?.trim();
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
    const wsUrl = process.env.LIVEKIT_URL?.trim();

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error("Missing LiveKit configuration:", { apiKey: !!apiKey, apiSecret: !!apiSecret, wsUrl: !!wsUrl });
      return res.status(500).json({ error: "LiveKit configuration missing on server. Please set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL." });
    }

    console.log(`Generating token for room: "${room}", user: "${username}"`);
    console.log(`Using LiveKit URL: ${wsUrl}`);

    try {
      const at = new AccessToken(apiKey, apiSecret, {
        identity: username,
      });

      at.addGrant({
        roomJoin: true,
        room: room,
        canPublish: true,
        canSubscribe: true,
      });

      const token = await at.toJwt();
      console.log("Token generated successfully");
      res.json({ token });
    } catch (tokenErr: any) {
      console.error("Token generation failed:", tokenErr);
      res.status(500).json({ error: "Failed to generate access token: " + tokenErr.message });
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
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
