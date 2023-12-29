import { GameDareSchema, type GameDare } from "$lib/db.types";
import { GameSyncSchema, PlayerSchema, type Players } from "$lib/game.types";
import { DEFAULT_EXPIRE } from "$lib/server/redis";
import Redis, { type Callback, type Result } from "ioredis";

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
// game:[code] Hash { turn, darer, daree, previousDaree, hostId, interaction, categories }

// Current Dare
// game:[code]:current-dare Hash GameDare

// Added Dares
// game:[code]:dares Set of dareIds

// Players
// game:[code]:players List of playerIds

// Player entries
// game:[code]:player:[playerId] Hash { playerName, playerId, dares(stringified) }

// Players daree turns
// game:[code]:turns Sorted Set member = playerId, score = # of daree turns player has had

// Players ready status
// game:[code]:ready Sorted Set member = playerId, score = 1 if ready, 0 if not ready

// Kicked Players
// game:[code]:kicked Set of playerIds

// Disconnected Players
// game:[code]:disco Set of playerIds

// TODO: Figure out calling script from external file
redis.defineCommand("selectDaree", {
  numberOfKeys: 6,
  lua: `local turns_key = KEYS[1]
  local ready_key = KEYS[2]
  local turns_subset_key = KEYS[3]
  local ready_subset_key = KEYS[4]
  local intersect_key = KEYS[5]
  local game_hash_key = KEYS[6]
  local total_ready = tonumber(redis.call("ZRANGESTORE", ready_subset_key, ready_key, 1, 1, BYSCORE))
  if total_ready < 1 then
    return nil
  end
  local darer = redis.call("HGET", game_hash_key, "darer")
  local turns = tonumber(redis.call("HGET", game_hash_key, "turns"))
  local total_players = tonumber(redis.call("ZCARD", turns_key))
  if turns == 0 or total_players <= 3 then
    local removed = redis.call("ZREM", ready_subset_key, darer)
    if total_ready - removed < 1 then
      return nil
    end
    return redis.call("ZRANDMEMBER", ready_subset_key)
  end 
  local prev_daree = redis.call("HGET", game_hash_key, "previousDaree")
  local removed = tonumber(redis.call("ZREM", ready_subset_key, darer, prev_daree))
  if total_ready - removed < 1 then
    if tonumber(redis.call("ZSCORE", ready_key, prev_daree)) == 1 then
      return prev_daree
    else
      return nil
    end
  end
  if turns < 3 or total_ready - removed == 1 then
    return redis.call("ZRANDMEMBER", ready_subset_key)
  end
  local average_turns = math.ceil(turns / total_players)
  if average_turns <= 2 then
    redis.call("ZRANGESTORE", turns_subset_key, turns_key, 0, 2, BYSCORE)
  else
    redis.call("ZRANGESTORE", turns_subset_key, turns_key, 0, average_turns, BYSCORE)
  end
  local intersected = tonumber(redis.call("ZINTERSTORE", intersect_key, 2, ready_subset_key, turns_subset_key))
  if intersected < 1 then
    return redis.call("ZRANDMEMBER", ready_subset_key)
  end
  return redis.call("ZRANDMEMBER", intersect_key)
  `,
});

declare module "ioredis" {
  interface RedisCommander<Context> {
    selectDaree(
      key1: string,
      key2: string,
      key3: string,
      key4: string,
      key5: string,
      key6: string,
      callback?: Callback<string | null>
    ): Result<string | null, Context>;
  }
}

export const getNewDaree = async (gameRoom: string) => {
  try {
    for (let tries = 0; tries <= 10; tries++) {
      const daree = await redis.selectDaree(
        `game:${gameRoom}:turns`,
        `game:${gameRoom}:ready`,
        `game:${gameRoom}:turns-subset`,
        `game:${gameRoom}:ready-subset`,
        `game:${gameRoom}:daree-intersect`,
        `game:${gameRoom}`
      );
      if (daree) {
        return daree;
      }
    }
    return "Players are not ready.";
  } catch (error) {
    console.error(error);
    return "An error occurred, please try again.";
  }
};

export const getFullGameState = async (gameRoom: string) => {
  try {
    const gameState = await redis.hgetall(`game:${gameRoom}`);
    const baseState = GameSyncSchema.parse(gameState);
    const playerList = await redis.lrange(`game:${gameRoom}:players`, 0, -1);
    const pipeline = redis.pipeline();
    playerList.forEach((playerId) => {
      pipeline.hgetall(`game:${gameRoom}:player:${playerId}`);
    });
    const results = await pipeline.exec();
    if (!results) {
      throw new Error("no results from pipeline");
    }
    const players: Players = results.map((errResultArray) => {
      if (errResultArray[0]) {
        throw errResultArray[0];
      }
      const player = PlayerSchema.parse(errResultArray[1]);
      return [player.playerId, player];
    });
    return { ...baseState, players };
  } catch (error) {
    console.error(error);
  }
};

export const getHostId = async (gameRoom: string) => {
  try {
    return await redis.hget(`game:${gameRoom}`, "hostId");
  } catch (error) {
    console.error(error);
  }
};

export const getPlayerDares = async ({
  playerId,
  gameRoom,
}: {
  playerId: string;
  gameRoom: string;
}) => {
  try {
    const rawDares = await redis.hget(
      `game:${gameRoom}:player:${playerId}`,
      "dares"
    );
    if (!rawDares) {
      throw new Error("No dares found for player");
    }
    const dares = GameDareSchema.array().parse(JSON.parse(rawDares));
    return dares;
  } catch (error) {
    console.error(error);
    return "An error occurred, please try again.";
  }
};

export const addNewPlayer = async ({
  playerName,
  playerId,
  gameRoom,
}: {
  playerName: string;
  playerId: string;
  gameRoom: string;
}) => {
  try {
    const player = await redis
      .multi()
      .hset(`game:${gameRoom}:player:${playerId}`, {
        playerId,
        playerName,
      })
      .expire(`game:${gameRoom}:player:${playerId}`, DEFAULT_EXPIRE)
      .zadd(`game:${gameRoom}:ready`, 0, playerId)
      .zadd(`game:${gameRoom}:turns`, "NX", 0, playerId)
      .exec();
    if (!player || !player[0][1]) {
      throw new Error("Failed to save player in redis");
    }
    return;
  } catch (error) {
    console.error(error);
    return "ERROR";
  }
};

export const updateReady = async ({
  dares,
  playerId,
  gameRoom,
}: {
  dares: GameDare[];
  playerId: string;
  gameRoom: string;
}) => {
  if (
    dares.length >= 3 &&
    dares.filter(({ partnered }) => !partnered).length >= 2
  ) {
    const ready = await redis.zadd(`game:${gameRoom}:ready`, 1, playerId);
    return true;
  }
  const ready = await redis.zadd(`game:${gameRoom}:ready`, 0, playerId);
  return false;
};

export const updateDares = async ({
  dares,
  playerId,
  gameRoom,
}: {
  dares: GameDare[];
  playerId: string;
  gameRoom: string;
}) => {
  try {
    const dbDares = JSON.stringify(dares);
    const saved = await redis.hset(
      `game:${gameRoom}:player:${playerId}`,
      "dares",
      dbDares
    );
    if (!saved) {
      throw new Error("Failed to save dares in redis");
    }
    return updateReady({ dares, playerId, gameRoom });
  } catch (error) {
    console.error(error);
    return "An error occurred, please try again.";
  }
};

export const checkKicked = async ({
  playerName,
  gameRoom,
}: {
  playerName: string;
  gameRoom: string;
}) => {
  const wasKicked = await redis.sismember(
    `game:${gameRoom}:kicked`,
    playerName
  );
  return wasKicked === 1;
};

export const checkDisco = async ({
  playerId,
  gameRoom,
}: {
  playerId: string;
  gameRoom: string;
}) => {
  const wasDisco = await redis.sismember(`game:${gameRoom}:disco`, playerId);
  return wasDisco === 1;
};

export const unDisco = async ({
  playerId,
  gameRoom,
}: {
  playerId: string;
  gameRoom: string;
}) => {
  try {
    const moved = await redis.smove(
      `game:${gameRoom}:disco`,
      `game:${gameRoom}:players`,
      playerId
    );
    if (moved === 1) {
      return true;
    }
    const exists = await redis.sismember(`game:${gameRoom}:players`, playerId);
    if (exists === 1) {
      return true;
    }
    const lastTry = await redis.sadd(`game:${gameRoom}:players`, playerId);
    if (lastTry !== 1) {
      throw new Error(
        "Failed to move disconnected player back to players list"
      );
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const setDisco = async ({
  playerId,
  gameRoom,
}: {
  playerId: string;
  gameRoom: string;
}) => {
  // remove from ready and players, leave player entry and turns
  await redis.smove(
    `game:${gameRoom}:players`,
    `game:${gameRoom}:disco`,
    playerId
  );
  await redis.zrem(`game:${gameRoom}:ready`, playerId);
};

export const expireGameKeys = async (gameRoom: string) => {
  try {
    await redis
      .pipeline()
      .expire(`game:${gameRoom}`, DEFAULT_EXPIRE)
      .expire(`game:${gameRoom}:players`, DEFAULT_EXPIRE)
      .expire(`game:${gameRoom}:ready`, DEFAULT_EXPIRE)
      .expire(`game:${gameRoom}:turns`, DEFAULT_EXPIRE)
      .expire(`game:${gameRoom}:disco`, DEFAULT_EXPIRE)
      .expire(`game:${gameRoom}:current-dare`, DEFAULT_EXPIRE)
      .expire(`game:${gameRoom}:kicked`, DEFAULT_EXPIRE)
      .expire(`game:${gameRoom}:dares`, DEFAULT_EXPIRE)
      .exec();
  } catch (error) {
    console.error(error);
  }
};
