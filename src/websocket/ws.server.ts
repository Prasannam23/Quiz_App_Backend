import { Server as HTTPServer } from 'http';
import WebSocket from 'ws';
import { WSMessage, JoinRoomPayload, AnswerPayload, StartQuizPayload, FetchLeaderboardPayload } from '../types/types';
import jwt from "jsonwebtoken";
import { handleAnswer,  handleJoinRoom, handleStartQuiz, sendUsers } from './ws.handlers';
import { handleDisconnect, handleFetchLeaderboard } from './ws.utils';

const SECRET = process.env.JWT_SECRET;

export const startWebSocketServer = (server: HTTPServer) => {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (socket, req) => {
    const params = new URLSearchParams(req?.url?.split('/')[1]);
    const token = params.get('token');
    if(!token) return wss.close();
    const decoded = jwt.verify(token, SECRET!) as {id: string, role: string};
    if(!decoded) return wss.close();

    const userId = decoded.id;
    let quizId: string;

    console.log('New WebSocket connection:', server.address());

    socket.on('message', async (data: string) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());

        switch (message.type) {
          case 'JOIN_ROOM': {
            quizId = (message.payload as JoinRoomPayload).quizId;
            await handleJoinRoom(socket, message.payload as JoinRoomPayload);
            sendUsers(socket, (message.payload as JoinRoomPayload).quizId);
            break;
          }

          case 'START_QUIZ': {
            await handleStartQuiz(socket, message.payload as StartQuizPayload);
            break;
          }
  
          case 'ANSWER': {
            const payload = message.payload as AnswerPayload;
            handleAnswer(socket, payload);
            break;
          }

          case 'LEADERBOARD': {
            const payload = message.payload as FetchLeaderboardPayload;
            await handleFetchLeaderboard(payload.quizId, socket, payload.startRank, payload.count);
            break;
          }

          default:
            console.warn(' Unknown message type:', message.type);
        }
      } catch (err) {
        console.error('Failed to handle message:', err);
      }
    });
    
    socket.on('close', () => {
      console.log(' WebSocket disconnected:');
      handleDisconnect(quizId, userId);
    });
  });

  console.log(' WebSocket server running...');
};
