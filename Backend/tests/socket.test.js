import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { createServer } from "http";
import { Server } from "socket.io";
import { io as Client } from "socket.io-client";
import jwt from "jsonwebtoken";
import { setupSocketHandlers } from "../src/sockets/socketHandler.js";

let httpServer, io, url;
const clients = [];

const token = (id = "u1", secret = process.env.JWT_SECRET) => jwt.sign({ id }, secret);

// connect + wait for connect OR connect_error
const connect = (auth) =>
  new Promise((resolve) => {
    const c = Client(url, { auth, transports: ["websocket"], reconnection: false, forceNew: true });
    clients.push(c);
    c.on("connect", () => resolve({ client: c, error: null }));
    c.on("connect_error", (err) => resolve({ client: c, error: err }));
  });

const once = (client, event) => new Promise((resolve) => client.once(event, resolve));

// helper: event aane ka wait, par na aaye to bhi test hang na ho
const noEvent = (client, event, ms = 200) =>
  new Promise((resolve) => {
    let got = false;
    client.once(event, () => (got = true));
    setTimeout(() => resolve(got), ms);
  });

beforeAll(async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  httpServer = createServer();
  io = new Server(httpServer, { cors: { origin: "*" } });
  setupSocketHandlers(io);
  await new Promise((r) => httpServer.listen(0, r));
  url = `http://localhost:${httpServer.address().port}`;
});

afterEach(() => {
  while (clients.length) clients.pop().close();
});

afterAll(async () => {
  io.close();
  await new Promise((r) => httpServer.close(r));
});

describe("socket JWT auth middleware", () => {
  it("rejects connection with no token", async () => {
    const { error } = await connect({});
    expect(error).toBeTruthy();
    expect(error.message).toBe("unauthorized");
  });

  it("rejects connection with no auth object at all", async () => {
    const { error } = await connect(undefined);
    expect(error.message).toBe("unauthorized");
  });

  it("rejects garbage token", async () => {
    const { error } = await connect({ token: "garbage" });
    expect(error.message).toBe("unauthorized");
  });

  it("rejects token signed with wrong secret", async () => {
    const { error } = await connect({ token: token("u1", "wrong") });
    expect(error.message).toBe("unauthorized");
  });

  it("rejects expired token", async () => {
    const expired = jwt.sign({ id: "u1" }, process.env.JWT_SECRET, { expiresIn: -10 });
    const { error } = await connect({ token: expired });
    expect(error.message).toBe("unauthorized");
  });

  it("accepts valid token and connects", async () => {
    const { client, error } = await connect({ token: token() });
    expect(error).toBeNull();
    expect(client.connected).toBe(true);
  });

  it("sets socket.userId from token payload", async () => {
    const { client } = await connect({ token: token("user-42") });
    const sockets = await io.fetchSockets();
    const mine = sockets.find((s) => s.id === client.id);
    expect(mine.userId).toBe("user-42");
  });
});

describe("room events (existing behaviour must stay identical)", () => {
  const room = "room-abc";

  it("join-room: others get user-joined, everyone gets room-users", async () => {
    const { client: a } = await connect({ token: token("a") });
    const { client: b } = await connect({ token: token("b") });

    a.emit("join-room", { shareLink: room, username: "alice" });
    await once(a, "room-users");

    const joined = once(a, "user-joined");
    const usersA = once(a, "room-users");
    const usersB = once(b, "room-users");
    b.emit("join-room", { shareLink: room, username: "bob" });

    expect(await joined).toEqual({ username: "bob", socketId: b.id });
    const listA = await usersA;
    const listB = await usersB;
    expect(listA.map((u) => u.username)).toEqual(["alice", "bob"]);
    expect(listB).toEqual(listA);
    expect(listA[1].socketId).toBe(b.id);
  });

  it("join-room twice from same socket does not duplicate user", async () => {
    const { client: a } = await connect({ token: token("a") });
    a.emit("join-room", { shareLink: "dup-room", username: "alice" });
    await once(a, "room-users");
    const list = once(a, "room-users");
    a.emit("join-room", { shareLink: "dup-room", username: "alice" });
    expect((await list).length).toBe(1);
  });

  it("leave-room: others get user-left + updated room-users", async () => {
    const r = "leave-room";
    const { client: a } = await connect({ token: token("a") });
    const { client: b } = await connect({ token: token("b") });
    a.emit("join-room", { shareLink: r, username: "alice" });
    await once(a, "room-users");
    b.emit("join-room", { shareLink: r, username: "bob" });
    await once(b, "room-users");

    const left = once(a, "user-left");
    const users = once(a, "room-users");
    b.emit("leave-room", { shareLink: r, username: "bob" });

    expect(await left).toEqual({ username: "bob", socketId: b.id });
    expect((await users).map((u) => u.username)).toEqual(["alice"]);
  });

  it("disconnect: peers get webrtc:leave + updated room-users", async () => {
    const r = "disc-room";
    const { client: a } = await connect({ token: token("a") });
    const { client: b } = await connect({ token: token("b") });
    a.emit("join-room", { shareLink: r, username: "alice" });
    await once(a, "room-users");
    b.emit("join-room", { shareLink: r, username: "bob" });
    await once(b, "room-users");

    const bId = b.id;
    const leave = once(a, "webrtc:leave");
    const users = once(a, "room-users");
    b.close();

    expect(await leave).toEqual({ fromSocketId: bId });
    expect((await users).map((u) => u.username)).toEqual(["alice"]);
  });

  it("problem-updated: reaches others but not the sender", async () => {
    const r = "prob-room";
    const { client: a } = await connect({ token: token("a") });
    const { client: b } = await connect({ token: token("b") });
    a.emit("join-room", { shareLink: r, username: "alice" });
    b.emit("join-room", { shareLink: r, username: "bob" });
    await once(b, "room-users");
    await new Promise((res) => setTimeout(res, 50));

    const gotB = once(b, "problem-updated");
    const senderGot = noEvent(a, "problem-updated");
    a.emit("problem-updated", { shareLink: r, problem_statement: "Two Sum" });

    expect(await gotB).toEqual({ problem_statement: "Two Sum" });
    expect(await senderGot).toBe(false);
  });

  it("chat:send: broadcasts to everyone incl. sender with trimmed message", async () => {
    const r = "chat-room";
    const { client: a } = await connect({ token: token("a") });
    const { client: b } = await connect({ token: token("b") });
    a.emit("join-room", { shareLink: r, username: "alice" });
    b.emit("join-room", { shareLink: r, username: "bob" });
    await once(b, "room-users");
    await new Promise((res) => setTimeout(res, 50));

    const gotA = once(a, "chat:received");
    const gotB = once(b, "chat:received");
    a.emit("chat:send", { shareLink: r, username: "alice", message: "  hello  " });

    const msgA = await gotA;
    const msgB = await gotB;
    expect(msgA).toMatchObject({ username: "alice", message: "hello" });
    expect(msgA.id).toContain(a.id);
    expect(new Date(msgA.timestamp).toString()).not.toBe("Invalid Date");
    expect(msgB).toEqual(msgA);
  });

  it("chat:send: empty / whitespace message is ignored", async () => {
    const r = "chat-empty";
    const { client: a } = await connect({ token: token("a") });
    a.emit("join-room", { shareLink: r, username: "alice" });
    await once(a, "room-users");

    const got = noEvent(a, "chat:received");
    a.emit("chat:send", { shareLink: r, username: "alice", message: "   " });
    a.emit("chat:send", { shareLink: r, username: "alice" });
    expect(await got).toBe(false);
  });

  it.each([
    ["webrtc:offer", { offer: { sdp: "o" } }, "offer"],
    ["webrtc:answer", { answer: { sdp: "a" } }, "answer"],
    ["webrtc:ice-candidate", { candidate: { c: 1 } }, "candidate"],
  ])("%s is relayed to peers with fromSocketId (not to sender)", async (event, extra, key) => {
    const r = `rtc-${event}`;
    const { client: a } = await connect({ token: token("a") });
    const { client: b } = await connect({ token: token("b") });
    a.emit("join-room", { shareLink: r, username: "alice" });
    b.emit("join-room", { shareLink: r, username: "bob" });
    await once(b, "room-users");
    await new Promise((res) => setTimeout(res, 50));

    const gotB = once(b, event);
    const senderGot = noEvent(a, event);
    a.emit(event, { shareLink: r, ...extra });

    const payload = await gotB;
    expect(payload[key]).toEqual(extra[key]);
    expect(payload.fromSocketId).toBe(a.id);
    expect(await senderGot).toBe(false);
  });

  it("webrtc:leave is relayed to peers", async () => {
    const r = "rtc-leave";
    const { client: a } = await connect({ token: token("a") });
    const { client: b } = await connect({ token: token("b") });
    a.emit("join-room", { shareLink: r, username: "alice" });
    b.emit("join-room", { shareLink: r, username: "bob" });
    await once(b, "room-users");
    await new Promise((res) => setTimeout(res, 50));

    const got = once(b, "webrtc:leave");
    a.emit("webrtc:leave", { shareLink: r });
    expect(await got).toEqual({ fromSocketId: a.id });
  });

  it("events stay inside their room (no cross-room leak)", async () => {
    const { client: a } = await connect({ token: token("a") });
    const { client: c } = await connect({ token: token("c") });
    a.emit("join-room", { shareLink: "room-one", username: "alice" });
    c.emit("join-room", { shareLink: "room-two", username: "carol" });
    await once(c, "room-users");
    await new Promise((res) => setTimeout(res, 50));

    const leaked = noEvent(c, "chat:received");
    a.emit("chat:send", { shareLink: "room-one", username: "alice", message: "secret" });
    expect(await leaked).toBe(false);
  });
});
