import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Editor from "@monaco-editor/react";
import socket from "../lib/socket";
import useAuthStore from "../store/authStore";
import ChatPanel from "../components/ChatPanel";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";

const LANGUAGES = ["javascript", "python", "cpp", "c", "java", "typescript"];

function RoomPage() {
  const navigate = useNavigate();
  const { shareLink } = useParams();
  const user = useAuthStore(function (state) {
    return state.user;
  });

  const bindingRef = useRef(null);
  const providerRef = useRef(null);
  const ydocRef = useRef(null);

  const [editorInstance, setEditorInstance] = useState(null);
  const [language, setLanguage] = useState("javascript");

  const [problemStatement, setProblemStatement] = useState("");
  const [isEditingProblem, setIsEditingProblem] = useState(false);
  const [problemSaving, setProblemSaving] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [outputError, setOutputError] = useState("");

  const [room, setRoom] = useState(null);
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeUsers, setActiveUsers] = useState([]);

  const [copyStatus, setCopyStatus] = useState("copy link");

  // ── Chat state ──
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);

  const handleEditorMount = function (editor) {
    setEditorInstance(editor);
  };

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

  useEffect(function () {
    const fetchUser = async function () {
      if (user) return;
      try {
        const response = await api.get("/auth/me");
        const userData = response.data.data.user;
        const token = localStorage.getItem("token");
        useAuthStore.getState().setUser(userData, token);
      } catch (err) {
        console.log("Fetch user error:", err.message);
      }
    };
    fetchUser();
  }, []);

  useEffect(
    function () {
      if (room) {
        setLanguage(room.language);
        setProblemStatement(room.problem_statement || "");
      }
    },
    [room],
  );

  useEffect(
    function () {
      if (!user || !room) return;
      socket.connect();

      socket.on("connect", function () {
        console.log("✅ Connected to socket! ID:", socket.id);
        socket.emit("join-room", {
          shareLink: shareLink,
          username: user.username,
        });
      });

      socket.on("user-joined", function (data) {
        console.log(`📥 ${data.username} joined the room`);
      });

      socket.on("user-left", function (data) {
        console.log(`📤 ${data.username} left the room`);
      });

      socket.on("room-users", function (users) {
        setActiveUsers(users);
      });

      socket.on("problem-updated", function (data) {
        setProblemStatement(data.problem_statement);
        console.log("📝 Problem updated by host");
      });

      socket.on("disconnect", function () {
        console.log("❌ Disconnected from socket");
      });

      return function () {
        socket.emit("leave-room", {
          shareLink: shareLink,
          username: user.username,
        });
        socket.off("connect");
        socket.off("disconnect");
        socket.off("user-joined");
        socket.off("user-left");
        socket.off("room-users");
        socket.off("problem-updated");
        socket.disconnect();
        console.log("Socket cleaned up");
      };
    },
    [user, room, shareLink],
  );

  // ── Track incoming messages + unread count ──
  useEffect(
    function () {
      function handleIncoming(msg) {
        // Always store the message
        setMessages(function (prev) {
          return [...prev, msg];
        });
        // Only increment unread if panel is closed and it's not my own message
        if (!isChatOpen && msg.username !== user?.username) {
          setUnreadCount(function (prev) {
            return prev + 1;
          });
        }
      }
      socket.on("chat:received", handleIncoming);
      return function () {
        socket.off("chat:received", handleIncoming);
      };
    },
    [isChatOpen, user],
  );

  useEffect(
    function () {
      if (!room || !editorInstance) return;

      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      const provider = new WebsocketProvider(
        "ws://localhost:1234",
        shareLink,
        ydoc,
      );
      providerRef.current = provider;

      if (user) {
        provider.awareness.setLocalStateField("user", {
          name: user.username,
          color: getUserColor(user.username),
        });
      }

      const ytext = ydoc.getText("monaco");

      const binding = new MonacoBinding(
        ytext,
        editorInstance.getModel(),
        new Set([editorInstance]),
        provider.awareness,
      );
      bindingRef.current = binding;

      provider.on("sync", function (isSynced) {
        if (isSynced && ytext.length === 0) {
          const starterCode = getStarterCode(room.language);
          ytext.insert(0, starterCode);
          console.log("📝 Seeded starter code");
        }
      });

      console.log("✅ Yjs collaboration active");

      return function () {
        binding.destroy();
        provider.destroy();
        ydoc.destroy();
        console.log("🧹 Yjs cleaned up");
      };
    },
    [room, shareLink, editorInstance, user],
  );

  function getStarterCode(lang) {
    const starters = {
      javascript:
        "// Write your JavaScript code here\nconsole.log('Hello, Intervue!');",
      python: "# Write your Python code here\nprint('Hello, Intervue!')",
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello, Intervue!" << endl;\n  return 0;\n}',
      c: '#include <stdio.h>\n\nint main() {\n  printf("Hello, Intervue!\\n");\n  return 0;\n}',
      java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, Intervue!");\n  }\n}',
      typescript:
        "// Write your TypeScript code here\nconst greeting: string = 'Hello, Intervue!';\nconsole.log(greeting);",
    };
    return starters[lang] || "";
  }

  function getUserColor(username) {
    const colors = [
      "#EF4444",
      "#F59E0B",
      "#10B981",
      "#3B82F6",
      "#8B5CF6",
      "#EC4899",
      "#14B8A6",
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  const handleSaveProblem = async function () {
    setProblemSaving(true);
    try {
      await api.patch("/rooms/" + shareLink + "/problem", {
        problem_statement: problemStatement,
      });

      socket.emit("problem-updated", {
        shareLink: shareLink,
        problem_statement: problemStatement,
      });

      setIsEditingProblem(false);
    } catch (err) {
      console.log("Save problem error:", err.message);
      alert("Failed to save problem. Try again.");
    } finally {
      setProblemSaving(false);
    }
  };

  const handleRunCode = async function () {
    setIsRunning(true);
    setOutput("");
    setOutputError("");

    const currentCode = editorInstance ? editorInstance.getValue() : "";

    try {
      const response = await api.post("/execute", {
        language: language,
        code: currentCode,
      });
      const result = response.data.data;
      setOutput(result.output);
    } catch (err) {
      console.log("Run code error:", err.message);
      if (err.response && err.response.data && err.response.data.message) {
        setOutputError(err.response.data.message);
      } else {
        setOutputError("Failed to run code. Try again.");
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyLink = function () {
    const fullLink = window.location.href;
    navigator.clipboard.writeText(fullLink);
    setCopyStatus("copied ✓");
    setTimeout(function () {
      setCopyStatus("copy link");
    }, 2000);
  };

  const handleToggleChat = function () {
    setIsChatOpen(function (prev) {
      const next = !prev;
      if (next) setUnreadCount(0);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading room...</p>
      </div>
    );
  }

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
    <div className="h-screen bg-white flex flex-col relative">
      <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-6">
          <span className="text-black text-xl font-semibold">Intervue</span>
          <span className="text-gray-300">|</span>
          <span className="text-black text-sm">{room.name}</span>
          <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
            {role}
          </span>

          <div className="flex -space-x-2">
            {activeUsers.map(function (u, i) {
              return (
                <div
                  key={i}
                  title={u.username}
                  className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold border-2 border-white uppercase"
                >
                  {u.username.substring(0, 2)}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={handleToggleChat}
            className="relative text-gray-500 text-sm font-semibold hover:text-black transition-colors"
          >
            chat
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-3 min-w-[16px] h-4 px-1 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={handleCopyLink}
            className="text-gray-500 text-sm font-semibold hover:text-black transition-colors"
          >
            {copyStatus}
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

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
            <select
              value={language}
              onChange={function (e) {
                setLanguage(e.target.value);
              }}
              className="text-xs text-black uppercase tracking-wider font-medium bg-white cursor-pointer hover:text-gray-500 transition-colors"
            >
              {LANGUAGES.map(function (lang) {
                return (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                );
              })}
            </select>

            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="h-8 px-4 bg-black text-white text-xs font-semibold rounded-full hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? "Running..." : "Run code"}
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={language}
              onMount={handleEditorMount}
              theme="vs"
              options={{
                fontSize: 14,
                fontFamily: "'Fira Code', 'Consolas', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                lineNumbers: "on",
                renderLineHighlight: "none",
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
              }}
            />
          </div>
        </div>

        <div className="w-[400px] flex flex-col">
          <div className="flex-1 border-b border-gray-200 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Problem
              </p>
              {role === "host" && !isEditingProblem && (
                <button
                  onClick={function () {
                    setIsEditingProblem(true);
                  }}
                  className="text-xs text-gray-500 font-semibold hover:text-black transition-colors"
                >
                  {problemStatement ? "edit" : "+ add"}
                </button>
              )}
              {role === "host" && isEditingProblem && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={function () {
                      setProblemStatement(room.problem_statement || "");
                      setIsEditingProblem(false);
                    }}
                    className="text-xs text-gray-500 font-semibold hover:text-black transition-colors"
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleSaveProblem}
                    disabled={problemSaving}
                    className="h-7 px-3 bg-black text-white text-xs font-semibold rounded-full hover:bg-gray-900 transition-colors disabled:opacity-50"
                  >
                    {problemSaving ? "..." : "save"}
                  </button>
                </div>
              )}
            </div>

            {isEditingProblem ? (
              <textarea
                value={problemStatement}
                onChange={function (e) {
                  setProblemStatement(e.target.value);
                }}
                placeholder="Type the problem statement here..."
                autoFocus
                rows={12}
                className="w-full text-sm text-black bg-white border border-gray-200 p-3 resize-none focus:border-black transition-colors font-mono"
              />
            ) : problemStatement ? (
              <pre className="text-sm text-black whitespace-pre-wrap break-words font-sans">
                {problemStatement}
              </pre>
            ) : (
              <p className="text-gray-400 text-sm">
                {role === "host"
                  ? "No problem yet. Click + add to write one."
                  : "The host has not set a problem yet."}
              </p>
            )}
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4">
              Output
            </p>
            {isRunning && (
              <p className="text-gray-400 text-sm">Running your code...</p>
            )}
            {!isRunning && outputError && (
              <p className="text-sm text-black bg-gray-100 px-4 py-3 rounded-lg">
                {outputError}
              </p>
            )}
            {!isRunning && !outputError && output && (
              <pre className="text-sm text-black font-mono whitespace-pre-wrap break-words">
                {output}
              </pre>
            )}
            {!isRunning && !outputError && !output && (
              <p className="text-gray-400 text-sm">
                Run your code to see output.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Chat Drawer — floating on top ── */}
      {isChatOpen && (
        <ChatPanel
          shareLink={shareLink}
          username={user?.username}
          messages={messages}
          onClose={handleToggleChat}
        />
      )}
    </div>
  );
}

export default RoomPage;
