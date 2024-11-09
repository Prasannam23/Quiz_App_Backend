import { createClient, RedisClientType } from "redis";
import { HostPayload, IQuestionService, NewUserPayload, Question, QuizStartPayload, QuizUpdatePayload, score, UserPayload, WSMessage } from "../types/types";
import { server } from "../app";
import { finishQuizHost } from "../websocket/ws.utils";

export class QuestionService implements IQuestionService {
    private redisPub: RedisClientType;
    private redisSub: RedisClientType;
    private quizId: string;

    constructor(redisPub: RedisClientType, quizId: string) {
        this.redisPub = redisPub;
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const sub = createClient({url: redisUrl});
        this.redisSub = sub as RedisClientType;
        this.quizId = quizId;
    }

    async init() {
        await this.redisSub.connect();
        console.log(`redis sub initialized `, server.address())
    }

    async addNewCurrentQuestion(): Promise<boolean> {
        const question = await this.getNewQuestion();
        if(!question) return false;
        await this.redisPub.set(`quiz:${this.quizId}:currentQuestion`, JSON.stringify(question), { EX: question.timeLimit * 60 + 3 });
        this.publishNewQuestion(question);
        return true;
    }

    private async getNewQuestion(): Promise<Question | undefined> {
        const data = await this.redisPub.get(`quizData:${this.quizId}`);
        if(!data) return;
        const quiz = JSON.parse(data);
        for(const q of quiz.questions) {
            if(q.status=="not_done") {
                q.status="done";
                await this.redisPub.set(`quizData:${this.quizId}`, JSON.stringify(quiz));
                return q;
            }
        }
    }

    async getCurrentQuestion(): Promise<Question | null> {
        const data  =  await this.redisPub.get(`quiz:${this.quizId}:currentQuestion`);
        if(!data) return null;
        const question: Question = JSON.parse(data);
        return question;
    }

    async evaluateAnswer(questionId: string, answer: number): Promise<score | null> {
        const [question, ttl] = await Promise.all([this.getCurrentQuestion(), this.redisPub.ttl(`quiz:${this.quizId}:currentQuestion`)]);
        if(!question || question.id !== questionId) {
            return null;
        }
        if(question.answerIndex === answer) {
            return ({
                score: question.marks + (ttl/(question.timeLimit*60)) * (question.timeLimit/3),
                timetaken: (question.timeLimit*60) - ttl,
            }as score);
        }
        return ({
            score: 0,
            timetaken: (question.timeLimit*60) - ttl,
        } as score);
    }

    async publishNewQuestion(question: Question): Promise<void> {
        await this.redisPub.publish(`quiz:${this.quizId}:newQuestion`, JSON.stringify({type: "NEW_QUESTION", payload:{id: question.id, question: question.question, options: question.options, timeLimit: question.timeLimit, marks: question.marks}} as WSMessage));
    }

    async publishUpdates(type: string, message: string): Promise<void> {
        if(type==="NEW_USER") {
            console.log("inside new users section");
            const payload: NewUserPayload = {
                user: JSON.parse(message) as UserPayload | HostPayload,
            }
            const m: WSMessage = {
                type,
                payload,
            }
            await this.redisPub.publish(`quiz:${this.quizId}:updates`, JSON.stringify(m));
        } else if(type==="QUIZ_STARTED") {
            console.log("inside quiz started section");
            const payload: QuizStartPayload = {
                message,
                quizId: this.quizId,
                attemptId: null,
            };
            const m: WSMessage = {
                type,
                payload,
            };
            await this.redisPub.publish(`quiz:${this.quizId}:updates`, JSON.stringify(m));
        } else {
            console.log("inside else");
            const payload: QuizUpdatePayload = {
                message,
                quizId: this.quizId,
            };
            const m: WSMessage = {
                type,
                payload,
            };
            await this.redisPub.publish(`quiz:${this.quizId}:updates`, JSON.stringify(m));
        }
    }

    async subscribe(handler1: (message: string) => void, handler2: (messsage: string) => void): Promise<void> {
        await this.redisSub.subscribe(`quiz:${this.quizId}:updates`, handler2);
        await this.redisSub.subscribe(`quiz:${this.quizId}:newQuestion`, handler1);
    }

    async unsubscribe(channel: string): Promise<void> {
        await this.redisSub.unsubscribe(`quiz:${this.quizId}:${channel}`);
    }

    async subscibeToExpiry(): Promise<void> {
        await this.redisSub.subscribe("__keyevent@0__:expired", async (key) => {
            if(key===`quiz:${this.quizId}:currentQuestion`) {
                const test = await this.addNewCurrentQuestion();
                if(!test) {
                    await this.redisSub.unsubscribe("__keyevent@0__:expired");
                    await this.unsubscribe("newQuestion");
                    await finishQuizHost(this.quizId);
                    await this.redisSub.quit();
                }
            }
        });
        console.log(`subscribed to expiry on `, server.address());
    }
}