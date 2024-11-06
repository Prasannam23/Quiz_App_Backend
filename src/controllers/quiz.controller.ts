// src/controllers/quiz.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/db';
import { nanoid } from 'nanoid';
// import { rooms } from '../websocket/ws.utils';
// import { ClientInfo, Room } from '../types/types';
// import {  redisPub, redisSub } from '../config/redis';
// import LeaderBoardService from '../services/leaderboard.service';
// import { RedisClientType } from 'redis';

export const createQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, maxScore, questions } = req.body;
    const userId = req.user?.id;

    if(!userId) {
      throw new Error("User Not Authenticated");
    }

    if (!title || !Array.isArray(questions) || !maxScore) {
      res.status(400).json({ error: 'Missing quiz data' });
      return;
    }

    const joinCode = nanoid(4);

    const newQuiz = await prisma.quiz.create({
      data: {
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        joinCode,
        maxScore,
        ownerId: userId,
        questions: {
          create: questions.map((q) => ({
            question: q.question,
            options: q.options,
            answerIndex: q.answerIndex,
            marks: q.marks,
            timeLimit: q.timeLimit,
          })),
        },
      },
      include: { questions: true },
    });

    res.status(201).json({ message: 'Quiz created', quizId: newQuiz.id });
  } catch (err) {
    console.error('Create quiz error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (userRole === 'STUDENT') {
      // For students: return last attempted quiz
      const lastAttempt = await prisma.attempt.findFirst({
        where: {
          userId: userId,
        },
        orderBy: {
          completedAt: 'desc',
        },
        include: {
          quiz: {
            include: {
              questions: true,
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!lastAttempt) {
        res.status(404).json({ message: 'No quiz attempts found' });
        return;
      }

      res.status(200).json({
        message: 'Last attempted quiz retrieved successfully',
        data: {
          attempt: {
            id: lastAttempt.id,
            score: lastAttempt.score,
            startedAt: lastAttempt.startedAt,
            completedAt: lastAttempt.completedAt,
          },
          quiz: lastAttempt.quiz,
        },
      });
    } else if (userRole === 'TEACHER') {
      // For teachers: return all quizzes created by them
      const createdQuizzes = await prisma.quiz.findMany({
        where: {
          ownerId: userId,
        },
        include: {
          questions: true,
          attempts: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              attempts: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({
        message: 'Quizzes retrieved successfully',
        data: {
          quizzes: createdQuizzes,
          totalQuizzes: createdQuizzes.length,
        },
      });
    } else {
      // For ADMIN and SUPERADMIN: return all quizzes
      const allQuizzes = await prisma.quiz.findMany({
        include: {
          questions: true,
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          attempts: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              attempts: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({
        message: 'All quizzes retrieved successfully',
        data: {
          quizzes: allQuizzes,
          totalQuizzes: allQuizzes.length,
        },
      });
    }
  } catch (err) {
    console.error('Get quiz error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getQuizById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quizId } = req.params;
    console.log(`Fetching quiz with ID: ${quizId}`);
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!quizId) {
      res.status(400).json({ error: 'Quiz ID is required' });
      return;
    }

    const quiz = await prisma.quiz.findUnique({
      where: {
        id: quizId,
      },
      include: {
        questions: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        attempts: userRole === 'TEACHER' || userRole === 'ADMIN' || userRole === 'SUPERADMIN' ? {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        } : {
          where: {
            userId: userId,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    });

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    // Check if student is trying to access a quiz they haven't attempted
    if (userRole === 'STUDENT' && quiz.ownerId !== userId && quiz.attempts.length === 0) {
      res.status(403).json({ error: 'Access denied: You have not attempted this quiz' });
      return;
    }

    // Check if teacher is trying to access a quiz they don't own
    if (userRole === 'TEACHER' && quiz.ownerId !== userId) {
      res.status(403).json({ error: 'Access denied: You can only view your own quizzes' });
      return;
    }

    res.status(200).json({
      message: 'Quiz retrieved successfully',
      data: quiz,
    });
  } catch (err) {
    console.error('Get quiz by ID error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// export const createRoom = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { quizId } = req.body;
//     const userId = req.user?.id;

//     const quiz = await prisma.quiz.findUnique({
//       where: {
//         id: quizId,
//         ownerId: userId,
//       }
//     });

//     if(!quiz) {
//       throw new Error("Quiz not found");
//     }

//     const leaderboardService = new LeaderBoardService(redisPub as RedisClientType, redisSub as RedisClientType, `leaderboard:${quizId}`, `pubsub:${quizId}`);

//     const room : Room = {
//       roomId: quiz.joinCode,
//       clients: new Map<string,ClientInfo>(),
//       leaderboardService,
//     }

//     const roomId = quiz.id;

//     rooms.set(roomId, room);

//     res.status(500).json({ message: 'Room Created', roomId });
//   } catch (error) {
//     console.error("Create room error:", error);
//     res.status(500).json({error: "Internal Server Error"});
//   }
// }

