/**
 * Token bucket for short bursts on top of the sliding-window ceiling.
 *
 * KEYS[1]  redis key
 * ARGV[1]  capacity (burst)
 * ARGV[2]  refill tokens per window (policy.limit)
 * ARGV[3]  window milliseconds
 * ARGV[4]  now milliseconds
 *
 * Returns {allowed, tokens_after, retryAfterMs}
 */
export const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill = tonumber(ARGV[2])
local window = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local ts = tonumber(data[2])

if tokens == nil then
  tokens = capacity
  ts = now
end

local elapsed = math.max(0, now - ts)
local rate = refill / window
tokens = math.min(capacity, tokens + (elapsed * rate))
ts = now

local allowed = 0
local retry = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
else
  retry = math.ceil((1 - tokens) / rate)
end

redis.call('HSET', key, 'tokens', tokens, 'ts', ts)
redis.call('PEXPIRE', key, math.floor(window * 2))
return {allowed, tokens, retry}
`;
