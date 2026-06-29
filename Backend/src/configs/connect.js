import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
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
