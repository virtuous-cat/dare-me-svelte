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

// Game State
// game:[code] Hash { turn, hostId, interaction, categories }

// Added Dares
// game:[code]:dares Set of dareIds

// Players
// game:[code]:players Set of playerIds

// Player entries
// game:[code]:player:[playerId] Hash { playerName, playerId, dares(stringified) }

// Players daree turns
// game:[code]:turns Sorted Set member = playerId, score = # of daree turns player has had

// Players ready status
// game:[code]:ready Sorted Set member = playerId, score = 1 if ready, 0 if not ready

// Kicked Players
// game:[code]:kicked Set of playerIds
