// src/websocket/ws.utils.ts
import { RedisClientType } from 'redis';
import { redisClient, redisPub, redisSub } from '../config/redis';
import LeaderBoardService from '../services/leaderboard.service';
import { ClientInfo, LeaderBoardEntry, LeaderboardPayload, QuizStartPayload, Room, SelfScore, WSMessage } from '../types/types';
import { QuestionService } from '../services/question.service';
import { server } from '../app';
import prisma from '../config/db';
import { WebSocket } from 'ws';

export const rooms = new Map<string, Room>();

export const safeSend = (ws: WebSocket, message: string) => {
  if (ws.readyState === ws.OPEN) {
    try {
      ws.send(message);
    } catch (err) {
      console.error("WebSocket send error:", (err as Error).message);
    }
  } else {
    console.warn("Attempted to send on closed socket");
  }
}

export const addClient = async (client: ClientInfo, roomId: string) => {
  if(!rooms.has(roomId)) {
    const questionService = new QuestionService(redisPub as RedisClientType, roomId);
    await questionService.init();
    console.log("initiated");
    const room: Room = {
      roomId,
      clients: new Map<string, ClientInfo>(),
      leaderboardService: new LeaderBoardService(redisPub as RedisClientType, redisSub as RedisClientType, `leaderboard:${roomId}`, `pubsub:${roomId}`, roomId),
      questionService,
    }
    room.clients.set(client.userId, client);
    rooms.set(roomId, room);
    await clientSubscriptionToQuestionAndLeaderboard(roomId);
    console.log(`room created on `, server.address())
  } else rooms.get(roomId)?.clients.set(client.userId ,client);
};

export const removeClient = (userId: string) => {
  for(const [key, value] of rooms) {
    if(value.clients.has(userId)) {
      value.clients.delete(userId);
      console.log(`Client with socket id ${userId} removed from Room ${key}`);
    }
  }
};

export const getClientsInRoom = (roomId: string) => {
  return rooms.get(roomId)?.clients;
};

export const getClientByUserId = (userId: string) => {
  for(const [, value] of rooms) {
    if(value.clients.has(userId)) {
      return value.clients.get(userId);
    }
  }
};

export const broadcastToRoom = (roomId: string, message: WSMessage) => {
  try {
    console.log("broadcasting", message);
    const roomClients = getClientsInRoom(roomId);
    if(!roomClients) {
      throw Error("Room not found.");
    }
    roomClients.forEach((value) => {
      value.socket?.send(JSON.stringify(message));
    });
  } catch (error) {
    console.error(`Error ocurred while broadcasting to room, ${(error as Error).message}`);
  }
};

export const broadcastLeaderBoardToRoom = async (roomId: string, topPlayers: LeaderBoardEntry[]) => {
  try {
    const roomClients = getClientsInRoom(roomId);
    const room = rooms?.get(roomId);
    if(!roomClients || !room) {
      throw Error("Room not found.");
    }
    const arr = [];
    for(const [, value] of roomClients) {
      arr.push({
        socket: value.socket,
        score: await room.leaderboardService.getScore(value.userId),
        rank: await room.leaderboardService.getRank(value.userId),
        userId: value.userId,
        isHost: value.isHost,
      });
    }
    const fulfilledArr = await Promise.all(arr);
    fulfilledArr.forEach(async (value) => {
      const selfScore: SelfScore = {
        userId: value.userId,
        rank: value.rank==null?-1:value.rank+1,
        score: value.score==null?-1:value.score,
      }
      const payload: LeaderboardPayload = {
        quizId: roomId,
        topPlayers,
        selfScore
      }
      if(value.isHost) payload.selfScore = null;
      value.socket?.send(JSON.stringify({type: "Leaderboard", payload}));
    });
  } catch (error) {
    console.error(`Error ocurred while broadcasting to room, ${(error as Error).message}`);
  }
}

export const isHost = (roomId: string) => {
  const room = rooms.get(roomId);
  if(!room) return false;
  for(const [, val] of room.clients) {
    if(val.isHost) return true;
  }
  return false;
}

export const startquiz = async (quizId: string) => {
  const test = await rooms.get(quizId)?.questionService.addNewCurrentQuestion();
  if(!test) {
    return false;
  }
  await rooms.get(quizId)?.questionService.subscibeToExpiry();
  await prisma.quiz.update({
    where: {
      id: quizId
    },
    data: {
      state: "ongoing",
    }
  })
  return true;
}

export const sendAttemptId = async (quizId: string, update: WSMessage) => {
  const clients = rooms.get(quizId)?.clients;
  if(!clients) {
    return;
  }
  const attemptPromises = [];
  for(const [,val] of clients) {
    const startedAt = new Date();
    startedAt.setSeconds(startedAt.getSeconds() + 3);
    if(!val.isHost) attemptPromises.push({socket: val.socket,attempt: await prisma.attempt.create({
      data: {
        quiz: {
          connect: { id: quizId }
        },
        user:  {
          connect: {id: val.userId},
        },
        score: 0,
        startedAt,
      },
    })});
    else safeSend(val.socket, JSON.stringify(update));
  }
  const attempts = await Promise.all(attemptPromises);
  attempts.forEach((attempt) => {
    (update.payload as QuizStartPayload).attemptId = attempt.attempt.id;
    safeSend(attempt.socket, JSON.stringify(update));
  })
}

export const sendUpdates = async (type: string, message: string, quizId: string) => {
  console.log("inside sendupdates");
  await rooms.get(quizId)?.questionService.publishUpdates(type, message);
}

export const clientSubscriptionToQuestionAndLeaderboard = async (quizId: string) => {
  console.log("Inside client subscription");
  await rooms.get(quizId)?.questionService.subscribe((message) => {
    const question: WSMessage = JSON.parse(message);
    broadcastToRoom(quizId, question);
  }, (message) => {
    const update: WSMessage = JSON.parse(message);
    console.log(update);
    if(update.type === "QUIZ_STARTED") {
      sendAttemptId(quizId, update);
    } else if(update.type==="QUIZ_END") {
      broadcastToRoom(quizId, update);
      finishQuiz(quizId);
    } else broadcastToRoom(quizId, update);
  });
  await rooms.get(quizId)?.leaderboardService.subscribeToUpdates("leaderboard", (message: string)=> {
    const topPlayers: LeaderBoardEntry[] = JSON.parse(message);
    broadcastLeaderBoardToRoom(quizId, topPlayers);
  });
  console.log(`Client subscription to new question and leaderboard `, server.address());
}

export const evaluateScoreAndUpdateLeaderboard = async(userId: string, quizId: string, questionId: string, answer: number, attemptId: string): Promise<boolean> => {
  try {
    const questionScore = await rooms.get(quizId)?.questionService.evaluateAnswer(questionId, answer);
    const l = rooms.get(quizId)?.leaderboardService;
    if(!l) {
      throw new Error("Leaderboard service not found, Either not initiated or the quiz has not started yet.");
    }
    if(!questionScore) {
      throw new Error("Something went wrong while evaluating score.");
    }
    const existingScore = await l.getScore(userId);
    if(!existingScore) {
      await l.addMember(userId, questionScore.score);
    } else await l.incrementScore(userId, questionScore.score);
    const topPlayers = await l.getTopPlayers(10);
    l.publishUpdates("leaderboard", JSON.stringify(topPlayers));
    await prisma.answer.create({
      data: {
        attempt: {
          connect: {
            id: attemptId,
          },
        },
        question: {
          connect: {
            id: questionId,
          },
        },
        selected: answer,
        isCorrect: questionScore? true: false,
        marksScored: questionScore.score,
        timeTaken:  questionScore.timetaken,
      }
    });
    await prisma.attempt.update({
      where: {
        id: attemptId,
      },
      data: {
        score: {
          increment: questionScore.score,
        },
        state: "ongoing",
        completedAt: new Date(),
      }
    });
    return true;
  } catch (error) {
    console.error((error as Error).message);
    return false;
  }
}

export const finishQuizHost = async (quizId: string) => {
  const size = await rooms.get(quizId)?.leaderboardService.size();
  if(!size) {
    return;
  }
  const leaderboard = await rooms.get(quizId)?.leaderboardService.getPlayersInRange(0, size);

  await rooms.get(quizId)?.leaderboardService.publishUpdates("leaderboard", JSON.stringify(leaderboard));

  setTimeout(async () => {
    await rooms.get(quizId)?.leaderboardService.unsubscribeToUpdates("leaderboard");
  }, 3000);

  await rooms.get('quizId')?.questionService.publishUpdates("QUIZ_END", "This quiz has ended.");
  await redisClient.del([`quizData:${quizId}`, `quiz:${quizId}`, `leaderboard:${quizId}`]);

  await prisma.quiz.update({
    where: {
      id: quizId
    },
    data: {
      state: "completed",
    },
  });

  await prisma.attempt.updateMany({
    where: {
      quizId,
    },
    data: {
      state: "completed"
    }
  });
}

export const finishQuiz = async (quizId: string) => {
  const clients = rooms.get(quizId)?.clients;
  if(clients) {
    for(const [, val] of clients) {
      val.socket.close();
    }
  }
  rooms.delete(quizId);
}

export const handleFetchLeaderboard = async (quizId: string, socket: WebSocket, startRank: number, count: number) => {
  const leaderboard = await rooms.get(quizId)?.leaderboardService.getPlayersInRange(startRank, count);
  safeSend(socket, JSON.stringify({type: "Leaderboard_In_Range", leaderboard}));
}

export const handleDisconnect = async (quizId: string, userId: string) => {
  await rooms.get(quizId)?.questionService.publishUpdates("USER_LEFT", userId);
};