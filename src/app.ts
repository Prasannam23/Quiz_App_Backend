// src/app.ts
import express, { Request, Response } from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import prisma from "./config/db";
import { startWebSocketServer } from "./websocket/ws.server";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import googleAuthRoutes from "./routes/google.auth.routes";
import quizRoutes from "./routes/quiz.routes";
import redisQuizRoutes from "./routes/redis.quiz.routes";
import { connectRedis } from "./config/redis";
import "./google/strategies/google";

dotenv.config();
console.log("✅ Environment variables loaded");

// Create Express app and HTTP server
export const app = express();
export const server = http.createServer(app);
console.log("✅ Express app and HTTP server created");

// Middleware
app.set("trust proxy", 1);
console.log("✅ Trust proxy enabled");

const allowedOrigins = [
  "https://quizbee-frontend-hw1y4b2rl-prasannam23s-projects.vercel.app",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Set-Cookie"],
  })
);

// Handle preflight requests explicitly
app.options("*", cors());
console.log("✅ CORS configured");

app.use(express.json());
app.use(cookieParser());
console.log("✅ Body parser + Cookie parser enabled");

// Serialize / deserialize (must be before passport.initialize)
passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
console.log("✅ Passport serialization setup completed");

// Passport setup
app.use(passport.initialize());
console.log("✅ Passport initialized");

// Health check route
app.get("/api/health", (_req: Request, res: Response) => {
  console.log("🩺 Health check requested");
  res.send("OK");
});

// Root route
app.get("/", (_req: Request, res: Response) => {
  console.log("🏠 Root route requested");
  res.send("🧠 Quiz App Backend is running!");
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", googleAuthRoutes);
app.use("/api/user", userRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/redis", redisQuizRoutes);
console.log("✅ All API routes loaded");

// Exported function to initialize app and dependencies (for workers)
export async function initializeWorkerApp() {
  console.log(`👷 Worker ${process.pid} initializing...`);

  // Connect Redis
  try {
    console.log("🔄 Attempting to connect to Redis...");
    await connectRedis();
    console.log("✅ Redis connected successfully");
  } catch (err) {
    console.error("❌ Redis connection failed:", err);
    throw err;
  }

  // Start WebSocket server
  try {
    console.log("🔄 Starting WebSocket server...");
    startWebSocketServer(server);
    console.log("✅ WebSocket server started");
  } catch (err) {
    console.error("❌ WebSocket server failed to start:", err);
    throw err;
  }

  console.log("✅ Worker initialization complete!");
  return { app, server };
}
