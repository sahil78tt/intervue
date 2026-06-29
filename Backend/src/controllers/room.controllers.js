import { nanoid } from "nanoid";
import pool from "../configs/connect.js";

export const createRoom = async (req, res) => {
  try {
    const { name, language } = req.body;
    const ownerId = req.userId;

    if (!name) {
      return res.status(400).json({
        status: "error",
        message: "Room name is required",
      });
    }

    const shareLink = nanoid(10);

    const roomResult = await pool.query(
      `INSERT INTO rooms (name, owner_id, share_link, language)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, ownerId, shareLink, language || "javascript"],
    );

    const room = roomResult.rows[0];

    // Add creator as host in room_participants
    await pool.query(
      `INSERT INTO room_participants (room_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [room.id, ownerId, "host"],
    );

    return res.status(201).json({
      status: "success",
      message: "Room created successfully",
      data: { room },
    });
  } catch (error) {
    console.log("Create Room Error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { shareLink } = req.params;
    const userId = req.userId;

    // Find the room
    const roomResult = await pool.query(
      `SELECT * FROM rooms 
       WHERE share_link = $1 
         AND is_active = true 
         AND expires_at > NOW()`,
      [shareLink],
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Room not found or has expired",
      });
    }

    const room = roomResult.rows[0];

    // Add user as participant (ignore if already joined)
    await pool.query(
      `INSERT INTO room_participants (room_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (room_id, user_id) DO NOTHING`,
      [room.id, userId, "participant"],
    );

    return res.status(200).json({
      status: "success",
      message: "Joined room successfully",
      data: { room },
    });
  } catch (error) {
    console.log("Join Room Error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

export const getMyRooms = async (req, res) => {
  try {
    const userId = req.userId;

    const { rows } = await pool.query(
      `SELECT r.*, 
         (SELECT COUNT(*) FROM room_participants WHERE room_id = r.id) AS participant_count
       FROM rooms r
       WHERE r.owner_id = $1
         AND r.is_active = true
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [userId],
    );

    return res.status(200).json({
      status: "success",
      data: { rooms: rows },
    });
  } catch (error) {
    console.log("Get My Rooms Error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};
