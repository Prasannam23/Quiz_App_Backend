import { Request, Response } from "express";
import { redisClient } from "../config/redis";
import prisma from "../config/db";

export const cacheQuizToRedis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quizId } = req.params;

    
    const cached = await redisClient.get(`quizData:${quizId}`);
    if (cached) {
      res.status(200).json({ cached: true });
    }

 
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }

    const time = quiz?.questions.reduce((acc, curr) => {
      return acc+curr.timeLimit;
    }, 0);

    const qs = [];

    for(const q of quiz.questions) {
      const q1 = {...q, status: "not_done"};
      qs.push(q1);
    }

    quiz.questions = qs;

    if(!time) {
      throw Error("No questions in the current quiz");
    }
   
    await redisClient.set(`quizData:${quizId}`, JSON.stringify(quiz));

    res.status(200).json({ cached: true});
  } catch (err) {
    console.error("Redis cache error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
