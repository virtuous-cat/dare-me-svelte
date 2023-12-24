local turns_key = KEYS[1]
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
