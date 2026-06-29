import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../configs/connect.js";
import dotenv from "dotenv";

// Generate token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

export const register = async (req, res) => {
  console.log("JWT:", process.env.JWT_SECRET);
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Please provide a valid email address",
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email, username],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "User with this email or username already exists",
      });
    }

    // Hashing password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert User in DB
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, avatar_url, created_at`,
      [username, email, passwordHash],
    );

    const user = rows[0];
    const token = generateToken(user.id);

    return res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: { user, token },
    });
  } catch (error) {
    console.error("❌ Register Error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
