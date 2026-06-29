import express from "express";
import { register, login, getMe } from "../controllers/auth.controllers.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", isAuthorized, getMe);

export default router;
