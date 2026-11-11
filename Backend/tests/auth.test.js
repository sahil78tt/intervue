import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

vi.mock("../src/configs/connect.js", () => ({
  default: { query: vi.fn() },
  connectDB: vi.fn(),
}));

import pool from "../src/configs/connect.js";
import { buildApp, authHeader } from "./helpers/app.js";

const app = buildApp();

beforeEach(() => {
  pool.query.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("POST /api/auth/register", () => {
  const body = { username: "Sahil", email: "Sahil@Test.com", password: "secret123" };

  it("400 when a field is missing", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("All fields are required");
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("400 when password shorter than 6 chars", async () => {
    const res = await request(app).post("/api/auth/register").send({ ...body, password: "123" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 6/);
  });

  it("400 for invalid email", async () => {
    const res = await request(app).post("/api/auth/register").send({ ...body, email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid email/);
  });

  it("409 when user already exists", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: "x" }] });
    const res = await request(app).post("/api/auth/register").send(body);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("User already exists");
  });

  it("201 creates user, lowercases fields, hashes password, returns valid JWT", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: "u1", username: "sahil", email: "sahil@test.com", avatar_url: null }],
      });

    const res = await request(app).post("/api/auth/register").send(body);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.user.username).toBe("sahil");
    expect(jwt.verify(res.body.data.token, process.env.JWT_SECRET).id).toBe("u1");

    const insertArgs = pool.query.mock.calls[1][1];
    expect(insertArgs[0]).toBe("sahil");
    expect(insertArgs[1]).toBe("sahil@test.com");
    expect(insertArgs[2]).not.toBe("secret123"); // plain password store nahi hota
    expect(await bcrypt.compare("secret123", insertArgs[2])).toBe(true);
  });

  it("500 when DB throws", async () => {
    pool.query.mockRejectedValueOnce(new Error("db down"));
    const res = await request(app).post("/api/auth/register").send(body);
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Something went wrong");
  });
});

describe("POST /api/auth/login", () => {
  it("400 when email/password missing", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
  });

  it("400 for invalid email format", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "bad", password: "x" });
    expect(res.status).toBe(400);
  });

  it("401 when user not found", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post("/api/auth/login").send({ email: "a@b.com", password: "secret123" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("401 when password wrong (same message, no user enumeration)", async () => {
    const hash = await bcrypt.hash("right-pass", 4);
    pool.query.mockResolvedValueOnce({ rows: [{ id: "u1", password_hash: hash }] });
    const res = await request(app).post("/api/auth/login").send({ email: "a@b.com", password: "wrong-pass" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("200 returns user (without password_hash) and token", async () => {
    const hash = await bcrypt.hash("right-pass", 4);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: "u1", username: "sahil", email: "a@b.com", avatar_url: null, password_hash: hash }],
    });
    const res = await request(app).post("/api/auth/login").send({ email: "A@B.com", password: "right-pass" });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toEqual({ id: "u1", username: "sahil", email: "a@b.com", avatar_url: null });
    expect(res.body.data.user.password_hash).toBeUndefined();
    expect(jwt.verify(res.body.data.token, process.env.JWT_SECRET).id).toBe("u1");
    expect(pool.query.mock.calls[0][1]).toEqual(["a@b.com"]); // email lowercased
  });

  it("500 when DB throws", async () => {
    pool.query.mockRejectedValueOnce(new Error("db down"));
    const res = await request(app).post("/api/auth/login").send({ email: "a@b.com", password: "x" });
    expect(res.status).toBe(500);
  });
});

describe("GET /api/auth/me", () => {
  it("401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("404 when user no longer exists", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/api/auth/me").set(authHeader("ghost"));
    expect(res.status).toBe(404);
  });

  it("200 returns current user using id from token", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: "u1", username: "sahil", email: "a@b.com", avatar_url: null }],
    });
    const res = await request(app).get("/api/auth/me").set(authHeader("u1"));
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe("u1");
    expect(pool.query.mock.calls[0][1]).toEqual(["u1"]);
  });
});
