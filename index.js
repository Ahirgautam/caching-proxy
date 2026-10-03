import http from "node:http";
import chalk from "chalk";
import { redisClient, connectRedis } from "./config.redis.js";

const args = process.argv.slice(2);

function logMessage(message, color = chalk.red) {
    console.log(color(message));
}

if (args.includes("--clear-cache")) {
    try {
        await connectRedis();
        await redisClient.flushDb();
        logMessage("Cache cleared successfully", chalk.green);
    } catch (err) {
        logMessage(`Failed to clear cache: ${err.message}`, chalk.red);
    }
}

const portFlagIndex = args.indexOf("--port");
const originFlagIndex = args.indexOf("--origin");

if (portFlagIndex === -1 || originFlagIndex === -1) {
    logMessage("Please provide both --port and --origin");
    process.exit(1);
}

const port = Number(args[portFlagIndex + 1]);
const origin = args[originFlagIndex + 1];

if (!Number.isInteger(port) || port <= 0) {
    logMessage("Please provide a valid port");
    process.exit(1);
}

if (!origin || !/^https?:\/\//.test(origin)) {
    logMessage("Please provide a valid origin in the format http://host:port or https://host:port");
    process.exit(1);
}

try {
    await connectRedis();
} catch (err) {
    logMessage(`Failed to connect to Redis: ${err.message}`, chalk.red);
    process.exit(1);
}

const server = http.createServer(async (req, res) => {
    try {
        const targetUrl = new URL(req.url, origin).toString();
        const cacheKey = `${req.method}:${targetUrl}`;

        if (req.method === "GET" || req.method === "HEAD") {
            const cachedResponse = await redisClient.get(cacheKey);
            if (cachedResponse) {
                res.writeHead(200, {
                    "X-Cache": "HIT",
                });
                return res.end(cachedResponse);
            }
        }

        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }

        const requestBody = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
        const upstreamResponse = await fetch(targetUrl, {
            method: req.method,
            headers: {
                ...req.headers,
                host: undefined,
            },
            body: requestBody,
        });

        const responseText = await upstreamResponse.text();

        if ((req.method === "GET" || req.method === "HEAD") && upstreamResponse.ok) {
            await redisClient.set(cacheKey, responseText, { EX: 60 });
        }

        const responseHeaders = {
            "X-Cache": "MISS",
        };

        upstreamResponse.headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            if (!["transfer-encoding", "connection", "content-length"].includes(lowerKey)) {
                responseHeaders[key] = value;
            }
        });

        res.writeHead(upstreamResponse.status, responseHeaders);
        res.end(responseText);
    } catch (error) {
        res.writeHead(502, {
            "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ error: "Bad Gateway", message: error.message }));
    }
});

server.listen(port, () => {
    console.log(`Proxy running at http://localhost:${port}`);
});