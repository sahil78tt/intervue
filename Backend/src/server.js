import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./configs/connect.js";
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";
import executeRoutes from "./routes/execution.routes.js";

// Configs
dotenv.config({ quiet: true });

// App
const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cors());

// Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "API is running 🚀",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/execute", executeRoutes);

// Socket Connection
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", function (socket) {
  console.log("✅ User connected:", socket.id);

  socket.on("disconnect", function () {
    console.log("❌ User disconnected:", socket.id);
  });
});

// Server
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await connectDB();
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  }
};

startServer();
