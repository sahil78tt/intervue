import { useState } from "react";
import api from "../api/axios";
import { toastSuccess, toastError } from "../lib/toast";

const LANGUAGES = ["javascript", "python", "cpp", "c", "java", "typescript"];

function CreateRoomModal({ onClose, onRoomCreated }) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async function (e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/rooms", {
        name: name,
        language: language,
      });

      const newRoom = response.data.data.room;

      onRoomCreated(newRoom);
      toastSuccess("ROOM CREATED", newRoom.name + " is ready to share.");
      onClose();
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      setError(errorMsg);
      toastError("CREATE FAILED", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-950 border border-white/10 p-8 rounded-2xl"
        onClick={function (e) {
          e.stopPropagation();
        }}
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-light tracking-tight text-zinc-100">
            New room.
          </h2>
          <button
            onClick={onClose}
            className="text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-zinc-100 transition-colors duration-150"
          >
            close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="room-name"
              className="text-xs font-mono text-zinc-500 uppercase tracking-widest"
            >
              Name
            </label>
            <input
              id="room-name"
              type="text"
              value={name}
              onChange={function (e) {
                setName(e.target.value);
              }}
              placeholder="Frontend Interview"
              required
              autoFocus
              className="w-full bg-transparent text-zinc-100 text-base py-3 border-b border-white/10 placeholder:text-zinc-600 focus:border-white/30 transition-colors duration-150"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="room-language"
              className="text-xs font-mono text-zinc-500 uppercase tracking-widest"
            >
              Language
            </label>
            <select
              id="room-language"
              value={language}
              onChange={function (e) {
                setLanguage(e.target.value);
              }}
              className="w-full bg-zinc-900 text-zinc-100 text-base py-3 border-b border-white/10 focus:border-white/30 transition-colors duration-150 cursor-pointer font-mono rounded-none"
            >
              {LANGUAGES.map(function (lang) {
                return (
                  <option key={lang} value={lang} className="bg-zinc-900">
                    {lang}
                  </option>
                );
              })}
            </select>
          </div>

          {error && (
            <p className="text-xs text-zinc-400 bg-zinc-900 border border-white/10 px-4 py-3 rounded-lg font-mono">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-mono text-zinc-500 uppercase tracking-widest border border-white/10 px-5 py-3 rounded-full hover:text-zinc-100 hover:bg-white/5 transition-colors duration-150"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center text-xs font-normal tracking-widest text-zinc-100 uppercase border border-white/10 bg-white/5 px-6 py-3 rounded-full hover:bg-white/10 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateRoomModal;
