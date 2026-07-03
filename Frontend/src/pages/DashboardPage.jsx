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

  const [copiedRoomId, setCopiedRoomId] = useState(null);

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

  const handleCopyLink = function (shareLink, roomId, e) {
    e.stopPropagation();
    const fullLink = window.location.origin + "/room/" + shareLink;
    navigator.clipboard.writeText(fullLink);
    setCopiedRoomId(roomId);
    setTimeout(function () {
      setCopiedRoomId(null);
    }, 2000);
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

  function formatRelativeDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return diffMin + "m ago";
    if (diffHours < 24) return diffHours + "h ago";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return diffDays + "d ago";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function formatExpiry(createdAt) {
    const created = new Date(createdAt);
    const expires = new Date(created.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const remainingMs = expires - now;

    if (remainingMs <= 0) return "expired";
    const remainingHours = Math.floor(remainingMs / 3600000);
    const remainingMin = Math.floor((remainingMs % 3600000) / 60000);

    if (remainingHours >= 1) return remainingHours + "h left";
    return remainingMin + "m left";
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* ═══════════════════════════════════════════ */}
      {/* NAVBAR                                       */}
      {/* ═══════════════════════════════════════════ */}
      <header className="h-14 flex items-center justify-between px-8 border-b border-white/5 flex-shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          <span className="text-xl font-medium tracking-tight text-zinc-100">
            Intervue
          </span>
        </div>

        {/* User cluster */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-100 flex items-center justify-center text-[10px] font-mono uppercase">
              {user && user.username ? user.username.substring(0, 2) : "??"}
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm text-zinc-100 font-light">
                {user && user.username}
              </span>
              <span className="text-[10px] font-mono text-zinc-500 mt-0.5">
                {user && user.email}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <button
            onClick={handleSignOut}
            className="text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-zinc-100 transition-colors duration-150"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════ */}
      {/* MAIN — locked height, internal scroll only  */}
      {/* ═══════════════════════════════════════════ */}
      <main className="flex-1 px-8 py-6 overflow-hidden">
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          {/* ── Heading row ── */}
          <div className="flex items-end justify-between mb-3 flex-shrink-0">
            <div>
              <h1 className="text-3xl font-light tracking-tight text-zinc-100 leading-none">
                Your rooms.
              </h1>
              <p className="text-sm text-zinc-500 mt-2 max-w-md">
                Real-time collaborative interviews with a shared editor, live
                cursors, and sandboxed code execution.
              </p>
            </div>

            <button
              onClick={function () {
                setShowCreateModal(true);
              }}
              className="flex items-center justify-center gap-2 text-xs font-normal tracking-widest text-zinc-100 uppercase border border-white/10 bg-white/5 px-5 py-2.5 rounded-full hover:bg-white/10 transition-colors duration-150 flex-shrink-0"
            >
              + New room
            </button>
          </div>

          {/* ── Two-column body: Rooms left, Join right ── */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 mt-4">
            {/* ── LEFT — Rooms (2/3 width) ── */}
            <div className="lg:col-span-2 flex flex-col min-h-0">
              {/* Section label */}
              <div className="flex items-center gap-4 mb-4 flex-shrink-0">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                  Rooms{" "}
                  {!roomsLoading && rooms.length > 0 && (
                    <span className="text-zinc-600">· {rooms.length}</span>
                  )}
                </span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              {/* Loading */}
              {roomsLoading && (
                <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest py-8">
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
                <div className="border border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="flex flex-col gap-1">
                    <p className="text-zinc-100 text-base font-light">
                      No rooms yet.
                    </p>
                    <p className="text-sm text-zinc-500">
                      Create your first interview room to get started.
                    </p>
                  </div>
                  <button
                    onClick={function () {
                      setShowCreateModal(true);
                    }}
                    className="flex items-center justify-center gap-2 text-xs font-normal tracking-widest text-zinc-100 uppercase border border-white/10 bg-white/5 px-5 py-2.5 rounded-full hover:bg-white/10 transition-colors duration-150"
                  >
                    + Create room
                  </button>
                </div>
              )}

              {/* Rooms grid — scrolls internally if overflow */}
              {!roomsLoading && !roomsError && rooms.length > 0 && (
                <div className="flex-1 overflow-y-auto pr-1 -mr-1">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {rooms.map(function (room) {
                      const isCopied = copiedRoomId === room.id;
                      return (
                        <div
                          key={room.id}
                          className="border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-colors duration-150 flex flex-col gap-4 bg-zinc-900/20"
                        >
                          {/* Top — Title + meta */}
                          <div className="flex flex-col gap-2">
                            <h3 className="text-zinc-100 text-base font-light tracking-tight leading-tight truncate">
                              {room.name}
                            </h3>

                            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 flex-wrap">
                              <span className="uppercase tracking-widest">
                                {room.language}
                              </span>
                              <span className="text-zinc-700">·</span>
                              <span>{formatRelativeDate(room.created_at)}</span>
                              <span className="text-zinc-700">·</span>
                              <span className="text-zinc-600">
                                {formatExpiry(room.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-white/5" />

                          {/* Actions row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <button
                                onClick={function (e) {
                                  handleCopyLink(room.share_link, room.id, e);
                                }}
                                className="text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-zinc-100 transition-colors duration-150"
                              >
                                {isCopied ? "Copied ✓" : "Copy"}
                              </button>

                              <button
                                onClick={function (e) {
                                  handleDeleteRoom(room.id, room.name, e);
                                }}
                                className="text-xs font-mono text-zinc-600 uppercase tracking-widest hover:text-zinc-100 transition-colors duration-150"
                              >
                                Delete
                              </button>
                            </div>

                            <button
                              onClick={function () {
                                navigate("/room/" + room.share_link);
                              }}
                              className="flex items-center gap-1.5 text-xs font-normal tracking-widest text-zinc-100 uppercase border border-white/10 bg-white/5 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors duration-150"
                            >
                              Open
                              <span className="text-sm">→</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT — Join card (1/3 width) ── */}
            <div className="lg:col-span-1 flex flex-col min-h-0">
              <div className="flex items-center gap-4 mb-4 flex-shrink-0">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                  Join a room
                </span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              <div className="border border-white/10 rounded-2xl p-5 bg-zinc-900/20 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-zinc-100 text-base font-light tracking-tight mb-1">
                    Join with invite link
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Paste a link shared by the host.
                  </p>
                </div>

                <form onSubmit={handleJoinRoom} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="join-link"
                      className="text-xs font-mono text-zinc-500 uppercase tracking-widest"
                    >
                      Invite link
                    </label>
                    <input
                      id="join-link"
                      type="text"
                      value={joinLink}
                      onChange={function (e) {
                        setJoinLink(e.target.value);
                      }}
                      placeholder="Paste invite link"
                      required
                      className="w-full bg-zinc-900 text-zinc-100 text-sm px-3 py-2.5 border border-white/10 rounded-lg placeholder:text-zinc-600 focus:border-white/20 transition-colors duration-150 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={joinLoading}
                    className="w-full flex items-center justify-center gap-2 text-xs font-normal tracking-widest text-zinc-100 uppercase border border-white/10 bg-white/5 px-4 py-2.5 rounded-full hover:bg-white/10 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {joinLoading ? "Joining..." : "Join room"}
                    <span className="text-sm">→</span>
                  </button>
                </form>

                {joinError && (
                  <p className="text-xs text-zinc-400 bg-zinc-950 border border-white/10 px-3 py-2 rounded-lg mt-3 font-mono">
                    {joinError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════ */}
      {/* FOOTER                                       */}
      {/* ═══════════════════════════════════════════ */}
      <footer className="h-10 flex items-center justify-between px-8 border-t border-white/5 flex-shrink-0">
        <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
          v1.0.0
        </span>
        <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
          © {new Date().getFullYear()} Intervue
        </span>
      </footer>

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
