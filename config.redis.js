import { createClient } from "redis";

const redisClient = createClient({
    url: "redis://localhost:6379"
})

redisClient.on("error", (err) => {
    console.error("Error Message : ", err)
})

async function connectRedis() {
    await redisClient.connect();
    console.log("Connected to redis")
}

export {
    redisClient,
    connectRedis
}