import express from "express";
const router = express.Router();
import {
  login,
  logout,
  register,
  me,
} from "../controllers/auth.controllers.js";

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/me", me);

export default router;
