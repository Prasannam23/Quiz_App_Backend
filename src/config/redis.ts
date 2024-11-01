import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({ url: redisUrl });

export const redisPub = createClient({ url: redisUrl });
export const redisSub = createClient({ url: redisUrl });

[redisClient, redisPub, redisSub].forEach((client, idx) => {
  client.on('error', (err) => {
    console.error(` Redis Client ${idx} error:`, err);
  });

  client.on('connect', () => {
    console.log(` Redis Client ${idx} connected`);
  });
});

export const connectRedis = async () => {
  try {
    await Promise.all([
      redisClient.connect(),
      redisPub.connect(),
      redisSub.connect(),
    ]);
    await redisPub.configSet('notify-keyspace-events', 'Ex');
    console.log('✅ Redis keyspace notifications enabled for expired keys');
    console.log('🔗 All Redis clients connected');
  } catch (err) {
    console.error(' Redis connection error:', err);
  }
};
