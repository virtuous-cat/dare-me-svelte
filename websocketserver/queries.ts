import Redis from "ioredis";

const url = process.env.REDIS_URL;

if (!url) {
  throw new Error("No REDIS_URL from env");
}

const redis = new Redis(url);
