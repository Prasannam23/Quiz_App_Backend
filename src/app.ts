// src/app.ts
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import prisma from './config/db';
import http from 'http';

import  {startWebSocketServer}  from './websocket/ws.server';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import googleAuthRoutes from './routes/google.auth.routes';
import quizRoutes from './routes/quiz.routes';
import redisQuizRoutes from "./routes/redis.quiz.routes";
import './google/strategies/google';
import { connectRedis } from './config/redis';

dotenv.config();

const app = express();
export const server = http.createServer(app); 


export async function initializeWorkerApp() {
  try {
    app.use(cors({
      origin: "https://quizbee-frontend-htsh.vercel.app",
      credentials: true,
    }));
    app.use(express.json());
    app.use(cookieParser());
    app.use(session({
      secret: process.env.SESSION_SECRET || 'keyboard cat',
      resave: false,
      saveUninitialized: false,
    }));
    app.use(passport.initialize());
    app.use(passport.session());


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    passport.serializeUser((user: any, done) => done(null, user.id));
    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    });
    setInterval(() => {
      const used = process.memoryUsage().heapUsed / 1024 / 1024;
      console.log(`[PID ${process.pid}] Memory usage: ${Math.round(used * 100) / 100} MB`);
    }, 10000);

    app.get('/', (_req: Request, res: Response) => {
      res.send('🧠 Quiz App Backend is running!');
    });
    app.use('/api/auth', authRoutes);
    app.use('/api/auth', googleAuthRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/quiz', quizRoutes);
    app.use("/api/redis", redisQuizRoutes)

    startWebSocketServer(server);

    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
      console.log(`Worker ${process.pid} running on http://localhost:${PORT}`);
    });
    await connectRedis();
  } catch (error) {
    console.error(`Worker ${process.pid}: Error during app initialization:`, error);
    process.exit(1); 
  }
}