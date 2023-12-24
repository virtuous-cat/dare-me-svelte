import { GameDareSchema } from "$lib/db.types";
import { GameSyncSchema, PlayerSchema, type Players } from "$lib/game.types";
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
    const playerList = await redis.lrange(`game:${gameRoom}:Players`, 0, -1);
    const pipeline = redis.pipeline();
    playerList.forEach((playerId) => {
      pipeline.hgetall(`game:${gameRoom}:Player:${playerId}`);
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

export const getPlayerDares = async ({
  playerId,
  gameRoom,
}: {
  playerId: string;
  gameRoom: string;
}) => {
  try {
    const rawDares = await redis.hget(
      `game:${gameRoom}:Player:${playerId}`,
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
