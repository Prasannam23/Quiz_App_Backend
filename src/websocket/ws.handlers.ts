import { WebSocket } from "ws";
import {
  AnswerPayload,
  ClientInfo,
  HostPayload,
  JoinRoomPayload,
  StartQuizPayload,
  UserPayload,
  WSMessage,
  sendUsersPayload
} from "../types/types";
import { addClient, evaluateScoreAndUpdateLeaderboard, getClientByUserId, safeSend, sendUpdates, startquiz } from "./ws.utils";
import prisma from "../config/db";
import { redisService } from "../services/redis.service";
import { server } from "../app";


export const handleJoinRoom = async (socket: WebSocket, payload: JoinRoomPayload) => {
  try {
    const { quizId, userId } = payload;

    console.log(`👤 User ${payload.userId} joined room ${payload.quizId},`, server.address());

    const existingUserInRedis = await redisService.checkIfUserInRoom(userId, quizId);
    
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true, 
      }
    });

    const quiz = await prisma.quiz.findUnique({
      where: {
        id: quizId,
      },
    });

    const client: ClientInfo = {
      userId,
      socket,
      isHost: quiz?.ownerId==userId,
    };

    await addClient(client, quizId);

    if(!quiz) {
      throw new Error("Quiz not found.");
    }

    if(quiz.state == "ongoing") {
      const a = await prisma.attempt.findMany({
        where: {
          userId,
          quizId,
          OR: [
            { state: "ongoing" },
            { state: "yet_to_start" }
          ],
        }
      });

      if(a.length) {
        safeSend(socket, JSON.stringify({type: "QUIZ_ONGOING", payload: {
          message: "Quiz Ongoing following is your attemptId, you will be given the next question shortly.",
          attemptId: a[0].id,
        }}));
        return;
      }

      const attempt = await prisma.attempt.create({
        data: {
          score: 0,
          user: {
            connect: {
              id: userId,
            },
          },
          quiz: {
            connect: {
              id: quizId,
            },
          },
          startedAt: new Date(),
        }
      });
      safeSend(socket, JSON.stringify({type: "QUIZ_ONGOING", payload: {
        message: "Quiz Ongoing following is your attemptId, you will be given the next question shortly.",
        attemptId: attempt.id
      }}));
      
    }
  
    if(!user) {
      throw new Error("User not found.");
    }
  
    let data: UserPayload | HostPayload;
    if(quiz?.ownerId!=userId) {
      data = {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar || 'No-Avatar',
        email: user.email,
      } as UserPayload;
    } else {
      data = {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar || 'No-Avatar',
        email: user.email,
        isHost: quiz?.ownerId==userId,
      } as HostPayload;
    }

    if(!existingUserInRedis) await redisService.addUsertoRoom(data, quizId);


    await sendUpdates("NEW_USER", JSON.stringify(data), quizId);

  } catch (error) {
    console.error(`Error while handling user join message ${(error as Error).message}`)
  }
};

export const sendUsers = async (socket: WebSocket, roomId: string): Promise<void> => {
  const users = await redisService.getUsersInRoom(roomId);
  const payload: sendUsersPayload = {
    roomId,
    users,
  }
  const m: WSMessage = {
    type: "USERS_IN_ROOM",
    payload,
  }
  safeSend(socket, JSON.stringify(m));
}

export const handleStartQuiz = async (socket: WebSocket, payload: StartQuizPayload) => {
  const { quizId } = payload;

  await sendUpdates("QUIZ_STARTED", "Quiz has started, here is the attemptId for the given quiz", quizId);

  setTimeout(async () => {
    const test = await startquiz(quizId);
    if(!test) {
      const message: WSMessage = {
        type: "ERROR",
        payload: {
          message: "Either Quiz not found or or it does not have any questions"
        }
      }
      safeSend(socket, JSON.stringify(message));
    }
  }, 3000);
};

export const handleAnswer = async (socket: WebSocket, payload: AnswerPayload) => {
  const { quizId, userId, answer, questionId, attemptId } = payload;
  
  const test = await evaluateScoreAndUpdateLeaderboard(userId, quizId, questionId, answer, attemptId);

  if(test) {
    safeSend(socket, JSON.stringify({
      type: "ANSWER_RECEIVED",
      payload: { status: "ok" },
    }))
  } else {
    safeSend(socket, JSON.stringify({type: "ERROR", payload:{
      message: "Something went wrong."
    }}));
  }
};