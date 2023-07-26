import Redis from "ioredis";

const url = process.env.REDIS_URL;

if (!url) {
  throw new Error("No REDIS_URL from env");
}

const redis = new Redis(url);

redis.on("error", function (error) {
  console.log("error from server redis");
  console.dir(error);
});
