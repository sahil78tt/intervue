import express from "express";
import {
  executeCode,
  getSupportedLanguages,
} from "../controllers/execution.controllers.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";

const router = express.Router();

router.get("/languages", isAuthorized, getSupportedLanguages);
router.post("/", isAuthorized, executeCode);

export default router;
