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

// Pretty labels for languages
const LANGUAGE_LABELS = {
  javascript: "JavaScript",
  python: "Python",
  cpp: "C++",
  c: "C",
  java: "Java",
  typescript: "TypeScript",
};

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
  const [syncStatus, setSyncStatus] = useState("connecting"); // connecting | synced

  const [problemStatement, setProblemStatement] = useState("");
  const [isEditingProblem, setIsEditingProblem] = useState(false);
  const [problemSaving, setProblemSaving] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [outputError, setOutputError] = useState("");
  const [lastRunMeta, setLastRunMeta] = useState(null); // { execTime, memory }

  const [room, setRoom] = useState(null);
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeUsers, setActiveUsers] = useState([]);

  const [copyStatus, setCopyStatus] = useState("Invite");

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);

  // Sidebar tabs: "problem" | "output" | "chat"
  const [activeTab, setActiveTab] = useState("problem");

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
        // Increment unread only if chat tab isn't currently open AND it's not from me
        if (activeTab !== "chat" && msg.username !== user?.username) {
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
    [activeTab, user],
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
        if (isSynced) setSyncStatus("synced");
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
        setSyncStatus("connecting");
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
    setLastRunMeta(null);
    setActiveTab("output"); // Auto-jump to output tab

    const currentCode = editorInstance ? editorInstance.getValue() : "";
    const startTime = Date.now();

    try {
      const response = await api.post("/execute", {
        language: language,
        code: currentCode,
      });
      const result = response.data.data;
      setOutput(result.output);
      // Fake metadata for now — Judge0 migration would give real values
      setLastRunMeta({
        execTime: Date.now() - startTime + " ms",
        memory: "—",
      });
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
    setCopyStatus("Copied ✓");
    setTimeout(function () {
      setCopyStatus("Invite");
    }, 2000);
  };

  const handleTabChange = function (tab) {
    setActiveTab(tab);
    if (tab === "chat") setUnreadCount(0);
  };

  const handleHint = function () {
    // Stub for AI Hint feature — will wire in Phase B
    alert("AI Hint coming soon! (Phase B feature)");
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
          Loading room...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6">
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
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* ═══════════════════════════════════════════ */}
      {/* NAVBAR                                       */}
      {/* ═══════════════════════════════════════════ */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-white/5 flex-shrink-0 bg-zinc-950">
        {/* Left cluster — brand + context */}
        <div className="flex items-center gap-5">
          {/* Brand */}
          <button
            onClick={function () {
              navigate("/dashboard");
            }}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500/60 group-hover:bg-emerald-500 transition-colors duration-150" />
            <span className="text-zinc-100 text-base font-medium tracking-tight group-hover:text-white transition-colors duration-150">
              Intervue
            </span>
          </button>

          <div className="h-6 w-px bg-white/10" />

          {/* Room context */}
          <div className="flex flex-col leading-none">
            <span className="text-zinc-100 text-sm font-light">
              {room.name}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                {LANGUAGE_LABELS[room.language] || room.language}
              </span>
              <span className="text-zinc-700">·</span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                {role}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* Active users */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {activeUsers.slice(0, 4).map(function (u, i) {
                return (
                  <div
                    key={i}
                    title={
                      u.username +
                      (u.username === user?.username ? " (you)" : "")
                    }
                    className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-100 flex items-center justify-center text-[9px] font-mono border border-zinc-950 uppercase cursor-default"
                  >
                    {u.username.substring(0, 2)}
                  </div>
                );
              })}
              {activeUsers.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center text-[9px] font-mono border border-zinc-950">
                  +{activeUsers.length - 4}
                </div>
              )}
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              {activeUsers.length} online
            </span>
          </div>
        </div>

        {/* Right cluster — actions */}
        <div className="flex items-center gap-2">
          {/* AI Hint */}
          <button
            onClick={handleHint}
            className="text-xs font-mono text-zinc-500 uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/10 hover:text-zinc-100 hover:bg-white/5 transition-colors duration-150"
          >
            Hint ✦
          </button>

          {/* Invite */}
          <button
            onClick={handleCopyLink}
            className="text-xs font-mono text-zinc-500 uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/10 hover:text-zinc-100 hover:bg-white/5 transition-colors duration-150"
          >
            {copyStatus}
          </button>

          <div className="h-6 w-px bg-white/10 mx-1" />

          {/* Run — primary action */}
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-2 text-xs font-medium tracking-widest text-zinc-950 uppercase bg-zinc-100 hover:bg-white px-4 py-1.5 rounded-full transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? "Running..." : "Run"}
            {!isRunning && <span className="text-[10px]">▶</span>}
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════ */}
      {/* BODY                                         */}
      {/* ═══════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT — Editor ── */}
        <div className="flex-1 flex flex-col border-r border-white/5 overflow-hidden bg-zinc-900/30">
          {/* Editor toolbar */}
          <div className="h-10 flex items-center justify-between px-5 border-b border-white/5 flex-shrink-0 bg-zinc-950">
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                Editor
              </span>

              <div className="h-4 w-px bg-white/10" />

              <select
                value={language}
                onChange={function (e) {
                  setLanguage(e.target.value);
                }}
                className="text-xs text-zinc-300 bg-transparent cursor-pointer hover:text-zinc-100 transition-colors duration-150 appearance-none font-light"
              >
                {LANGUAGES.map(function (lang) {
                  return (
                    <option key={lang} value={lang} className="bg-zinc-900">
                      {LANGUAGE_LABELS[lang]}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Sync status */}
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  syncStatus === "synced"
                    ? "bg-emerald-500/60"
                    : "bg-zinc-600 animate-pulse"
                }`}
              />
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                {syncStatus === "synced" ? "Synced" : "Connecting..."}
              </span>
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
                padding: { top: 20 },
                lineNumbers: "on",
                renderLineHighlight: "line",
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* ── RIGHT — Tabbed Sidebar ── */}
        <div className="w-[420px] flex flex-col bg-zinc-950 flex-shrink-0">
          {/* Tab bar */}
          <div className="h-10 flex items-center border-b border-white/5 flex-shrink-0 px-2">
            <TabButton
              active={activeTab === "problem"}
              onClick={function () {
                handleTabChange("problem");
              }}
            >
              Problem
            </TabButton>

            <TabButton
              active={activeTab === "output"}
              onClick={function () {
                handleTabChange("output");
              }}
            >
              Output
            </TabButton>

            <TabButton
              active={activeTab === "chat"}
              onClick={function () {
                handleTabChange("chat");
              }}
              badge={unreadCount > 0 ? unreadCount : null}
            >
              Chat
            </TabButton>
          </div>

          {/* ── Tab content ── */}

          {/* PROBLEM TAB */}
          {activeTab === "problem" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header row */}
              <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                    Problem
                  </span>
                  {!isEditingProblem && problemStatement && (
                    <h2 className="text-zinc-100 text-lg font-light tracking-tight leading-tight">
                      {getProblemTitle(problemStatement)}
                    </h2>
                  )}
                </div>

                {role === "host" && !isEditingProblem && (
                  <button
                    onClick={function () {
                      setIsEditingProblem(true);
                    }}
                    className="text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-zinc-100 transition-colors duration-150"
                  >
                    {problemStatement ? "Edit →" : "+ Add"}
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
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProblem}
                      disabled={problemSaving}
                      className="text-xs font-normal tracking-widest text-zinc-100 uppercase border border-white/10 bg-white/5 px-3 py-1 rounded-full hover:bg-white/10 transition-colors duration-150 disabled:opacity-40"
                    >
                      {problemSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </div>

              <div className="h-px bg-white/5 flex-shrink-0" />

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {isEditingProblem ? (
                  <textarea
                    value={problemStatement}
                    onChange={function (e) {
                      setProblemStatement(e.target.value);
                    }}
                    placeholder="Type the problem statement here..."
                    autoFocus
                    className="w-full h-full min-h-[300px] text-sm text-zinc-100 bg-zinc-900 border border-white/10 p-4 resize-none focus:border-white/20 transition-colors duration-150 font-mono rounded-lg leading-relaxed"
                  />
                ) : problemStatement ? (
                  <pre className="text-sm text-zinc-400 whitespace-pre-wrap break-words font-sans leading-relaxed">
                    {getProblemBody(problemStatement)}
                  </pre>
                ) : (
                  <div className="flex flex-col gap-2 py-8">
                    <p className="text-zinc-400 text-sm font-light">
                      No problem has been set.
                    </p>
                    <p className="text-zinc-600 text-xs font-mono">
                      {role === "host"
                        ? "Click + Add to write one."
                        : "The host will share the problem soon."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OUTPUT TAB */}
          {activeTab === "output" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-5 py-4 flex-shrink-0">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                  Output
                </span>
              </div>

              <div className="h-px bg-white/5 flex-shrink-0" />

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* Running */}
                {isRunning && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      stdout
                    </span>
                    <p className="text-sm text-zinc-400 font-mono">
                      Running {LANGUAGE_LABELS[language]}...
                    </p>
                  </div>
                )}

                {/* Error */}
                {!isRunning && outputError && (
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Error
                    </span>
                    <p className="text-sm text-zinc-300 bg-zinc-900 border border-white/10 px-4 py-3 rounded-lg font-mono whitespace-pre-wrap">
                      {outputError}
                    </p>
                  </div>
                )}

                {/* Success */}
                {!isRunning && !outputError && output && (
                  <div className="flex flex-col gap-5">
                    {/* Status pill */}
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                      <span className="text-[10px] font-mono text-emerald-500/80 uppercase tracking-widest">
                        Accepted
                      </span>
                    </div>

                    {/* stdout block */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                        stdout
                      </span>
                      <pre className="text-sm text-zinc-300 font-mono whitespace-pre-wrap break-words leading-relaxed bg-zinc-900 border border-white/10 rounded-lg p-4">
                        {output}
                      </pre>
                    </div>

                    {/* Meta blocks */}
                    {lastRunMeta && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1 border border-white/10 rounded-lg p-3">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                            Execution
                          </span>
                          <span className="text-sm text-zinc-100 font-light">
                            {lastRunMeta.execTime}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 border border-white/10 rounded-lg p-3">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                            Memory
                          </span>
                          <span className="text-sm text-zinc-100 font-light">
                            {lastRunMeta.memory}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Empty */}
                {!isRunning && !outputError && !output && (
                  <div className="flex flex-col gap-2 py-4">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      stdout
                    </span>
                    <p className="text-zinc-600 text-sm font-mono">
                      Run your code to see output.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CHAT TAB */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <ChatPanelInline
                shareLink={shareLink}
                username={user?.username}
                messages={messages}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════ */
/* Helper components                                   */
/* ══════════════════════════════════════════════════ */

// Tab button — reusable
function TabButton({ active, onClick, children, badge }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors duration-150 ${
        active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
      {badge !== null && badge !== undefined && (
        <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-zinc-100 text-zinc-950 text-[9px] font-bold">
          {badge}
        </span>
      )}
      {active && (
        <div className="absolute bottom-0 left-2 right-2 h-px bg-zinc-100" />
      )}
    </button>
  );
}

// Extract problem title (first line) and body (rest)
function getProblemTitle(text) {
  const lines = text.trim().split("\n");
  return lines[0] || "Untitled";
}

function getProblemBody(text) {
  const lines = text.trim().split("\n");
  if (lines.length <= 1) return "";
  return lines.slice(1).join("\n").trim();
}

// Inline chat panel — same logic as ChatPanel but embedded in sidebar
function ChatPanelInline({ shareLink, username, messages }) {
  const [inputText, setInputText] = useState("");
  const bottomRef = useRef(null);

  useEffect(
    function () {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
      }
    },
    [messages],
  );

  function handleSend() {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    socket.emit("chat:send", {
      shareLink: shareLink,
      username: username,
      message: trimmed,
    });
    setInputText("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getInitial(name) {
    return name ? name.substring(0, 2).toUpperCase() : "?";
  }

  return (
    <>
      <div className="px-5 py-4 flex-shrink-0">
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          Chat
        </span>
      </div>

      <div className="h-px bg-white/5 flex-shrink-0" />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-zinc-600 text-xs font-mono">
            No messages yet. Say hello.
          </p>
        )}

        {messages.map(function (msg) {
          const isMe = msg.username === username;
          return (
            <div key={msg.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-100 flex items-center justify-center text-[8px] font-mono uppercase flex-shrink-0">
                  {getInitial(msg.username)}
                </div>
                <span className="text-xs text-zinc-100 font-medium">
                  {isMe ? "you" : msg.username}
                </span>
                <span className="text-[10px] font-mono text-zinc-600 ml-auto">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <p className="ml-7 text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap break-words">
                {msg.message}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5 flex-shrink-0">
        <textarea
          rows={2}
          value={inputText}
          onChange={function (e) {
            setInputText(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="w-full text-sm text-zinc-100 placeholder-zinc-600 bg-zinc-900 border border-white/10 rounded-lg p-3 resize-none focus:border-white/20 transition-colors duration-150 font-mono mb-2"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="text-xs font-normal tracking-widest text-zinc-100 uppercase border border-white/10 bg-white/5 px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors duration-150 disabled:opacity-30"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}

export default RoomPage;
