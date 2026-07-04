import rateLimit from "express-rate-limit";

export const hintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: function (req) {
    return req.userId;
  },
  message: {
    status: "error",
    message: "You have used too many hints this hour. Try again later.",
  },
});
