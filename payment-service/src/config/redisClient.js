const redis = require("redis");

// Connect using the REDIS_URL from your .env
const redisClient = redis.createClient({ url: process.env.REDIS_URL, });

// Log any connection errors
redisClient.on("error", (err) => console.log("Redis Client Error", err));

// Establish the connection
(async () => {
    try {
        await redisClient.connect();
        console.log("Connected to Redis");

    } catch (error) {
        console.error("Failed to connect to Redis", error);

    }
})();

module.exports = redisClient;