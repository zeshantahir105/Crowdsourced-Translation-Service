import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import passport from "passport";
import rateLimit from "express-rate-limit";

import stripeWebhookRoutes from "./routes/stripeWebhook.js";
import authRoutes from "./routes/auth.js";
import translateRoutes from "./routes/translate.js";
import documentsRoutes from "./routes/documents.js";
import versionsRoutes from "./routes/versions.js";
import scoresRoutes from "./routes/scores.js";
import reputationRoutes from "./routes/reputation.js";
import glossaryRoutes from "./routes/glossary.js";
import tasksRoutes from "./routes/tasks.js";
import developerRoutes, { createPublicTranslateRouter } from "./routes/developer.js";
import adminRoutes from "./routes/admin.js";
import billingRoutes from "./routes/billing.js";
import { isQueueEnabled } from "./queues/lingoHubQueue.js";
import { setupRedisBridge } from "./realtime/redisBridge.js";

/** Comma-separated browser origins (Vercel prod, preview, local). Trailing slashes stripped — must match browser Origin exactly. */
function clientOrigins() {
  const raw = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  const list = raw
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return list.length ? list : ["http://localhost:5173"];
}

const allowedOrigins = clientOrigins();

const app = express();
// Render, Railway, etc. sit behind a proxy that sets X-Forwarded-For. Without this,
// express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and client IP is wrong.
if (process.env.TRUST_PROXY === "0" || process.env.TRUST_PROXY === "false") {
  app.set("trust proxy", false);
} else {
  const hops = Number(process.env.TRUST_PROXY_HOPS);
  app.set("trust proxy", Number.isFinite(hops) && hops >= 0 ? hops : 1);
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.length <= 1 ? allowedOrigins[0] : allowedOrigins,
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
});

app.use(passport.initialize());
app.use(
  cors({
    origin: allowedOrigins.length <= 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  })
);

const morganFmt = process.env.LOG_FORMAT || (process.env.NODE_ENV === "production" ? "combined" : "dev");
app.use(
  morgan(morganFmt, {
    skip: (req, res) => req.path === "/health" && res.statusCode < 400,
  })
);

// Stripe webhooks need raw body — must be before express.json()
app.use("/webhooks", stripeWebhookRoutes);

app.use(express.json({ limit: "1mb" }));
app.use(limiter);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "lingohub-api" });
});

app.use("/auth", authRoutes);
app.use("/translate", translateRoutes);
app.use("/documents", documentsRoutes);
app.use("/versions", versionsRoutes);
app.use("/scores", scoresRoutes);
app.use("/reputation", reputationRoutes);
app.use("/glossary", glossaryRoutes);
app.use("/tasks", tasksRoutes);
app.use("/developer", developerRoutes);
app.use("/admin", adminRoutes);
app.use("/billing", billingRoutes);
app.use("/api", apiLimiter, createPublicTranslateRouter());

setupRedisBridge(io);

io.on("connection", (socket) => {
  socket.emit("hello", { message: "LingoHub realtime connected" });
});

const port = Number(process.env.PORT) || 4000;
httpServer.listen(port, () => {
  console.log(`API + WebSocket listening on http://localhost:${port}`);
  console.log(
    "[lingohub] Task list: PostgreSQL (GET /tasks). Translator claims still update the DB in this process."
  );
  if (isQueueEnabled()) {
    console.log(
      "[lingohub] Redis queue: ON — AI drafts for POST /translate and POST /documents run in `npm run worker`. Preview stays synchronous."
    );
  } else {
    console.log(
      "[lingohub] Redis queue: OFF — set REDIS_URL and run the worker to offload AI drafts. Until then, AI runs inside each HTTP request."
    );
  }
});
