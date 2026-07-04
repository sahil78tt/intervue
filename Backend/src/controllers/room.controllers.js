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

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const roomResult = await pool.query(
      `INSERT INTO rooms (name, owner_id, share_link, language, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, ownerId, shareLink, language || "javascript", now, expiresAt],
    );

    const room = roomResult.rows[0];

    // Add creator as host in room_participants
    await pool.query(
      `INSERT INTO room_participants (room_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, $4)`,
      [room.id, ownerId, "host", new Date()],
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

    // Use JS Date instead of NOW() for expiration check
    const now = new Date();

    const roomResult = await pool.query(
      `SELECT * FROM rooms 
       WHERE share_link = $1 
         AND is_active = true 
         AND expires_at > $2`,
      [shareLink, now],
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Room not found or has expired",
      });
    }

    const room = roomResult.rows[0];

    await pool.query(
      `INSERT INTO room_participants (room_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (room_id, user_id) DO NOTHING`,
      [room.id, userId, "participant", now],
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

export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = await pool.query(
      `UPDATE rooms 
       SET is_active = false 
       WHERE id = $1 AND owner_id = $2
       RETURNING id`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Room not found or you are not the owner",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Room deleted successfully",
    });
  } catch (error) {
    console.log("Delete Room Error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

export const getRoomByShareLink = async (req, res) => {
  try {
    const { shareLink } = req.params;
    const userId = req.userId;

    // Use JS Date instead of NOW()
    const now = new Date();

    const roomResult = await pool.query(
      `SELECT * FROM rooms 
       WHERE share_link = $1 
         AND is_active = true 
         AND expires_at > $2`,
      [shareLink, now],
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Room not found or has expired",
      });
    }

    const room = roomResult.rows[0];

    const participantCheck = await pool.query(
      `SELECT role FROM room_participants
       WHERE room_id = $1 AND user_id = $2`,
      [room.id, userId],
    );

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({
        status: "error",
        message: "You are not a member of this room. Please join first.",
      });
    }

    const role = participantCheck.rows[0].role;

    return res.status(200).json({
      status: "success",
      data: {
        room: room,
        role: role,
      },
    });
  } catch (error) {
    console.log("Get Room Error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

export const updateProblem = async (req, res) => {
  try {
    const { shareLink } = req.params;
    const { problem_statement } = req.body;
    const userId = req.userId;

    const result = await pool.query(
      `UPDATE rooms 
       SET problem_statement = $1
       WHERE share_link = $2 AND owner_id = $3
       RETURNING *`,
      [problem_statement, shareLink, userId],
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        status: "error",
        message: "You are not the host of this room",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Problem updated successfully",
      data: { room: result.rows[0] },
    });
  } catch (error) {
    console.log("Update Problem Error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};
