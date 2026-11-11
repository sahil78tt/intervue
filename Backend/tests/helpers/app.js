import express from "express";
import jwt from "jsonwebtoken";
import authRoutes from "../../src/routes/auth.routes.js";
import roomRoutes from "../../src/routes/room.routes.js";
import executeRoutes from "../../src/routes/execution.routes.js";
import hintRoutes from "../../src/routes/hint.routes.js";

// server.js auto-start hota hai (DB connect + listen), isliye test me
// same routes ko ek fresh express app pe mount karte hain.
export const buildApp = () => {
  const app = express();
  app.use(express.json({ limit: "100kb" }));
  app.use("/api/auth", authRoutes);
  app.use("/api/rooms", roomRoutes);
  app.use("/api/execute", executeRoutes);
  app.use("/api/hint", hintRoutes);
  return app;
};

export const makeToken = (id = "user-1", secret = process.env.JWT_SECRET, opts = {}) =>
  jwt.sign({ id }, secret, { expiresIn: "1h", ...opts });

export const authHeader = (id = "user-1") => ({
  Authorization: `Bearer ${makeToken(id)}`,
});
