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

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [joinLink, setJoinLink] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

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

  const handleSignOut = function () {
    logout();
    navigate("/login");
  };

  const handleRoomCreated = function (newRoom) {
    const roomWithCount = { ...newRoom, participant_count: 1 };
    setRooms([roomWithCount, ...rooms]);
  };

  const handleDeleteRoom = async function (roomId, roomName, e) {
    e.stopPropagation();
    const confirmed = window.confirm('Delete room "' + roomName + '"?');
    if (!confirmed) return;
    try {
      await api.delete("/rooms/" + roomId);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Navbar */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-white/5">
        <span className="text-zinc-100 text-xs font-normal tracking-widest uppercase">
          Intervue
        </span>

        <div className="flex items-center gap-6">
          <span className="text-xs font-mono text-zinc-500">
            {user && user.username}
          </span>
          <div className="h-px w-6 bg-white/10" />
          <button
            onClick={handleSignOut}
            className="text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-zinc-100 transition-colors duration-150"
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
            <h1 className="text-5xl font-light tracking-tight text-zinc-100 leading-none">
              Your
              <br />
              <span className="text-zinc-600">rooms.</span>
            </h1>

            <button
              onClick={function () {
                setShowCreateModal(true);
              }}
              className="flex items-center justify-center gap-3 text-xs font-normal tracking-widest text-zinc-100 uppercase border border-white/10 bg-white/5 px-6 py-3 rounded-full hover:bg-white/10 transition-colors duration-150"
            >
              + New room
            </button>
          </div>

          <div className="border-t border-white/5 mb-8" />

          {/* Loading */}
          {roomsLoading && (
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest py-16 text-center">
              Loading rooms...
            </p>
          )}

          {/* Error */}
          {!roomsLoading && roomsError && (
            <p className="text-xs text-zinc-400 bg-zinc-900 border border-white/10 px-4 py-3 rounded-lg font-mono">
              {roomsError}
            </p>
          )}

          {/* Empty */}
          {!roomsLoading && !roomsError && rooms.length === 0 && (
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest py-16 text-center">
              No rooms yet. Create your first room to get started.
            </p>
          )}

          {/* Rooms list */}
          {!roomsLoading && !roomsError && rooms.length > 0 && (
            <div className="flex flex-col">
              {rooms.map(function (room) {
                return (
                  <div
                    key={room.id}
                    onClick={function () {
                      navigate("/room/" + room.share_link);
                    }}
                    className="group flex items-center justify-between py-6 border-b border-white/5 hover:bg-white/[0.02] transition-colors duration-150 cursor-pointer px-4 -mx-4"
                  >
                    {/* Left */}
                    <div className="flex flex-col gap-2">
                      <h3 className="text-zinc-100 text-base font-light tracking-tight">
                        {room.name}
                      </h3>

                      <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
                        <span className="uppercase tracking-widest">
                          {room.language}
                        </span>
                        <span className="text-zinc-700">·</span>
                        <span>
                          {Number(room.participant_count)}{" "}
                          {Number(room.participant_count) === 1
                            ? "person"
                            : "people"}
                        </span>
                        <span className="text-zinc-700">·</span>
                        <span>
                          {new Date(room.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-6">
                      <button
                        onClick={function (e) {
                          handleDeleteRoom(room.id, room.name, e);
                        }}
                        className="text-xs font-mono text-zinc-600 hover:text-zinc-100 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-150"
                      >
                        delete
                      </button>
                      <span className="text-zinc-600 text-sm">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Join room */}
          <div className="mt-16 pt-12 border-t border-white/5">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-xs font-mono text-zinc-500 border border-white/10 px-2 py-1 rounded-full">
                02
              </span>
              <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
                Join a room
              </span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            <form onSubmit={handleJoinRoom} className="flex items-end gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <label
                  htmlFor="join-link"
                  className="text-xs font-mono text-zinc-500 uppercase tracking-widest"
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
                  placeholder="Enter room ID or link"
                  required
                  className="w-full bg-transparent text-zinc-100 text-base py-3 border-b border-white/10 placeholder:text-zinc-600 focus:border-white/30 transition-colors duration-150 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={joinLoading}
                className="text-xs font-mono text-zinc-500 uppercase tracking-widest border border-white/10 px-5 py-3 rounded-full hover:text-zinc-100 hover:bg-white/5 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {joinLoading ? "Joining..." : "Join"}
              </button>
            </form>

            {joinError && (
              <p className="text-xs text-zinc-400 bg-zinc-900 border border-white/10 px-4 py-3 rounded-lg mt-4 font-mono">
                {joinError}
              </p>
            )}
          </div>
        </div>
      </main>

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
