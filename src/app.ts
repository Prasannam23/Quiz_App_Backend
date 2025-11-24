// src/app.ts
import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import prisma from "./config/db";
import http from "http";

import { startWebSocketServer } from "./websocket/ws.server";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import googleAuthRoutes from "./routes/google.auth.routes";
import quizRoutes from "./routes/quiz.routes";
import redisQuizRoutes from "./routes/redis.quiz.routes";
import "./google/strategies/google";
import { connectRedis } from "./config/redis";

dotenv.config();

const app = express();
export const server = http.createServer(app);

const allowedOrigins = [
  "https://quizbee-frontend-htsh.vercel.app",
  "http://localhost:3000",
];

// Trust NGINX reverse proxy
app.set("trust proxy", 1);

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Set-Cookie"],
  })
);

app.use(express.json());
app.use(cookieParser());

// Passport (without sessions)
app.use(passport.initialize());
import "./google/strategies/google";

// Serialize / deserialize
passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Routes
app.get("/api/health", (_req: Request, res: Response) => {
  res.send("OK");
});

app.get("/", (_req: Request, res: Response) => {
  res.send("🧠 Quiz App Backend is running!");
});

app.use("/api/auth", authRoutes);
app.use("/api/auth", googleAuthRoutes);
app.use("/api/user", userRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/redis", redisQuizRoutes);

// Start websocket server
startWebSocketServer(server);

// Start backend server
const PORT = Number(process.env.PORT) || 8000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});

// Connect Redis
connectRedis();
