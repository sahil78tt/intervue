import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../configs/connect.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

export const register = async (req, res) => {
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

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Please provide a valid email address",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email.toLowerCase(), username.toLowerCase()],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "User already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const now = new Date();

    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, avatar_url, created_at`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash, now],
    );

    const user = rows[0];
    const token = generateToken(user.id);

    return res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: { user, token },
    });
  } catch (error) {
    console.log("Register Error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Please provide a valid email address",
      });
    }

    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);

    if (rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    const user = rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user.id);

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar_url: user.avatar_url,
        },
        token,
      },
    });
  } catch (error) {
    console.log("Login Error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, username, email, avatar_url FROM users WHERE id = $1",
      [req.userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: { user: rows[0] },
    });
  } catch (error) {
    console.log("GetMe Error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};
