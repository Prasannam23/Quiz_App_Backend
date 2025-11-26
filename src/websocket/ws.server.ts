import { Server as HTTPServer } from "http";
import WebSocket from "ws";
import {
  WSMessage,
  JoinRoomPayload,
  AnswerPayload,
  StartQuizPayload,
  FetchLeaderboardPayload,
} from "../types/types";
import jwt, { JwtPayload } from "jsonwebtoken";
import {
  handleAnswer,
  handleJoinRoom,
  handleStartQuiz,
  sendUsers,
} from "./ws.handlers";
import {
  handleDisconnect,
  handleFetchLeaderboard,
} from "./ws.utils";

const SECRET = process.env.JWT_SECRET!;

export const startWebSocketServer = (server: HTTPServer) => {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", async (socket, req) => {
    try {
      // ------------------------------
      //   READ TOKEN FROM QUERY PARAM
      // ------------------------------
      const url = new URL(req.url!, "http://localhost"); 
      const token = url.searchParams.get("token");

      if (!token) {
        console.log("❌ Missing token in query params");
        socket.close();
        return;
      }

      let decoded: JwtPayload;
      try {
        decoded = jwt.verify(token, SECRET) as JwtPayload;
      } catch (err) {
        console.log("❌ Invalid token. Closing WebSocket.");
        socket.close();
        return;
      }

      const userId = decoded.id;
      let quizId: string | undefined;

      console.log(
        `🟢 WebSocket connected | User: ${userId} | Address:`,
        server.address()
      );

      // ------------------------------------------------------
      //   HANDLE INCOMING WS MESSAGES
      // ------------------------------------------------------
      socket.on("message", async (data: string) => {
        try {
          const message: WSMessage = JSON.parse(data);

          switch (message.type) {
            case "JOIN_ROOM": {
              const payload = message.payload as JoinRoomPayload;
              quizId = payload.quizId;

              await handleJoinRoom(socket, payload);
              await sendUsers(socket, quizId);
              break;
            }

            case "START_QUIZ": {
              await handleStartQuiz(
                socket,
                message.payload as StartQuizPayload
              );
              break;
            }

            case "ANSWER": {
              await handleAnswer(
                socket,
                message.payload as AnswerPayload
              );
              break;
            }

            case "LEADERBOARD": {
              const payload = message.payload as FetchLeaderboardPayload;
              await handleFetchLeaderboard(
                payload.quizId,
                socket,
                payload.startRank,
                payload.count
              );
              break;
            }

            default:
              console.warn(`⚠ Unknown WS type: ${message.type}`);
          }
        } catch (err) {
          console.error("❌ WS message handling error:", err);
        }
      });

      // ------------------------------------------------------
      //   CLEAN DISCONNECT
      // ------------------------------------------------------
      socket.on("close", () => {
        console.log("🔴 WebSocket disconnected");
        if (quizId) handleDisconnect(quizId, userId);
      });

    } catch (err) {
      console.error("❌ WS Connection Error:", err);
      socket.close();
    }
  });

  console.log("🟢 WebSocket server running...");
};
