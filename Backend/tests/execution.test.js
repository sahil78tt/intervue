import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("axios", () => ({ default: { post: vi.fn() } }));
vi.mock("../src/configs/connect.js", () => ({
  default: { query: vi.fn() },
  connectDB: vi.fn(),
}));

import axios from "axios";
import { buildApp, authHeader } from "./helpers/app.js";

const app = buildApp();

beforeEach(() => {
  axios.post.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("GET /api/execute/languages", () => {
  it("401 without token", async () => {
    const res = await request(app).get("/api/execute/languages");
    expect(res.status).toBe(401);
  });

  it("200 lists all 6 supported languages", async () => {
    const res = await request(app).get("/api/execute/languages").set(authHeader());
    expect(res.status).toBe(200);
    const names = res.body.data.languages.map((l) => l.language);
    expect(names).toEqual(["javascript", "python", "cpp", "c", "java", "typescript"]);
    expect(res.body.data.languages[0]).toEqual({
      language: "javascript",
      jdoodleLanguage: "nodejs",
      versionIndex: "4",
    });
  });
});

describe("POST /api/execute", () => {
  it("401 without token", async () => {
    const res = await request(app).post("/api/execute").send({ language: "python", code: "print(1)" });
    expect(res.status).toBe(401);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("400 when language or code missing", async () => {
    const r1 = await request(app).post("/api/execute").set(authHeader()).send({ code: "x" });
    const r2 = await request(app).post("/api/execute").set(authHeader()).send({ language: "python" });
    expect(r1.status).toBe(400);
    expect(r2.status).toBe(400);
    expect(r1.body.message).toBe("Language and code are required");
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("400 for unsupported language", async () => {
    const res = await request(app).post("/api/execute").set(authHeader()).send({ language: "ruby", code: "puts 1" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not supported/i);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("200 maps language to JDoodle config and returns trimmed result", async () => {
    axios.post.mockResolvedValueOnce({
      data: { output: "3\n", memory: "100", cpuTime: "0.01", statusCode: 200, extra: "ignored" },
    });
    const res = await request(app).post("/api/execute").set(authHeader()).send({ language: "cpp", code: "int main(){}" });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ output: "3\n", memory: "100", cpuTime: "0.01", statusCode: 200 });

    const [url, payload] = axios.post.mock.calls[0];
    expect(url).toBe("https://api.jdoodle.com/v1/execute");
    expect(payload).toMatchObject({
      clientId: "test-id",
      clientSecret: "test-secret",
      script: "int main(){}",
      language: "cpp17",
      versionIndex: "1",
    });
  });

  it("500 with friendly message when JDoodle responds with an error", async () => {
    axios.post.mockRejectedValueOnce({ message: "fail", response: { data: { error: "limit" } } });
    const res = await request(app).post("/api/execute").set(authHeader()).send({ language: "python", code: "x" });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Code execution service failed. Try again.");
  });

  it("500 generic message for network errors", async () => {
    axios.post.mockRejectedValueOnce(new Error("ECONNRESET"));
    const res = await request(app).post("/api/execute").set(authHeader()).send({ language: "python", code: "x" });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Something went wrong");
  });
});
