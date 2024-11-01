import { Router } from "express";
import { cacheQuizToRedis } from "../controllers/redis.quiz.controller";

const router = Router();

router.get("/cache/:quizId", cacheQuizToRedis);

export default router;
