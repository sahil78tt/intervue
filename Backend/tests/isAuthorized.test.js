import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { isAuthorized } from "../src/middlewares/isAuthorized.js";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("isAuthorized middleware", () => {
  it("401 when Authorization header missing", () => {
    const res = mockRes();
    const next = vi.fn();
    isAuthorized({ headers: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].message).toBe("No token provided");
    expect(next).not.toHaveBeenCalled();
  });

  it("401 when token part missing after Bearer", () => {
    const res = mockRes();
    const next = vi.fn();
    isAuthorized({ headers: { authorization: "Bearer" } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].message).toBe("Invalid token format");
    expect(next).not.toHaveBeenCalled();
  });

  it("401 for garbage token", () => {
    const res = mockRes();
    const next = vi.fn();
    isAuthorized({ headers: { authorization: "Bearer abc.def.ghi" } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 for token signed with wrong secret", () => {
    const token = jwt.sign({ id: "u1" }, "wrong-secret");
    const res = mockRes();
    const next = vi.fn();
    isAuthorized({ headers: { authorization: `Bearer ${token}` } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 for expired token", () => {
    const token = jwt.sign({ id: "u1" }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = mockRes();
    const next = vi.fn();
    isAuthorized({ headers: { authorization: `Bearer ${token}` } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("sets req.userId and calls next for valid token", () => {
    const token = jwt.sign({ id: "u1" }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = vi.fn();
    isAuthorized(req, res, next);
    expect(req.userId).toBe("u1");
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
