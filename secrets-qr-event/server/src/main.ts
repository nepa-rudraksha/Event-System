import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import { createRouter } from "./router.js";
import { attachRealtime } from "./realtime/socket.js";

dotenv.config();

const app = express();
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

const allowedOrigins = process.env.WEB_ORIGIN
  ? [process.env.WEB_ORIGIN]
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") || origin.includes(".ngrok-free.dev") || origin.includes(".ngrok.io") || origin.includes(".trycloudflare.com") || origin.includes(".cfargotunnel.com")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.get("/health", (_, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") || origin.includes(".ngrok-free.dev") || origin.includes(".ngrok.io") || origin.includes(".trycloudflare.com") || origin.includes(".cfargotunnel.com")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  },
});

attachRealtime(io);

app.use("/api", createRouter(io));

const port = process.env.PORT || 8080;
httpServer.listen(port, () => console.log(`API running on :${port}`));
