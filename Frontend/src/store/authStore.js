import { create } from "zustand";

const useAuthStore = create(function (set) {
  return {
    // State
    user: null,
    token: null,

    // Actions
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
  };
});

export default useAuthStore;
