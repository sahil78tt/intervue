import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, LogIn, Plus, ArrowRight, Clock } from "lucide-react";
import api from "../api/axios";
import useAuthStore from "../store/authStore";
import CreateRoomModal from "../components/CreateRoomModal";
import ConfirmModal from "../components/ConfirmModal";
import { toastSuccess, toastError } from "../lib/toast";

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
  const [joinLoading, setJoinLoading] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("rooms");
  const [searchQuery, setSearchQuery] = useState("");
  const [fadeClass, setFadeClass] = useState("opacity-0 translate-y-2");

  useEffect(function () {
    const timer = setTimeout(function () {
      setFadeClass("opacity-100 translate-y-0");
    }, 50);
    return function () {
      clearTimeout(timer);
    };
  }, []);

  useEffect(function () {
    async function fetchUser() {
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
    }
    fetchUser();
  }, []);

  useEffect(function () {
    async function fetchRooms() {
      try {
        const response = await api.get("/rooms/my");
        setRooms(response.data.data.rooms);
      } catch (err) {
        console.log("Fetch rooms error:", err.message);
        setRoomsError("Failed to load rooms.");
        toastError("LOAD FAILED", "Could not fetch your rooms.");
      } finally {
        setRoomsLoading(false);
      }
    }
    fetchRooms();
  }, []);

  function transitionTab(newTab) {
    setFadeClass("opacity-0 translate-y-2");
    setTimeout(function () {
      setActiveTab(newTab);
      setFadeClass("opacity-100 translate-y-0");
    }, 200);
  }

  function handleSignOut() {
    logout();
    toastSuccess("SIGNED OUT", "See you next time.");
    navigate("/login");
  }

  function handleRoomCreated(newRoom) {
    const roomWithCount = { ...newRoom, participant_count: 1 };
    setRooms([roomWithCount, ...rooms]);
  }

  function handleDeleteClick(room, e) {
    e.stopPropagation();
    setDeleteTarget(room);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete("/rooms/" + deleteTarget.id);
      setRooms(
        rooms.filter(function (r) {
          return r.id !== deleteTarget.id;
        }),
      );
      toastSuccess("ROOM DELETED", deleteTarget.name + " has been removed.");
      setDeleteTarget(null);
    } catch (err) {
      console.log("Delete room error:", err.message);
      toastError("DELETE FAILED", "Could not delete room. Try again.");
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleCopyLink(shareLink, roomId, e) {
    e.stopPropagation();
    const fullLink = window.location.origin + "/room/" + shareLink;
    navigator.clipboard.writeText(fullLink);
    setCopiedRoomId(roomId);
    toastSuccess("LINK COPIED", "Ready to share with participants.");
    setTimeout(function () {
      setCopiedRoomId(null);
    }, 2000);
  }

  async function handleJoinRoom(e) {
    e.preventDefault();
    setJoinLoading(true);
    try {
      let shareLink = joinLink.trim();
      if (shareLink.includes("/")) {
        const parts = shareLink.split("/");
        shareLink = parts[parts.length - 1];
      }
      const response = await api.post("/rooms/join/" + shareLink);
      const room = response.data.data.room;
      toastSuccess("JOINED ROOM", "Redirecting to " + room.name + "...");
      navigate("/room/" + room.share_link);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to join room.";
      toastError("JOIN FAILED", errorMsg);
    } finally {
      setJoinLoading(false);
    }
  }

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

  function isRoomActive(createdAt) {
    const created = new Date(createdAt);
    const expires = new Date(created.getTime() + 24 * 60 * 60 * 1000);
    return new Date() < expires;
  }

  const filteredRooms = rooms.filter(function (room) {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      room.name.toLowerCase().includes(q) ||
      room.language.toLowerCase().includes(q)
    );
  });

  const recentRooms = rooms.slice(0, 3);

  if (isLoading) {
    return (
      <div className="h-screen bg-canvas flex items-center justify-center">
        <p className="text-ink-tertiary text-[11px] font-mono uppercase tracking-widest">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-canvas flex overflow-hidden">
      {/* ═══════════════════════════ SIDEBAR (200px) ═══════════════════════════ */}
      <aside className="w-[200px] flex-shrink-0 border-r border-hairline flex flex-col bg-canvas">
        {/* Logo */}
        <div className="h-12 flex items-center px-4 border-b border-hairline">
          <span className="text-ink text-[15px] font-semibold tracking-tight select-none">
            Intervue<span className="text-primary">.</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2.5 flex flex-col gap-0.5 overflow-y-auto">
          <div className="px-2.5 py-1.5 mb-0.5">
            <span className="text-[10px] font-medium text-ink-tertiary uppercase tracking-widest">
              Workspace
            </span>
          </div>

          <button
            onClick={function () {
              transitionTab("rooms");
            }}
            className={
              "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-150 " +
              (activeTab === "rooms"
                ? "bg-surface-2 text-ink"
                : "text-ink-subtle hover:bg-surface-1 hover:text-ink")
            }
          >
            <Folder size={14} strokeWidth={2} />
            <span>My rooms</span>
            {rooms.length > 0 && (
              <span className="ml-auto text-[11px] text-ink-tertiary font-mono">
                {rooms.length}
              </span>
            )}
          </button>

          <button
            onClick={function () {
              transitionTab("join");
            }}
            className={
              "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-150 " +
              (activeTab === "join"
                ? "bg-surface-2 text-ink"
                : "text-ink-subtle hover:bg-surface-1 hover:text-ink")
            }
          >
            <LogIn size={14} strokeWidth={2} />
            <span>Join a room</span>
          </button>

          <button
            onClick={function () {
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium text-ink-subtle hover:bg-surface-1 hover:text-ink transition-colors duration-150"
          >
            <Plus size={14} strokeWidth={2.5} className="text-primary" />
            <span>New room</span>
          </button>

          {/* Recent activity */}
          {recentRooms.length > 0 && (
            <>
              <div className="px-2.5 py-1.5 mt-5 mb-0.5 flex items-center gap-1.5">
                <Clock
                  size={10}
                  strokeWidth={2}
                  className="text-ink-tertiary"
                />
                <span className="text-[10px] font-medium text-ink-tertiary uppercase tracking-widest">
                  Recent
                </span>
              </div>

              {recentRooms.map(function (room) {
                const active = isRoomActive(room.created_at);
                return (
                  <button
                    key={room.id}
                    onClick={function () {
                      navigate("/room/" + room.share_link);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-ink-subtle hover:bg-surface-1 hover:text-ink transition-colors duration-150 group"
                    title={room.name}
                  >
                    <div
                      className={
                        "w-1.5 h-1.5 rounded-full flex-shrink-0 " +
                        (active ? "bg-semantic-success" : "bg-ink-tertiary")
                      }
                    />
                    <span className="truncate">{room.name}</span>
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* User at bottom */}
        <div className="p-2.5 border-t border-hairline">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-1 transition-colors duration-150">
            <div className="w-7 h-7 rounded-full bg-surface-3 border border-hairline flex items-center justify-center text-[10px] font-mono uppercase text-ink-muted flex-shrink-0">
              {user && user.username ? user.username.substring(0, 2) : "??"}
            </div>
            <div className="flex flex-col leading-none min-w-0 flex-1">
              <span className="text-[12px] text-ink font-medium truncate">
                {user && user.username}
              </span>
              <span className="text-[10px] font-mono text-ink-tertiary truncate mt-0.5">
                {user && user.email}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full mt-1 flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-ink-tertiary hover:bg-surface-1 hover:text-ink transition-colors duration-150"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════ MAIN ═══════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (48px) */}
        <div className="h-12 border-b border-hairline flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-ink-tertiary uppercase tracking-widest">
              Workspace
            </span>
            <span className="text-ink-tertiary text-[11px]">/</span>
            <span className="text-[13px] text-ink font-medium">
              {activeTab === "rooms" ? "My rooms" : "Join a room"}
            </span>
            {activeTab === "rooms" && rooms.length > 0 && (
              <span className="bg-surface-2 text-ink-muted text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-hairline">
                {rooms.length}
              </span>
            )}
          </div>

          {activeTab === "rooms" && (
            <button
              onClick={function () {
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors duration-150"
            >
              <Plus size={12} strokeWidth={2.5} />
              <span>New room</span>
            </button>
          )}
        </div>

        {/* Content with fade animation */}
        <div className="flex-1 overflow-y-auto">
          <div className={"transition-all duration-300 ease-out " + fadeClass}>
            {/* ────────── TAB: ROOMS ────────── */}
            {activeTab === "rooms" && (
              <div className="max-w-[880px] mx-auto px-6 py-6">
                {/* Search */}
                {!roomsLoading && rooms.length > 0 && (
                  <div className="mb-5">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={function (e) {
                        setSearchQuery(e.target.value);
                      }}
                      placeholder="Filter rooms by name or language..."
                      className="w-full bg-surface-1 border border-hairline text-ink text-[13px] px-4 py-2.5 rounded-full placeholder:text-ink-tertiary focus:outline-none focus:border-hairline-strong transition-colors duration-150"
                    />
                  </div>
                )}

                {/* Loading */}
                {roomsLoading && (
                  <p className="text-ink-tertiary text-[11px] font-mono uppercase tracking-widest py-8 text-center">
                    Loading rooms...
                  </p>
                )}

                {/* Error */}
                {!roomsLoading && roomsError && (
                  <div className="flex items-center gap-2 bg-surface-1 border border-hairline px-4 py-3 rounded-lg">
                    <div className="w-1 h-1 rounded-full bg-red-500/70" />
                    <p className="text-[13px] text-ink-muted">{roomsError}</p>
                  </div>
                )}

                {/* Empty state */}
                {!roomsLoading && !roomsError && rooms.length === 0 && (
                  <div className="border border-dashed border-hairline rounded-xl p-12 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-surface-1 border border-hairline flex items-center justify-center">
                      <Plus
                        size={18}
                        strokeWidth={2}
                        className="text-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-ink text-[15px] font-medium">
                        No rooms yet
                      </p>
                      <p className="text-[13px] text-ink-subtle max-w-xs">
                        Create your first interview room to start collaborating.
                      </p>
                    </div>
                    <button
                      onClick={function () {
                        setShowCreateModal(true);
                      }}
                      className="bg-primary hover:bg-primary-hover text-white text-[13px] font-medium px-4 py-2 rounded-full transition-colors duration-150 mt-2"
                    >
                      Create your first room
                    </button>
                  </div>
                )}

                {/* No search results */}
                {!roomsLoading &&
                  !roomsError &&
                  rooms.length > 0 &&
                  filteredRooms.length === 0 && (
                    <p className="text-ink-tertiary text-[13px] py-8 text-center">
                      No rooms match "{searchQuery}".
                    </p>
                  )}

                {/* Rooms list */}
                {!roomsLoading && !roomsError && filteredRooms.length > 0 && (
                  <div className="border border-hairline rounded-xl overflow-hidden bg-surface-1">
                    {filteredRooms.map(function (room, idx) {
                      const isCopied = copiedRoomId === room.id;
                      const active = isRoomActive(room.created_at);
                      return (
                        <div
                          key={room.id}
                          onClick={function () {
                            navigate("/room/" + room.share_link);
                          }}
                          className={
                            "group flex items-center gap-4 px-5 py-4 hover:bg-surface-2 cursor-pointer transition-colors duration-150 " +
                            (idx !== filteredRooms.length - 1
                              ? "border-b border-hairline"
                              : "")
                          }
                        >
                          <div className="flex-shrink-0">
                            <div
                              className={
                                "w-2 h-2 rounded-full " +
                                (active
                                  ? "bg-semantic-success"
                                  : "bg-ink-tertiary")
                              }
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5">
                              <h3 className="text-ink text-[14px] font-medium truncate">
                                {room.name}
                              </h3>
                              <span className="bg-surface-2 text-ink-muted text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-hairline flex-shrink-0">
                                {room.language}
                              </span>
                            </div>
                            <p className="text-[12px] text-ink-tertiary font-mono mt-1">
                              {formatRelativeDate(room.created_at)}
                              {!active && (
                                <span className="text-red-500/60">
                                  {" "}
                                  · expired
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <button
                              onClick={function (e) {
                                handleCopyLink(room.share_link, room.id, e);
                              }}
                              className="text-[11px] font-medium text-ink-subtle hover:text-ink px-2.5 py-1.5 rounded-full hover:bg-surface-3 transition-colors duration-150"
                            >
                              {isCopied ? "Copied ✓" : "Copy link"}
                            </button>
                            <button
                              onClick={function (e) {
                                handleDeleteClick(room, e);
                              }}
                              className="text-[11px] font-medium text-ink-subtle hover:text-red-400 px-2.5 py-1.5 rounded-full hover:bg-surface-3 transition-colors duration-150"
                            >
                              Delete
                            </button>
                          </div>

                          <ArrowRight
                            size={14}
                            strokeWidth={2}
                            className="text-ink-tertiary group-hover:text-ink transition-colors duration-150"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ────────── TAB: JOIN ────────── */}
            {activeTab === "join" && (
              <div className="max-w-[560px] mx-auto px-6 py-16">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-12 h-12 rounded-full bg-surface-1 border border-hairline flex items-center justify-center mb-4">
                    <LogIn size={18} strokeWidth={2} className="text-primary" />
                  </div>
                  <h2 className="text-[24px] font-semibold text-ink tracking-tight mb-2">
                    Join a room
                  </h2>
                  <p className="text-[13px] text-ink-subtle max-w-sm">
                    Paste an invite link shared by the host to join an interview
                    room.
                  </p>
                </div>

                <form
                  onSubmit={handleJoinRoom}
                  className="flex flex-col gap-2.5"
                >
                  <input
                    type="text"
                    value={joinLink}
                    onChange={function (e) {
                      setJoinLink(e.target.value);
                    }}
                    placeholder="Paste invite link or share code"
                    required
                    className="w-full bg-surface-1 border border-hairline text-ink text-[14px] px-4 py-3 rounded-full placeholder:text-ink-tertiary focus:outline-none focus:border-hairline-strong transition-colors duration-150 text-center"
                  />

                  <button
                    type="submit"
                    disabled={joinLoading}
                    className="w-full flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-[14px] font-medium py-3 rounded-full transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>{joinLoading ? "Joining..." : "Join room"}</span>
                    {!joinLoading && <ArrowRight size={14} strokeWidth={2.5} />}
                  </button>
                </form>

                <p className="mt-8 text-[12px] text-ink-tertiary text-center leading-relaxed">
                  Don't have an invite link?{" "}
                  <button
                    onClick={function () {
                      transitionTab("rooms");
                      setShowCreateModal(true);
                    }}
                    className="text-ink hover:text-primary transition-colors duration-150 font-medium"
                  >
                    Create your own room
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-9 flex items-center justify-between px-6 border-t border-hairline flex-shrink-0">
          <span className="text-[10px] font-mono text-ink-tertiary tracking-wider">
            v1.0.0
          </span>
          <span className="text-[10px] font-mono text-ink-tertiary tracking-wider">
            © {new Date().getFullYear()} Intervue
          </span>
        </div>
      </main>

      {/* Modals */}
      {showCreateModal && (
        <CreateRoomModal
          onClose={function () {
            setShowCreateModal(false);
          }}
          onRoomCreated={handleRoomCreated}
        />
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Delete Room"
        message={
          deleteTarget
            ? 'Delete "' +
              deleteTarget.name +
              '"?\n\nThis action cannot be undone. Participants will lose access to this room.'
            : ""
        }
        confirmLabel="Delete room"
        onConfirm={handleConfirmDelete}
        onClose={function () {
          setDeleteTarget(null);
        }}
        isLoading={deleteLoading}
      />
    </div>
  );
}

export default DashboardPage;
