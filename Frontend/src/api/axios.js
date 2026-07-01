import axios from "axios";

// Pre-configured axios instance — base URL set once
// Interceptor auto-attaches JWT token to every request
const api = axios.create({
  baseURL: "http://localhost:8003/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Before every request — check localStorage for token
// If exists, attach to Authorization header automatically
api.interceptors.request.use(function (config) {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }
  return config;
});

export default api;
