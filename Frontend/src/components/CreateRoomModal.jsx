import { useState } from "react";
import api from "../api/axios";

// Available languages — matches backend LANGUAGE_CONFIG
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

      // Tell parent (Dashboard) a new room was created
      // So it can update the list
      onRoomCreated(newRoom);

      // Close the modal
      onClose();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Backdrop — dimmed layer covering full screen
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50"
      onClick={onClose}
    >
      {/* Modal container — stops click from bubbling to backdrop */}
      <div
        className="w-full max-w-md bg-white border border-gray-200 p-8"
        onClick={function (e) {
          e.stopPropagation();
        }}
      >
        {/* Heading */}
        <h2
          className="text-black font-normal mb-8"
          style={{ fontSize: "24px", letterSpacing: "-0.5px", lineHeight: "1" }}
        >
          New room.
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Name field */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="room-name"
              className="text-black text-sm font-medium"
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
              className="w-full bg-white text-black text-base py-3 border-b border-gray-300 placeholder:text-gray-400 focus:border-black transition-colors"
            />
          </div>

          {/* Language selector */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="room-language"
              className="text-black text-sm font-medium"
            >
              Language
            </label>
            <select
              id="room-language"
              value={language}
              onChange={function (e) {
                setLanguage(e.target.value);
              }}
              className="w-full bg-white text-black text-base py-3 border-b border-gray-300 focus:border-black transition-colors cursor-pointer"
            >
              {LANGUAGES.map(function (lang) {
                return (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-black bg-gray-100 px-4 py-3 rounded-lg">
              {error}
            </p>
          )}

          {/* Buttons row */}
          <div className="flex items-center gap-3 mt-2">
            {/* Cancel — ghost button */}
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-6 text-black text-sm font-semibold border border-black rounded-full hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>

            {/* Create — primary button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-10 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
