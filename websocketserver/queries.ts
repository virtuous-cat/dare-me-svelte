import Redis, { Callback, Result } from "ioredis";
import { error } from "node:console";

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
  if turns == 0 then
    redis.call("ZREM", ready_subset_key, darer)
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
  local total_players = tonumber(redic.call("ZCARD", turns_key))
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
