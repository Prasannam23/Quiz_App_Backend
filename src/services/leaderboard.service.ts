import { RedisClientType } from "redis";
import { ILeaderBoardService, LeaderBoardEntry } from "../types/types";

class LeaderBoardService implements ILeaderBoardService {
    private redisPub: RedisClientType;
    private redisSub: RedisClientType;
    private leaderBoardKey: string;
    private pubsubChannelPrefix: string;
    private quizId: string;

    constructor(redisPub: RedisClientType, redisSub: RedisClientType, leaderBoardKey: string, pubsubChannelPrefix: string, quizId: string) {
        this.redisPub = redisPub;
        this.redisSub = redisSub;
        this.leaderBoardKey = leaderBoardKey;
        this.pubsubChannelPrefix = pubsubChannelPrefix;
        this.quizId = quizId;
    }

    async addMember(userId: string, score: number): Promise<void> {
        await this.redisPub.zAdd(this.leaderBoardKey, { score, value: userId});
    }

    async incrementScore(userId: string, incrementBy: number): Promise<number> {
        const newScore = await this.redisPub.zIncrBy(this.leaderBoardKey, incrementBy, userId);
        return newScore;
    }

    async getTopPlayers(count: number): Promise<LeaderBoardEntry[]> {
        const players: LeaderBoardEntry[] = await this.redisPub.zRangeWithScores(this.leaderBoardKey, 0, count-1, {REV: true});
        return players;
    }

    async getPlayersInRange(startRank: number, count: number): Promise<LeaderBoardEntry[]> {
        const players: LeaderBoardEntry[] = await this.redisPub.zRangeWithScores(this.leaderBoardKey, startRank-1, startRank+count-2, {REV: true});
        return players;
    }

    async getScore(userId: string): Promise<number | null> {
        const score = await this.redisPub.zScore(this.leaderBoardKey, userId);
        return score;
    }

    async getRank(userId: string): Promise<number | null> {
        const rank = await this.redisPub.zRank(this.leaderBoardKey, userId);
        return rank;
    }

    async size(): Promise<number> {
        return await this.redisPub.zCard(this.leaderBoardKey);
    }

    async removeMember(userId: string): Promise<boolean> {
        const removedCount = await this.redisPub.zRem(this.leaderBoardKey, userId);
        return removedCount>0;
    }

    async publishUpdates(channel: string, message: string): Promise<void> {
        await this.redisPub.publish(this.pubsubChannelPrefix+'_'+channel, message);
    }

    async subscribeToUpdates(channel: string, handler: (message: string) => void): Promise<void> {
        await this.redisSub.subscribe(this.pubsubChannelPrefix+'_'+channel, handler);
    }

    async unsubscribeToUpdates(channel: string): Promise<void> {
        await this.redisSub.unsubscribe(this.pubsubChannelPrefix+'_'+channel);
    }
}

export default LeaderBoardService;