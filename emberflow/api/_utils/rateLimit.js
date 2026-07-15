const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function rateLimit(req, res, options = {}) {
  const {
    limit = 10,
    windowSeconds = 60,
    prefix = "global",
  } = options;

  const ip =
    (req.headers["x-forwarded-for"] || "")
      .split(",")[0]
      .trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const key = `${prefix}:${ip}`;

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    const remaining = Math.max(0, limit - count);

    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(remaining));

    if (count > limit) {
      res.setHeader("Retry-After", String(windowSeconds));

      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");

      res.end(
        JSON.stringify({
          error: "Too many requests. Please try again later.",
        })
      );

      return false;
    }

    return true;
  } catch (err) {
    console.error("Rate limiter error:", err);

    // Fail open: don't block legitimate users if Redis is temporarily unavailable.
    return true;
  }
}

module.exports = {
  rateLimit,
};