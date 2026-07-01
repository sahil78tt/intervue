import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

function RoomPage() {
  const navigate = useNavigate();
  const { shareLink } = useParams();

  // Room state
  const [room, setRoom] = useState(null);
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch room details when page loads
  useEffect(
    function () {
      const fetchRoom = async function () {
        try {
          const response = await api.get("/rooms/" + shareLink);
          setRoom(response.data.data.room);
          setRole(response.data.data.role);
        } catch (err) {
          console.log("Fetch room error:", err.message);
          if (err.response && err.response.data && err.response.data.message) {
            setError(err.response.data.message);
          } else {
            setError("Failed to load room.");
          }
        } finally {
          setIsLoading(false);
        }
      };

      fetchRoom();
    },
    [shareLink],
  );

  // Copy share link to clipboard
  const handleCopyLink = function () {
    const fullLink = window.location.href;
    navigator.clipboard.writeText(fullLink);
    // Simple feedback — could be a toast later
    alert("Link copied to clipboard!");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading room...</p>
      </div>
    );
  }

  // Error state — room doesn't exist OR user not a member
  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-black text-lg">{error}</p>
        <button
          onClick={function () {
            navigate("/dashboard");
          }}
          className="h-10 px-6 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-colors"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Navbar */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200 flex-shrink-0">
        {/* Left — wordmark + room name */}
        <div className="flex items-center gap-6">
          <span className="text-black text-sm font-semibold">intervue</span>
          <span className="text-gray-300">|</span>
          <span className="text-black text-sm">{room.name}</span>

          {/* Role badge */}
          <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
            {role}
          </span>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleCopyLink}
            className="text-gray-500 text-sm font-semibold hover:text-black transition-colors"
          >
            copy link
          </button>

          <button
            onClick={function () {
              navigate("/dashboard");
            }}
            className="text-gray-500 text-sm font-semibold hover:text-black transition-colors"
          >
            ← back
          </button>
        </div>
      </header>

      {/* Main split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT — Editor area (65%) */}
        <div className="flex-1 flex flex-col border-r border-gray-200">
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Monaco Editor goes here</p>
          </div>
        </div>

        {/* RIGHT — Panels (35%) */}
        <div className="w-[400px] flex flex-col">
          {/* Top — Problem panel */}
          <div className="flex-1 border-b border-gray-200 p-6 overflow-y-auto">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4">
              Problem
            </p>
            <p className="text-gray-400 text-sm">No problem statement yet.</p>
          </div>

          {/* Bottom — Output panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4">
              Output
            </p>
            <p className="text-gray-400 text-sm">
              Run your code to see output.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomPage;
