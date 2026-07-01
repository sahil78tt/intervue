import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import useAuthStore from "../store/authStore";
import CreateRoomModal from "../components/CreateRoomModal";

function DashboardPage() {
  const navigate = useNavigate();

  const user = useAuthStore(function (state) {
    return state.user;
  });
  const setUser = useAuthStore(function (state) {
    return state.setUser;
  });
  const logout = useAuthStore(function (state) {
    return state.logout;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Rooms state
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState("");

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Join room state
  const [joinLink, setJoinLink] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  // Fetch user info on load
  useEffect(function () {
    const fetchUser = async function () {
      try {
        const response = await api.get("/auth/me");
        const userData = response.data.data.user;
        const token = localStorage.getItem("token");
        setUser(userData, token);
      } catch (err) {
        console.log("Fetch user error:", err.message);
        logout();
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Fetch rooms on load
  useEffect(function () {
    const fetchRooms = async function () {
      try {
        const response = await api.get("/rooms/my");
        setRooms(response.data.data.rooms);
      } catch (err) {
        console.log("Fetch rooms error:", err.message);
        setRoomsError("Failed to load rooms.");
      } finally {
        setRoomsLoading(false);
      }
    };

    fetchRooms();
  }, []);

  // Sign out
  const handleSignOut = function () {
    logout();
    navigate("/login");
  };

  // Called by modal when a new room is created
  const handleRoomCreated = function (newRoom) {
    const roomWithCount = { ...newRoom, participant_count: 1 };
    setRooms([roomWithCount, ...rooms]);
  };

  // Delete room with confirmation
  const handleDeleteRoom = async function (roomId, roomName, e) {
    // Prevent room click from firing (don't navigate to room)
    e.stopPropagation();
    const confirmed = window.confirm('Delete room "' + roomName + '"?');
    if (!confirmed) return;
    try {
      await api.delete("/rooms/" + roomId);
      // Remove from local state — no need to re-fetch
      setRooms(
        rooms.filter(function (r) {
          return r.id !== roomId;
        }),
      );
    } catch (err) {
      console.log("Delete room error:", err.message);
      alert("Failed to delete room.");
    }
  };

  // Handle joining a room by share link
  const handleJoinRoom = async function (e) {
    e.preventDefault();
    setJoinError("");
    setJoinLoading(true);

    try {
      let shareLink = joinLink.trim();

      if (shareLink.includes("/")) {
        const parts = shareLink.split("/");
        shareLink = parts[parts.length - 1];
      }

      const response = await api.post("/rooms/join/" + shareLink);
      const room = response.data.data.room;

      navigate("/room/" + room.share_link);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setJoinError(err.response.data.message);
      } else {
        setJoinError("Failed to join room.");
      }
    } finally {
      setJoinLoading(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200">
        <span className="text-black text-sm font-semibold">intervue</span>

        <div className="flex items-center gap-6">
          <span className="text-gray-500 text-sm">{user && user.username}</span>
          <button
            onClick={handleSignOut}
            className="text-gray-500 text-sm font-semibold hover:text-black transition-colors"
          >
            sign out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-8 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="flex items-center justify-between mb-12">
            <h1
              className="text-black font-normal"
              style={{
                fontSize: "40px",
                letterSpacing: "-1px",
                lineHeight: "1",
              }}
            >
              Your rooms.
            </h1>

            <button
              onClick={function () {
                setShowCreateModal(true);
              }}
              className="h-10 px-6 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-colors"
            >
              + New room
            </button>
          </div>

          <div className="border-t border-gray-200 mb-8"></div>

          {/* State 1: Loading */}
          {roomsLoading && (
            <p className="text-gray-400 text-sm py-16 text-center">
              Loading rooms...
            </p>
          )}

          {/* State 2: Error */}
          {!roomsLoading && roomsError && (
            <p className="text-black text-sm bg-gray-100 px-4 py-3 rounded-lg">
              {roomsError}
            </p>
          )}

          {/* State 3: Empty */}
          {!roomsLoading && !roomsError && rooms.length === 0 && (
            <p className="text-gray-400 text-sm py-16 text-center">
              No rooms yet. Create your first room to get started.
            </p>
          )}

          {/* State 4: Rooms exist */}
          {!roomsLoading && !roomsError && rooms.length > 0 && (
            <div className="flex flex-col">
              {rooms.map(function (room) {
                return (
                  <div
                    key={room.id}
                    onClick={function () {
                      navigate("/room/" + room.share_link);
                    }}
                    className="group flex items-center justify-between py-6 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer px-4 -mx-4"
                  >
                    <div className="flex flex-col gap-2">
                      <h3 className="text-black text-lg font-normal">
                        {room.name}
                      </h3>

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="uppercase tracking-wider font-medium">
                          {room.language}
                        </span>
                        <span>·</span>
                        <span>
                          {Number(room.participant_count)}{" "}
                          {Number(room.participant_count) === 1
                            ? "person"
                            : "people"}
                        </span>
                        <span>·</span>
                        <span>
                          {new Date(room.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Right side — delete button (visible on hover) + arrow */}
                    <div className="flex items-center gap-6">
                      <button
                        onClick={function (e) {
                          handleDeleteRoom(room.id, room.name, e);
                        }}
                        className="text-xs text-gray-400 hover:text-black font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        delete
                      </button>
                      <span className="text-gray-400 text-xl">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Join room section */}
          <div className="mt-16 pt-12 border-t border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-6">
              or join a room
            </p>

            <form onSubmit={handleJoinRoom} className="flex items-end gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <label
                  htmlFor="join-link"
                  className="text-black text-sm font-medium"
                >
                  Share link
                </label>
                <input
                  id="join-link"
                  type="text"
                  value={joinLink}
                  onChange={function (e) {
                    setJoinLink(e.target.value);
                  }}
                  placeholder="V1StGXR8_Z or paste full link"
                  required
                  className="w-full bg-white text-black text-base py-3 border-b border-gray-300 placeholder:text-gray-400 focus:border-black transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={joinLoading}
                className="h-10 px-6 text-black text-sm font-semibold border border-black rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joinLoading ? "Joining..." : "Join"}
              </button>
            </form>

            {joinError && (
              <p className="text-sm text-black bg-gray-100 px-4 py-3 rounded-lg mt-4">
                {joinError}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Create Room Modal */}
      {showCreateModal && (
        <CreateRoomModal
          onClose={function () {
            setShowCreateModal(false);
          }}
          onRoomCreated={handleRoomCreated}
        />
      )}
    </div>
  );
}

export default DashboardPage;
