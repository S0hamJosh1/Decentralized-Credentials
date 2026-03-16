import rateLimit from "express-rate-limit";

function isRateLimitDisabled() {
  return process.env.NODE_ENV === "test" || String(process.env.DISABLE_RATE_LIMITS || "").toLowerCase() === "true";
}

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max: isRateLimitDisabled() ? 0 : max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isRateLimitDisabled,
    message: {
      error: message,
    },
  });
}

export const authRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many authentication attempts. Please wait a few minutes and try again.",
});

export const passwordResetRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: "Too many password reset attempts. Please wait a few minutes and try again.",
});

export const verifyRateLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  max: 120,
  message: "Too many verification requests. Please slow down and try again shortly.",
});
