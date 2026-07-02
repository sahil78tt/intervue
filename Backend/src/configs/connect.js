import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", function (err) {
  console.log("⚠️  Pool error (idle client died):", err.message);
});

pool.on("connect", function (client) {
  client.on("error", function (err) {
    console.log("⚠️  Client error:", err.message);
  });
});

export const connectDB = async () => {
  try {
    await pool.connect();
    console.log("✅ Neon PostgreSQL Connected Successfully");
  } catch (err) {
    console.error("❌ Database Connection Failed:", err.message);
    process.exit(1);
  }
};

export default pool;
