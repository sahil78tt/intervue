import express from "express";
import { getHint } from "../controllers/hint.controllers.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";
import { hintLimiter } from "../middlewares/rateLimiters.js";

const router = express.Router();

router.post("/", isAuthorized, hintLimiter, getHint);

export default router;
