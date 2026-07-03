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

  useEffect(
    function () {
      function handleIncoming(msg) {
        setMessages(function (prev) {
          return [...prev, msg];
        });
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
          Loading room...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6">
        <p className="text-zinc-400 text-sm font-mono">{error}</p>
        <button
          onClick={function () {
            navigate("/dashboard");
          }}
          className="text-xs font-normal tracking-widest text-zinc-100 uppercase border border-white/10 bg-white/5 px-6 py-3 rounded-full hover:bg-white/10 transition-colors duration-150"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col relative">
      {/* ── Navbar ── */}
      <header className="h-12 flex items-center justify-between px-5 border-b border-white/5 flex-shrink-0 bg-zinc-950">
        {/* Left */}
        <div className="flex items-center gap-4">
          <button
            onClick={function () {
              navigate("/dashboard");
            }}
            className="text-zinc-100 text-xs font-normal tracking-widest uppercase hover:text-zinc-400 transition-colors duration-150"
          >
            Intervue
          </button>

          <div className="h-px w-4 bg-white/10" />

          <span className="text-zinc-500 text-xs font-mono truncate max-w-[160px]">
            {room.name}
          </span>

          <span className="text-xs font-mono text-zinc-600 border border-white/10 px-2 py-0.5 rounded-full">
            {role}
          </span>

          {/* Active users */}
          <div className="flex -space-x-1.5 ml-2">
            {activeUsers.map(function (u, i) {
              return (
                <div
                  key={i}
                  title={u.username}
                  className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-100 flex items-center justify-center text-[8px] font-mono border border-zinc-950 uppercase"
                >
                  {u.username.substring(0, 2)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Chat */}
          <div className="relative">
            <button
              onClick={handleToggleChat}
              className={`text-xs font-mono uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors duration-150 ${
                isChatOpen
                  ? "border-white/20 text-zinc-100 bg-white/5"
                  : "border-white/10 text-zinc-500 hover:text-zinc-100 hover:bg-white/5"
              }`}
            >
              chat
            </button>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-zinc-100 text-zinc-950 text-[8px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className="text-xs font-mono text-zinc-500 uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/10 hover:text-zinc-100 hover:bg-white/5 transition-colors duration-150"
          >
            {copyStatus}
          </button>

          {/* Run */}
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="text-xs font-normal tracking-widest text-zinc-100 uppercase border border-white/10 bg-white/5 px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? "Running..." : "Run"}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT — Editor ── */}
        <div className="flex-1 flex flex-col border-r border-white/5 overflow-hidden">
          {/* Editor toolbar */}
          <div className="h-9 flex items-center justify-between px-4 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
                Editor
              </span>
              <div className="h-px w-4 bg-white/10" />
              <select
                value={language}
                onChange={function (e) {
                  setLanguage(e.target.value);
                }}
                className="text-xs font-mono text-zinc-400 bg-transparent cursor-pointer hover:text-zinc-100 transition-colors duration-150 appearance-none uppercase tracking-widest"
              >
                {LANGUAGES.map(function (lang) {
                  return (
                    <option
                      key={lang}
                      value={lang}
                      className="bg-zinc-900 normal-case"
                    >
                      {lang}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Monaco */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={language}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily:
                  "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                lineNumbers: "on",
                renderLineHighlight: "line",
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* ── RIGHT — Problem + Output ── */}
        <div className="w-[400px] flex flex-col bg-zinc-950">
          {/* Problem panel */}
          <div className="flex-1 border-b border-white/5 flex flex-col overflow-hidden">
            <div className="h-9 flex items-center justify-between px-4 border-b border-white/5 flex-shrink-0">
              <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
                Problem
              </span>

              {role === "host" && !isEditingProblem && (
                <button
                  onClick={function () {
                    setIsEditingProblem(true);
                  }}
                  className="text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-zinc-100 transition-colors duration-150"
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
                    className="text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-zinc-100 transition-colors duration-150"
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleSaveProblem}
                    disabled={problemSaving}
                    className="text-xs font-normal tracking-widest text-zinc-100 uppercase border border-white/10 bg-white/5 px-3 py-1 rounded-full hover:bg-white/10 transition-colors duration-150 disabled:opacity-40"
                  >
                    {problemSaving ? "..." : "save"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isEditingProblem ? (
                <textarea
                  value={problemStatement}
                  onChange={function (e) {
                    setProblemStatement(e.target.value);
                  }}
                  placeholder="Type the problem statement here..."
                  autoFocus
                  rows={12}
                  className="w-full text-sm text-zinc-100 bg-transparent border border-white/10 p-3 resize-none focus:border-white/20 transition-colors duration-150 font-mono rounded-lg"
                />
              ) : problemStatement ? (
                <pre className="text-sm text-zinc-400 whitespace-pre-wrap break-words font-sans leading-relaxed">
                  {problemStatement}
                </pre>
              ) : (
                <p className="text-zinc-600 text-xs font-mono uppercase tracking-widest">
                  {role === "host"
                    ? "No problem yet. Click + add to write one."
                    : "The host has not set a problem yet."}
                </p>
              )}
            </div>
          </div>

          {/* Output panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-9 flex items-center px-4 border-b border-white/5 flex-shrink-0">
              <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
                Output
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isRunning && (
                <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
                  Running your code...
                </p>
              )}
              {!isRunning && outputError && (
                <p className="text-xs text-zinc-400 bg-zinc-900 border border-white/10 px-4 py-3 rounded-lg font-mono">
                  {outputError}
                </p>
              )}
              {!isRunning && !outputError && output && (
                <pre className="text-sm text-zinc-400 font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {output}
                </pre>
              )}
              {!isRunning && !outputError && !output && (
                <p className="text-zinc-600 text-xs font-mono uppercase tracking-widest">
                  Run your code to see output.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat */}
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
