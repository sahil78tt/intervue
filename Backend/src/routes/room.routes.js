import express from "express";
import {
  createRoom,
  joinRoom,
  getMyRooms,
  deleteRoom,
  getRoomByShareLink,
  updateProblem,
} from "../controllers/room.controllers.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";

const router = express.Router();

router.post("/", isAuthorized, createRoom);
router.post("/join/:shareLink", isAuthorized, joinRoom);
router.get("/my", isAuthorized, getMyRooms);
router.get("/:shareLink", isAuthorized, getRoomByShareLink);
router.patch("/:shareLink/problem", isAuthorized, updateProblem);
router.delete("/:id", isAuthorized, deleteRoom);

export default router;
