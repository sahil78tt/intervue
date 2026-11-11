import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

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

describe("auth guard on all room routes", () => {
  it.each([
    ["post", "/api/rooms"],
    ["post", "/api/rooms/join/abc"],
    ["get", "/api/rooms/my"],
    ["get", "/api/rooms/abc"],
    ["patch", "/api/rooms/abc/problem"],
    ["delete", "/api/rooms/1"],
  ])("%s %s -> 401 without token", async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe("POST /api/rooms (create)", () => {
  it("400 when name missing", async () => {
    const res = await request(app).post("/api/rooms").set(authHeader()).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Room name is required");
  });

  it("201 creates room, defaults language, 24h expiry, adds creator as host", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: "r1", name: "Round 1", share_link: "x" }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post("/api/rooms").set(authHeader("owner-1")).send({ name: "Round 1" });

    expect(res.status).toBe(201);
    expect(res.body.data.room.id).toBe("r1");

    const [, args] = pool.query.mock.calls[0];
    expect(args[0]).toBe("Round 1");
    expect(args[1]).toBe("owner-1");
    expect(args[2]).toHaveLength(10); // nanoid(10)
    expect(args[3]).toBe("javascript"); // default language
    expect(args[5].getTime() - args[4].getTime()).toBe(24 * 60 * 60 * 1000);

    const [, partArgs] = pool.query.mock.calls[1];
    expect(partArgs[0]).toBe("r1");
    expect(partArgs[1]).toBe("owner-1");
    expect(partArgs[2]).toBe("host");
  });

  it("uses language from body when given", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: "r1" }] }).mockResolvedValueOnce({ rows: [] });
    await request(app).post("/api/rooms").set(authHeader()).send({ name: "R", language: "python" });
    expect(pool.query.mock.calls[0][1][3]).toBe("python");
  });

  it("500 when DB fails", async () => {
    pool.query.mockRejectedValueOnce(new Error("boom"));
    const res = await request(app).post("/api/rooms").set(authHeader()).send({ name: "R" });
    expect(res.status).toBe(500);
  });
});

describe("POST /api/rooms/join/:shareLink", () => {
  it("404 when room missing/expired", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post("/api/rooms/join/nope").set(authHeader());
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Room not found or has expired");
  });

  it("200 joins as participant", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: "r1", share_link: "abc" }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post("/api/rooms/join/abc").set(authHeader("guest-1"));
    expect(res.status).toBe(200);
    expect(res.body.data.room.id).toBe("r1");
    expect(pool.query.mock.calls[0][1][0]).toBe("abc");
    expect(pool.query.mock.calls[1][1].slice(0, 3)).toEqual(["r1", "guest-1", "participant"]);
  });

  it("500 when DB fails", async () => {
    pool.query.mockRejectedValueOnce(new Error("boom"));
    const res = await request(app).post("/api/rooms/join/abc").set(authHeader());
    expect(res.status).toBe(500);
  });
});

describe("GET /api/rooms/my", () => {
  it("200 returns only the caller's rooms", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: "r1" }, { id: "r2" }] });
    const res = await request(app).get("/api/rooms/my").set(authHeader("owner-1"));
    expect(res.status).toBe(200);
    expect(res.body.data.rooms).toHaveLength(2);
    expect(pool.query.mock.calls[0][1]).toEqual(["owner-1"]);
  });

  it("500 on DB error", async () => {
    pool.query.mockRejectedValueOnce(new Error("boom"));
    const res = await request(app).get("/api/rooms/my").set(authHeader());
    expect(res.status).toBe(500);
  });
});

describe("GET /api/rooms/:shareLink", () => {
  it("404 when room not found", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/api/rooms/abc").set(authHeader());
    expect(res.status).toBe(404);
  });

  it("403 when user never joined (RBAC check)", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: "r1" }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/api/rooms/abc").set(authHeader("stranger"));
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/not a member/);
  });

  it("200 returns room and the user's role", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: "r1", share_link: "abc" }] })
      .mockResolvedValueOnce({ rows: [{ role: "host" }] });
    const res = await request(app).get("/api/rooms/abc").set(authHeader("owner-1"));
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("host");
    expect(res.body.data.room.id).toBe("r1");
    expect(pool.query.mock.calls[1][1]).toEqual(["r1", "owner-1"]);
  });
});

describe("PATCH /api/rooms/:shareLink/problem", () => {
  it("403 when caller is not the host", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch("/api/rooms/abc/problem")
      .set(authHeader("guest"))
      .send({ problem_statement: "Two Sum" });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe("You are not the host of this room");
  });

  it("200 host updates problem; query scoped by owner_id", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: "r1", problem_statement: "Two Sum" }] });
    const res = await request(app)
      .patch("/api/rooms/abc/problem")
      .set(authHeader("owner-1"))
      .send({ problem_statement: "Two Sum" });
    expect(res.status).toBe(200);
    expect(res.body.data.room.problem_statement).toBe("Two Sum");
    expect(pool.query.mock.calls[0][1]).toEqual(["Two Sum", "abc", "owner-1"]);
  });

  it("500 on DB error", async () => {
    pool.query.mockRejectedValueOnce(new Error("boom"));
    const res = await request(app).patch("/api/rooms/abc/problem").set(authHeader()).send({});
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/rooms/:id", () => {
  it("404 when room not found or caller not the owner", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).delete("/api/rooms/r1").set(authHeader("guest"));
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not the owner/);
  });

  it("200 soft-deletes for the owner", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: "r1" }] });
    const res = await request(app).delete("/api/rooms/r1").set(authHeader("owner-1"));
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).toMatch(/is_active = false/);
    expect(pool.query.mock.calls[0][1]).toEqual(["r1", "owner-1"]);
  });

  it("500 on DB error", async () => {
    pool.query.mockRejectedValueOnce(new Error("boom"));
    const res = await request(app).delete("/api/rooms/r1").set(authHeader());
    expect(res.status).toBe(500);
  });
});
