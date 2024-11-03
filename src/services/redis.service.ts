import { RedisClientType } from "redis";
import prisma from "../config/db";
import { IRedisService, UserPayload, HostPayload } from "../types/types";
import { redisClient } from "../config/redis";

class RedisService implements IRedisService {
  private client: RedisClientType;

  constructor(client: RedisClientType) {
    this.client = client;
  }

  async getUsersInRoom(quizId: string): Promise<UserPayload[]> {
    const userStrings = await this.client.sMembers(`quiz:${quizId}`);
    const users = userStrings.map((str) => JSON.parse(str));
    return (users as UserPayload[]);
  }

  async addUsertoRoom(user: UserPayload | HostPayload, quizId: string): Promise<void> {
    try {
      await this.client.sAdd(`quiz:${quizId}`, [JSON.stringify(user)]);
      console.log("Added user to ")
    } catch (error) {
      console.error("Error adding user to room.", (error as Error).message);
    }
   }

  async checkIfUserInRoom(userId: string, quizId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({where:{id: userId}, select: {id: true, firstName: true, lastName: true, avatar: true, email: true }});
    if(!user) return false;
    const userPayload: UserPayload = {
      id: user.id,
      name: user.firstName + " " + user.lastName,
      avatar: user.avatar || "No-avatar",
      email: user.email
    };
    const isMember = await this.client.sIsMember(`quiz:${quizId}`, JSON.stringify(userPayload));
    return isMember>0;
  }

  async removeUserFromRoom(userId: string, quizId: string): Promise<void> {
    const user = await prisma.user.findUnique({where:{id: userId}, select: {id: true, firstName: true, lastName: true, avatar: true, email: true }});
    if(!user) return;
    const userPayload: UserPayload = {
      id: user.id,
      name: user.firstName + " " + user.lastName,
      avatar: user.avatar || "No-avatar",
      email: user.email
    };
    await this.client.sRem(`quiz:${quizId}`, JSON.stringify(userPayload));
  }

};

export const redisService = new RedisService(redisClient as RedisClientType);