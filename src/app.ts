// src/app.ts
import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
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

// ================================
// ALLOWED ORIGINS
// ================================
const allowedOrigins = [
  "https://quizbee-frontend-htsh.vercel.app",
  "http://localhost:3000",
];

// ================================
// TRUST NGINX PROXY FOR HTTPS COOKIE HANDLING
// ================================
app.set("trust proxy", 1);

// ================================
// CORS CONFIG
// ================================
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
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ================================
app.use(express.json());
app.use(cookieParser());

// ================================
// SESSION + PASSPORT
// ================================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,           // Required for HTTPS
      httpOnly: true,
      sameSite: "none",       // Required for cross-domain cookies
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ================================
// ROUTES
// ================================
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

// ================================
// START WEBSOCKET SERVER
// ================================
startWebSocketServer(server);

// ================================
// START SERVER
// ================================
const PORT = Number(process.env.PORT) || 8000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});

// ================================
// CONNECT REDIS
// ================================
connectRedis();
