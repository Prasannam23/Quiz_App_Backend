import { WebSocket } from "ws"; 
import LeaderBoardService from "../services/leaderboard.service";
import { QuestionService } from "../services/question.service";
  
export interface ClientInfo {
  userId: string;
  isHost: boolean;
  socket: WebSocket; 
}

export interface Room {
  roomId: string,
  clients: Map<string, ClientInfo>,
  leaderboardService: LeaderBoardService,
  questionService: QuestionService,
}

export interface WSMessage {
  type: string;
  payload: JoinRoomPayload | AnswerPayload | StartQuizPayload | UserPayload | sendUsersPayload | ErrorPayload | LeaderBoardEntry | QuizUpdatePayload | QuizStartPayload | NewUserPayload | FetchLeaderboardPayload | Question | null;
}

export interface ErrorPayload {
  message: string,
}

export interface JoinRoomPayload {
  quizId: string;
  userId: string;
}

export interface AnswerPayload {
  quizId: string;
  attemptId: string;
  userId: string;
  questionId: string,
  answer: number;
}

export interface StartQuizPayload {
  quizId: string;
}

export interface LeaderBoardEntry {
  value: string,
  score: number,
}

export interface sendUsersPayload {
  roomId: string,
  users: UserPayload[]
}

export interface NewUserPayload {
  user: UserPayload | HostPayload,
}

export interface QuizUpdatePayload {
  quizId: string,
  message: string,
}

export interface QuizStartPayload {
  quizId: string,
  message: string,
  attemptId: string | null,
}

export interface FetchLeaderboardPayload {
  quizId: string,
  startRank: number,
  count: number,
}

export interface ILeaderBoardService {
  addMember(userId: string, score: number): Promise<void>;
  incrementScore(userId: string, incrementBy: number): Promise<number>;
  getTopPlayers(count: number): Promise<LeaderBoardEntry[]>;
  getPlayersInRange(startRank: number, count: number): Promise<LeaderBoardEntry[]>;
  getRank(userId: string): Promise<number | null>;
  getScore(userId: string): Promise<number | null>;
  size(): Promise<number>;
  removeMember(userId: string): Promise<boolean>;
  publishUpdates(channel: string, message: string): Promise<void>;
  subscribeToUpdates(channel: string, handler: (message: string) => void): Promise<void>;
  unsubscribeToUpdates(channel: string): Promise<void>;
}

export interface IRedisService {
  addUsertoRoom(user: UserPayload | HostPayload, quizId: string): Promise<void>;
  getUsersInRoom(quizId: string): Promise<UserPayload[]>;
  checkIfUserInRoom(userId: string, quizId: string): Promise<boolean>;
  removeUserFromRoom(userId: string, quizId: string): Promise<void>;
}

export interface IQuestionService {
  init(): Promise<void>;
  addNewCurrentQuestion(question: Question): Promise<boolean>;
  getCurrentQuestion(): Promise<Question | null>;
  publishNewQuestion(question: Question): Promise<void>;
  subscribe(handler1:(message: string) => void, handler2:(message: string) => void): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  subscibeToExpiry(): Promise<void>;
  publishUpdates(type: string, message: string, attemptId: string | null): Promise<void>;
  evaluateAnswer(questionId: string, answer: number): Promise<score | null>;
}

export interface score {
  score: number;
  timetaken: number;
}

export interface Question {
  id: string,
  question: string,
  options: string[],
  answerIndex: number,
  marks: number,
  timeLimit: number,
  status: string,
}

export interface UserPayload {
  id: string,
  name: string,
  avatar: string,
  email: string,
}

export interface HostPayload extends UserPayload {
  isHost: boolean
}

export interface LeaderboardPayload {
  quizId: string,
  topPlayers: LeaderBoardEntry[],
  selfScore: SelfScore | null,
}

export interface SelfScore {
  userId: string,
  rank: number,
  score: number,
}