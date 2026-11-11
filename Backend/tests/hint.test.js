import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

vi.mock("../src/configs/connect.js", () => ({
  default: { query: vi.fn() },
  connectDB: vi.fn(),
}));

import { buildApp, authHeader } from "./helpers/app.js";

const okResponse = (content) => ({
  ok: true,
  json: async () => ({ choices: [{ message: { content } }] }),
});

let counter = 0;

describe("POST /api/hint", () => {
  let app;
  let uid;
  let fetchMock;

  beforeEach(() => {
    app = buildApp();
    // hintLimiter module-level singleton hai (store shared), isliye har test ko unique user milta hai
    uid = `hint-user-${++counter}`;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("401 without token", async () => {
    const res = await request(app).post("/api/hint").send({ language: "python" });
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("400 when language missing", async () => {
    const res = await request(app).post("/api/hint").set(authHeader(uid)).send({ code: "x" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Language is required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("200 returns trimmed hint and calls Groq with the user's code", async () => {
    fetchMock.mockResolvedValueOnce(okResponse("  Try a hash map.  "));
    const res = await request(app)
      .post("/api/hint")
      .set(authHeader(uid))
      .send({ problem_statement: "Two Sum", code: "def f(): pass", language: "python" });

    expect(res.status).toBe(200);
    expect(res.body.data.hint).toBe("Try a hash map.");

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(opts.headers.Authorization).toBe("Bearer test-groq-key");
    const body = JSON.parse(opts.body);
    expect(body.messages[1].content).toContain("Two Sum");
    expect(body.messages[1].content).toContain("def f(): pass");
    expect(body.max_tokens).toBe(200);
  });

  it("handles empty problem/code with fallback text", async () => {
    fetchMock.mockResolvedValueOnce(okResponse("Start with the input."));
    const res = await request(app).post("/api/hint").set(authHeader(uid)).send({ language: "java" });
    expect(res.status).toBe(200);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[1].content).toContain("No problem set yet");
    expect(body.messages[1].content).toContain("empty");
  });

  it("500 when Groq returns non-OK", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, text: async () => "rate limited" });
    const res = await request(app).post("/api/hint").set(authHeader(uid)).send({ language: "python" });
    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/AI service is unavailable/);
  });

  it("500 when Groq returns no hint", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [] }) });
    const res = await request(app).post("/api/hint").set(authHeader(uid)).send({ language: "python" });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("AI did not return a hint. Try again.");
  });

  it("500 when fetch throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    const res = await request(app).post("/api/hint").set(authHeader(uid)).send({ language: "python" });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Something went wrong");
  });

  it("rate limit: 6th hint in an hour is blocked (per user)", async () => {
    fetchMock.mockResolvedValue(okResponse("hint"));
    for (let i = 0; i < 5; i++) {
      const ok = await request(app).post("/api/hint").set(authHeader("limited")).send({ language: "python" });
      expect(ok.status).toBe(200);
    }
    const blocked = await request(app).post("/api/hint").set(authHeader("limited")).send({ language: "python" });
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/too many hints/);
    expect(fetchMock).toHaveBeenCalledTimes(5);

    // dusra user affect nahi hota
    const other = await request(app).post("/api/hint").set(authHeader("someone-else")).send({ language: "python" });
    expect(other.status).toBe(200);
  });
});
