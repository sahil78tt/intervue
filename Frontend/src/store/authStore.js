import { create } from "zustand";
import axios from "../api/axios.js";

const useAuthStore = create(function (set) {
  return {
    user: null,
    token: localStorage.getItem("token") || null,

    setUser: function (user, token) {
      set({ user: user, token: token });
      localStorage.setItem("token", token);
    },

    logout: function () {
      set({ user: null, token: null });
      localStorage.removeItem("token");
    },

    initializeAuth: function (user, token) {
      set({ user: user, token: token });
    },

    fetchUser: async function () {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get("/auth/me");
        set({ user: res.data.user, token: token });
      } catch (err) {
        console.log("fetchUser failed:", err.message);
        set({ user: null, token: null });
        localStorage.removeItem("token");
      }
    },
  };
});

export default useAuthStore;
