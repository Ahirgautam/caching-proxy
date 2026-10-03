# Caching Proxy

A lightweight Node.js HTTP proxy that forwards incoming requests to an upstream origin and caches successful GET/HEAD responses in Redis.

This project is useful for reducing repeated calls to external APIs and improving response times for read-heavy traffic.

inspiration from [roadmap.sh](https://roadmap.sh/projects/caching-server)
## Features

- Proxies requests from a local port to a configured origin server
- Caches successful GET and HEAD responses in Redis
- Adds `X-Cache: HIT` or `X-Cache: MISS` headers
- Supports cache clearing through a CLI flag
- Validates required startup arguments

## Tech Stack

- Node.js
- Redis
- Chalk for console output

## Prerequisites

Before running the project, make sure:

- Node.js is installed
- Redis is running locally on `localhost:6379`
- Dependencies are installed via `npm install`

## Installation

```bash
npm install
```

## Usage

Start the proxy with a local port and upstream origin:

```bash
node index.js --port 3000 --origin http://localhost:3001
```

This starts a proxy on port `3000` and forwards requests to `http://localhost:3001`.

### Clear cache

To clear the Redis cache before the server starts:

```bash
node index.js --clear-cache --port 3000 --origin http://localhost:3001
```

## How it works

1. The app reads `--port` and `--origin` from command-line arguments.
2. It connects to Redis.
3. For each incoming request:
   - if the request is `GET` or `HEAD`, it checks Redis for a cached response
   - if a cache hit is found, it returns the cached response with `X-Cache: HIT`
   - if no cache entry exists, it forwards the request to the upstream origin
4. The response is stored in Redis for 60 seconds.
5. Cache misses return the upstream response with `X-Cache: MISS`.

## Example flow

```bash
node index.js --port 3000 --origin https://dummyjson.com
```

Then request:

```bash
curl http://localhost:3000/products
```

The proxy forwards the request to `https://dummyjson.com/products` and caches the result.

## Project Structure

```text
caching-proxy/
├── config.redis.js   # Redis client configuration
├── index.js          # Main proxy server logic
├── package.json      # Script and dependency configuration
├── README.md         # Project documentation
└── node_modules/     # Installed dependencies
```

## Notes

- Cache entries are stored with a 60-second expiration.
- Only successful `GET` and `HEAD` replies are cached.
- The Redis connection URL is configured in `config.redis.js` as `redis://localhost:6379`.

## License

MIT