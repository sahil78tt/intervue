import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./configs/connect.js";

// Configs
dotenv.config({ quiet: true });

// App
const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cors());

// Routes
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "API is running 🚀",
  });
});

// Server
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server failed to start:", error.message);
    process.exit(1);
  }
};

startServer();
