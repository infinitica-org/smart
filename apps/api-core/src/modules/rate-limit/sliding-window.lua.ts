/**
 * Sliding-window counter. Runs atomically in Redis so two concurrent requests
 * cannot both observe "one slot left" and both proceed.
 *
 * KEYS[1]  redis key
 * ARGV[1]  limit
 * ARGV[2]  window milliseconds
 * ARGV[3]  now milliseconds
 * ARGV[4]  unique member
 *
 * Returns {allowed, count, retryAfterMs}
 */
export const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)

if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry = window
  if oldest[2] then
    retry = math.max(0, (tonumber(oldest[2]) + window) - now)
  end
  return {0, count, retry}
end

redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {1, count + 1, 0}
`;
