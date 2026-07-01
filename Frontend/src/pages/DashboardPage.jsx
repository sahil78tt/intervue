import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import useAuthStore from "../store/authStore";

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

  // NEW — rooms state
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState("");

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

  // NEW — Fetch rooms on load
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

            <button className="h-10 px-6 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-colors">
              + New room
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 mb-8"></div>

          {/* Rooms list — 3 possible states */}

          {/* State 1: Loading rooms */}
          {roomsLoading && (
            <p className="text-gray-400 text-sm py-16 text-center">
              Loading rooms...
            </p>
          )}

          {/* State 2: Error loading rooms */}
          {!roomsLoading && roomsError && (
            <p className="text-black text-sm bg-gray-100 px-4 py-3 rounded-lg">
              {roomsError}
            </p>
          )}

          {/* State 3: No rooms yet */}
          {!roomsLoading && !roomsError && rooms.length === 0 && (
            <p className="text-gray-400 text-sm py-16 text-center">
              No rooms yet. Create your first room to get started.
            </p>
          )}

          {/* State 4: Show rooms */}
          {!roomsLoading && !roomsError && rooms.length > 0 && (
            <div className="flex flex-col">
              {rooms.map(function (room) {
                return (
                  <div
                    key={room.id}
                    className="flex items-center justify-between py-6 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer px-4 -mx-4"
                  >
                    <div className="flex flex-col gap-2">
                      {/* Room name */}
                      <h3 className="text-black text-lg font-normal">
                        {room.name}
                      </h3>

                      {/* Meta info — uppercase eyebrow style */}
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

                    {/* Arrow */}
                    <span className="text-gray-400 text-xl">→</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
