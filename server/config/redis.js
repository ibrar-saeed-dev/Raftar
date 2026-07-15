const redis = require('redis');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/redis.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

let client = null;

const connectRedis = async () => {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL,
      password: process.env.REDIS_PASSWORD,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            logger.error('Redis connection failed after 5 retries');
            return new Error('Redis connection failed');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    client.on('error', (err) => {
      logger.error(`Redis Error: ${err.message}`);
    });

    client.on('connect', () => {
      logger.info('Redis Connected');
    });

    await client.connect();
    return client;
  } catch (error) {
    logger.error(`Redis Connection Error: ${error.message}`);
    return null;
  }
};

const getRedisClient = () => client;

const cacheData = async (key, data, expiry = 3600) => {
  try {
    if (!client) return false;
    await client.setEx(key, expiry, JSON.stringify(data));
    return true;
  } catch (error) {
    logger.error(`Cache Error: ${error.message}`);
    return false;
  }
};

const getCachedData = async (key) => {
  try {
    if (!client) return null;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Get Cache Error: ${error.message}`);
    return null;
  }
};

const invalidateCache = async (pattern) => {
  try {
    if (!client) return false;
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return true;
  } catch (error) {
    logger.error(`Invalidate Cache Error: ${error.message}`);
    return false;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  cacheData,
  getCachedData,
  invalidateCache
};