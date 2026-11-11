import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    env: {
      JWT_SECRET: "test-secret",
      JWT_EXPIRES_IN: "1h",
      JDOODLE_CLIENT_ID: "test-id",
      JDOODLE_CLIENT_SECRET: "test-secret",
      GROQ_API_KEY: "test-groq-key",
      NODE_ENV: "test",
    },
  },
});
