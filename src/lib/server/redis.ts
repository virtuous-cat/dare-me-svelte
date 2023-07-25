import { REDIS_URL } from "$env/static/private";
import Redis from "ioredis";

const redis = new Redis(REDIS_URL);

redis.on('error', function (error) {
  console.log("error from lib redis")
  console.dir(error)
})

export default redis;
