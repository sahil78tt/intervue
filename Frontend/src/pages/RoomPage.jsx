import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Editor from "@monaco-editor/react";
import socket from "../lib/socket";
import useAuthStore from "../store/authStore";
import VideoOverlay from "../components/VideoOverlay";
import useWebRTC from "../hooks/useWebRTC";
import HintModal from "../components/HintModal";
import { toastSuccess, toastError } from "../lib/toast";
import Dropdown from "../components/Dropdown";

import {
  FileText,
  MessageSquare,
  Users,
  Sparkles,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Play,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";

const LANGUAGES = ["javascript", "python", "cpp", "c", "java", "typescript"];

const LANGUAGE_LABELS = {
  javascript: "JavaScript",
  python: "Python",
  cpp: "C++",
  c: "C",
  java: "Java",
  typescript: "TypeScript",
};

const LANGUAGE_OPTIONS = LANGUAGES.map(function (lang) {
  return {
    value: lang,
    label: LANGUAGE_LABELS[lang],
  };
});

function RoomPage() {
  var navigate = useNavigate();
  var { shareLink } = useParams();
  var user = useAuthStore(function (state) {
    return state.user;
  });

  var bindingRef = useRef(null);
  var providerRef = useRef(null);
  var ydocRef = useRef(null);
  var drawerRef = useRef(null);
  var isDraggingRef = useRef(false);

  var [editorInstance, setEditorInstance] = useState(null);
  var [language, setLanguage] = useState("javascript");
  var [syncStatus, setSyncStatus] = useState("connecting");

  var [problemStatement, setProblemStatement] = useState("");
  var [isEditingProblem, setIsEditingProblem] = useState(false);
  var [problemSaving, setProblemSaving] = useState(false);

  var [isRunning, setIsRunning] = useState(false);
  var [output, setOutput] = useState("");
  var [outputError, setOutputError] = useState("");
  var [lastRunMeta, setLastRunMeta] = useState(null);

  var [room, setRoom] = useState(null);
  var [role, setRole] = useState("");
  var [isLoading, setIsLoading] = useState(true);
  var [error, setError] = useState("");
  var [activeUsers, setActiveUsers] = useState([]);

  var [copyStatus, setCopyStatus] = useState("Invite");

  var [messages, setMessages] = useState([]);
  var [chatInput, setChatInput] = useState("");
  var [unreadCount, setUnreadCount] = useState(0);

  var [isHintOpen, setIsHintOpen] = useState(false);
  var [hint, setHint] = useState("");
  var [hintLoading, setHintLoading] = useState(false);
  var [hintError, setHintError] = useState("");

  var [activePanel, setActivePanel] = useState("problem");
  var [drawerHeight, setDrawerHeight] = useState(32);
  var [drawerOpen, setDrawerOpen] = useState(false);
  var [focusMode, setFocusMode] = useState(false);

  var chatBottomRef = useRef(null);

  var {
    localStream,
    remoteStream,
    isMicOn,
    isCameraOn,
    callStatus,
    toggleMic,
    toggleCamera,
    leaveCall,
  } = useWebRTC(shareLink, user?.username);

  var remoteUsername =
    activeUsers.find(function (u) {
      return u.username !== user?.username;
    })?.username || "Interviewer";

  function handleEditorMount(editor) {
    setEditorInstance(editor);
  }

  useEffect(
    function () {
      async function fetchRoom() {
        try {
          var response = await api.get("/rooms/" + shareLink);
          setRoom(response.data.data.room);
          setRole(response.data.data.role);
        } catch (err) {
          console.log("Fetch room error:", err.message);
          if (err.response?.data?.message) {
            setError(err.response.data.message);
          } else {
            setError("Failed to load room.");
          }
        } finally {
          setIsLoading(false);
        }
      }
      fetchRoom();
    },
    [shareLink],
  );

  useEffect(function () {
    async function fetchUser() {
      if (user) return;
      try {
        var response = await api.get("/auth/me");
        var userData = response.data.data.user;
        var token = localStorage.getItem("token");
        useAuthStore.getState().setUser(userData, token);
      } catch (err) {
        console.log("Fetch user error:", err.message);
      }
    }
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
        socket.emit("join-room", {
          shareLink: shareLink,
          username: user.username,
        });
      });

      socket.on("room-users", function (users) {
        setActiveUsers(users);
      });

      socket.on("problem-updated", function (data) {
        setProblemStatement(data.problem_statement);
      });

      return function () {
        socket.emit("leave-room", {
          shareLink: shareLink,
          username: user.username,
        });
        socket.off("connect");
        socket.off("room-users");
        socket.off("problem-updated");
        socket.disconnect();
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
        if (activePanel !== "chat" && msg.username !== user?.username) {
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
    [activePanel, user],
  );

  useEffect(
    function () {
      if (activePanel === "chat" && chatBottomRef.current) {
        chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
      }
    },
    [messages, activePanel],
  );

  useEffect(
    function () {
      if (!room || !editorInstance) return;
      var ydoc = new Y.Doc();
      ydocRef.current = ydoc;
      var provider = new WebsocketProvider(
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

      var ytext = ydoc.getText("monaco");
      var binding = new MonacoBinding(
        ytext,
        editorInstance.getModel(),
        new Set([editorInstance]),
        provider.awareness,
      );
      bindingRef.current = binding;

      provider.on("sync", function (isSynced) {
        if (isSynced) setSyncStatus("synced");
        if (isSynced && ytext.length === 0) {
          var starterCode = getStarterCode(room.language);
          ytext.insert(0, starterCode);
        }
      });

      return function () {
        binding.destroy();
        provider.destroy();
        ydoc.destroy();
        setSyncStatus("connecting");
      };
    },
    [room, shareLink, editorInstance, user],
  );

  function getStarterCode(lang) {
    var starters = {
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
    var colors = [
      "#EF4444",
      "#F59E0B",
      "#10B981",
      "#3B82F6",
      "#8B5CF6",
      "#EC4899",
      "#14B8A6",
    ];
    var hash = 0;
    for (var i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  async function handleSaveProblem() {
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
      toastSuccess("PROBLEM SAVED", "All participants updated.");
    } catch (err) {
      toastError("SAVE FAILED", "Could not update problem. Try again.");
    } finally {
      setProblemSaving(false);
    }
  }

  async function handleRunCode() {
    setIsRunning(true);
    setOutput("");
    setOutputError("");
    setLastRunMeta(null);
    setDrawerOpen(true);
    setDrawerHeight(240);

    var currentCode = editorInstance ? editorInstance.getValue() : "";
    var startTime = Date.now();

    try {
      var response = await api.post("/execute", {
        language: language,
        code: currentCode,
      });
      var result = response.data.data;
      setOutput(result.output);
      setLastRunMeta({ execTime: Date.now() - startTime + " ms", memory: "—" });
    } catch (err) {
      var errorMsg =
        err.response?.data?.message || "Failed to run code. Try again.";
      setOutputError(errorMsg);
      toastError("EXECUTION FAILED", errorMsg);
    } finally {
      setIsRunning(false);
    }
  }

  function handleCopyLink() {
    var fullLink = window.location.href;
    navigator.clipboard.writeText(fullLink);
    setCopyStatus("Copied ✓");
    toastSuccess("LINK COPIED", "Ready to share with participants.");
    setTimeout(function () {
      setCopyStatus("Invite");
    }, 2000);
  }

  function togglePanel(panel) {
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
      if (panel === "chat") setUnreadCount(0);
    }
    setFocusMode(false);
  }

  function toggleDrawer() {
    if (drawerOpen) {
      setDrawerOpen(false);
      setDrawerHeight(32);
    } else {
      setDrawerOpen(true);
      setDrawerHeight(240);
    }
  }

  function toggleFocusMode() {
    if (focusMode) {
      setFocusMode(false);
      setActivePanel("problem");
    } else {
      setFocusMode(true);
      setActivePanel(null);
      setDrawerOpen(false);
      setDrawerHeight(32);
    }
  }

  async function handleHint() {
    setIsHintOpen(true);
    setHintLoading(true);
    setHint("");
    setHintError("");
    var currentCode = editorInstance ? editorInstance.getValue() : "";
    try {
      var response = await api.post("/hint", {
        problem_statement: problemStatement,
        code: currentCode,
        language: language,
      });
      setHint(response.data.data.hint);
    } catch (err) {
      if (err.response?.data?.message) {
        setHintError(err.response.data.message);
      } else {
        setHintError("Failed to get hint. Try again.");
      }
    } finally {
      setHintLoading(false);
    }
  }

  function handleSendChat() {
    var trimmed = chatInput.trim();
    if (!trimmed) return;
    socket.emit("chat:send", {
      shareLink: shareLink,
      username: user?.username,
      message: trimmed,
    });
    setChatInput("");
  }

  function handleChatKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  }

  function startDragDrawer(e) {
    isDraggingRef.current = true;
    e.preventDefault();

    function onMove(ev) {
      if (!isDraggingRef.current) return;
      var newHeight = window.innerHeight - ev.clientY - 48;
      if (newHeight < 60) newHeight = 32;
      if (newHeight > 500) newHeight = 500;
      setDrawerHeight(newHeight);
      setDrawerOpen(newHeight > 60);
    }

    function onUp() {
      isDraggingRef.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-canvas flex items-center justify-center font-sans">
        <p className="text-ink-tertiary text-[11px] font-medium uppercase tracking-widest">
          Loading room...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-canvas flex flex-col items-center justify-center gap-6 font-sans">
        <p className="text-ink-muted text-[14px]">{error}</p>
        <button
          onClick={function () {
            navigate("/dashboard");
          }}
          className="flex-shrink-0 hover:opacity-80 transition-opacity duration-150"
        >
          <span className="text-ink text-[15px] font-semibold tracking-tight">
            Intervue<span className="text-primary">.</span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-canvas flex flex-col overflow-hidden font-sans">
      {/* ═══════════════════════════ TOP BAR ═══════════════════════════ */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-hairline flex-shrink-0 bg-canvas z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={function () {
              navigate("/dashboard");
            }}
            className="flex-shrink-0 hover:opacity-80 transition-opacity duration-150"
          >
            <span className="text-ink text-[15px] font-semibold tracking-tight">
              Intervue<span className="text-primary">.</span>
            </span>
          </button>

          <div className="w-px h-5 bg-hairline flex-shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] text-ink font-medium truncate">
              {room.name}
            </span>
            <span className="bg-surface-2 text-ink-muted text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border border-hairline flex-shrink-0">
              {LANGUAGE_LABELS[room.language] || room.language}
            </span>
            <span className="bg-surface-2 text-ink-muted text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border border-hairline flex-shrink-0">
              {role}
            </span>
          </div>

          <div className="w-px h-5 bg-hairline flex-shrink-0" />

          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {activeUsers.slice(0, 3).map(function (u, i) {
                return (
                  <div
                    key={i}
                    title={
                      u.username +
                      (u.username === user?.username ? " (you)" : "")
                    }
                    className="w-6 h-6 rounded-full bg-surface-3 border border-canvas flex items-center justify-center text-[9px] font-medium text-ink-muted uppercase"
                  >
                    {u.username.substring(0, 2)}
                  </div>
                );
              })}
              {activeUsers.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-surface-3 border border-canvas flex items-center justify-center text-[9px] font-medium text-ink-tertiary">
                  +{activeUsers.length - 3}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-semantic-success animate-pulse" />
              <span className="text-[11px] text-ink-tertiary font-medium">
                {activeUsers.length} online
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleCopyLink}
            className="text-[12px] font-medium text-ink-subtle hover:text-ink px-3 py-1.5 rounded-full hover:bg-surface-1 transition-colors duration-150"
          >
            {copyStatus}
          </button>

          <button
            onClick={toggleFocusMode}
            className={
              "text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors duration-150 " +
              (focusMode
                ? "bg-primary/20 text-primary"
                : "text-ink-subtle hover:text-ink hover:bg-surface-1")
            }
          >
            {focusMode ? "Exit focus" : "Focus mode"}
          </button>

          <div className="w-px h-5 bg-hairline mx-1" />

          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-[12px] font-medium px-4 py-1.5 rounded-full transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? "Running..." : "Run"}
            {!isRunning && <Play size={12} strokeWidth={2.5} />}
          </button>
        </div>
      </header>

      {/* ═══════════════════════════ MAIN BODY ═══════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ────────── ICON RAIL (48px) ────────── */}
        <aside className="w-12 flex-shrink-0 border-r border-hairline bg-canvas flex flex-col items-center py-3 z-20">
          <div className="flex flex-col gap-1 flex-1">
            <RailButton
              icon={<FileText size={16} />}
              label="Problem"
              active={activePanel === "problem"}
              onClick={function () {
                togglePanel("problem");
              }}
            />
            <RailButton
              icon={<MessageSquare size={16} />}
              label="Chat"
              active={activePanel === "chat"}
              badge={unreadCount > 0 ? unreadCount : null}
              onClick={function () {
                togglePanel("chat");
              }}
            />
            <RailButton
              icon={<Users size={16} />}
              label="People"
              active={activePanel === "people"}
              onClick={function () {
                togglePanel("people");
              }}
            />
            <RailButton
              icon={<Sparkles size={16} />}
              label="AI Hint"
              onClick={handleHint}
            />
          </div>

          {localStream && (
            <div className="flex flex-col gap-1 pt-2 border-t border-hairline w-full items-center">
              <RailButton
                icon={isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
                label={isMicOn ? "Mute" : "Unmute"}
                onClick={toggleMic}
                active={!isMicOn}
              />
              <RailButton
                icon={isCameraOn ? <Video size={16} /> : <VideoOff size={16} />}
                label={isCameraOn ? "Turn off cam" : "Turn on cam"}
                onClick={toggleCamera}
                active={!isCameraOn}
              />
              <RailButton
                icon={<PhoneOff size={16} />}
                label="Leave call"
                onClick={leaveCall}
                danger
              />
            </div>
          )}
        </aside>

        {/* ────────── EDITOR + CONSOLE COLUMN ────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="h-9 flex items-center justify-between px-4 border-b border-hairline flex-shrink-0 bg-surface-1">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-ink-tertiary uppercase tracking-widest">
                Editor
              </span>
              <div className="w-px h-3 bg-hairline" />
            </div>
            <Dropdown
              value={language}
              options={LANGUAGE_OPTIONS}
              onChange={function (newLang) {
                setLanguage(newLang);
              }}
            />
            <div className="flex items-center gap-1.5">
              <div
                className={
                  "w-1.5 h-1.5 rounded-full " +
                  (syncStatus === "synced"
                    ? "bg-semantic-success"
                    : "bg-ink-tertiary animate-pulse")
                }
              />
              <span className="text-[10px] font-medium text-ink-tertiary uppercase tracking-widest">
                {syncStatus === "synced" ? "Synced" : "Connecting..."}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
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

            <VideoOverlay
              localStream={localStream}
              remoteStream={remoteStream}
              isMicOn={isMicOn}
              isCameraOn={isCameraOn}
              callStatus={callStatus}
              username={user?.username}
              remoteUsername={remoteUsername}
            />
          </div>

          {/* ────────── BOTTOM CONSOLE DRAWER ────────── */}
          <div
            ref={drawerRef}
            className="flex flex-col flex-shrink-0 border-t border-hairline bg-surface-1 relative"
            style={{
              height: drawerHeight + "px",
              transition: isDraggingRef.current
                ? "none"
                : "height 0.2s ease-out",
            }}
          >
            <div
              onMouseDown={startDragDrawer}
              className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-primary/30 transition-colors duration-150 z-10"
            />

            <div className="h-8 flex items-center justify-between px-4 border-b border-hairline flex-shrink-0">
              <button
                onClick={toggleDrawer}
                className="flex items-center gap-2 text-[11px] font-medium text-ink-subtle hover:text-ink transition-colors duration-150"
              >
                {drawerOpen ? (
                  <ChevronDown size={12} strokeWidth={2.5} />
                ) : (
                  <ChevronUp size={12} strokeWidth={2.5} />
                )}
                <span className="uppercase tracking-widest">Console</span>
                {output && !drawerOpen && (
                  <span className="w-1 h-1 rounded-full bg-semantic-success" />
                )}
              </button>

              {drawerOpen && (
                <div className="flex items-center gap-2">
                  {lastRunMeta && (
                    <span className="text-[10px] font-mono text-ink-tertiary">
                      {lastRunMeta.execTime}
                    </span>
                  )}
                  <button
                    onClick={function () {
                      setOutput("");
                      setOutputError("");
                      setLastRunMeta(null);
                    }}
                    className="text-[10px] font-medium text-ink-tertiary hover:text-ink uppercase tracking-widest transition-colors duration-150"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {drawerOpen && (
              <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[12px]">
                {isRunning && (
                  <p className="text-ink-subtle">
                    <span className="text-ink-tertiary">$</span> Running{" "}
                    {LANGUAGE_LABELS[language]}...
                  </p>
                )}

                {!isRunning && outputError && (
                  <div>
                    <p className="text-red-400/80 mb-1">
                      <span className="text-ink-tertiary">$</span> Error
                    </p>
                    <pre className="text-ink-muted whitespace-pre-wrap">
                      {outputError}
                    </pre>
                  </div>
                )}

                {!isRunning && !outputError && output && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-1 rounded-full bg-semantic-success" />
                      <span className="text-[10px] text-semantic-success uppercase tracking-widest">
                        Success
                      </span>
                    </div>
                    <pre className="text-ink whitespace-pre-wrap break-words leading-relaxed">
                      {output}
                    </pre>
                  </div>
                )}

                {!isRunning && !outputError && !output && (
                  <p className="text-ink-tertiary">
                    <span className="text-ink-tertiary">$</span> Run your code
                    to see output.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ────────── RIGHT CONTEXTUAL PANEL ────────── */}
        {activePanel && (
          <aside
            className="w-[340px] flex-shrink-0 border-l border-hairline bg-surface-1 flex flex-col overflow-hidden"
            style={{ animation: "slideIn 0.2s ease-out" }}
          >
            <div className="h-9 flex items-center justify-between px-4 border-b border-hairline flex-shrink-0">
              <span className="text-[11px] font-medium text-ink uppercase tracking-widest">
                {activePanel === "problem" && "Problem"}
                {activePanel === "chat" && "Chat"}
                {activePanel === "people" && "People"}
              </span>
              <button
                onClick={function () {
                  setActivePanel(null);
                }}
                className="text-ink-tertiary hover:text-ink w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-2 transition-colors duration-150"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            {/* ──── PROBLEM PANEL ──── */}
            {activePanel === "problem" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between flex-shrink-0">
                  {!isEditingProblem && problemStatement && (
                    <h2 className="text-ink text-[14px] font-medium truncate flex-1 mr-2">
                      {getProblemTitle(problemStatement)}
                    </h2>
                  )}
                  {role === "host" && !isEditingProblem && (
                    <button
                      onClick={function () {
                        setIsEditingProblem(true);
                      }}
                      className="text-[11px] font-medium text-ink-subtle hover:text-ink px-2 py-1 rounded-full hover:bg-surface-2 transition-colors duration-150 flex-shrink-0"
                    >
                      {problemStatement ? "Edit" : "+ Add"}
                    </button>
                  )}
                  {role === "host" && isEditingProblem && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={function () {
                          setProblemStatement(room.problem_statement || "");
                          setIsEditingProblem(false);
                        }}
                        className="text-[11px] font-medium text-ink-subtle hover:text-ink px-2 py-1 rounded-full transition-colors duration-150"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProblem}
                        disabled={problemSaving}
                        className="text-[11px] font-medium text-white bg-primary hover:bg-primary-hover px-3 py-1 rounded-full transition-colors duration-150 disabled:opacity-40"
                      >
                        {problemSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-px bg-hairline flex-shrink-0" />

                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {isEditingProblem ? (
                    <textarea
                      value={problemStatement}
                      onChange={function (e) {
                        setProblemStatement(e.target.value);
                      }}
                      placeholder="Type the problem statement here..."
                      autoFocus
                      className="w-full h-full min-h-[300px] text-[13px] text-ink bg-surface-2 border border-hairline p-3 resize-none focus:outline-none focus:border-hairline-strong transition-colors duration-150 rounded-lg leading-relaxed placeholder:text-ink-tertiary"
                    />
                  ) : problemStatement ? (
                    <pre className="text-[13px] text-ink-muted whitespace-pre-wrap break-words font-sans leading-relaxed">
                      {getProblemBody(problemStatement)}
                    </pre>
                  ) : (
                    <div className="flex flex-col gap-1.5 py-8">
                      <p className="text-ink text-[13px] font-medium">
                        No problem set.
                      </p>
                      <p className="text-ink-tertiary text-[12px]">
                        {role === "host"
                          ? "Click + Add to write the problem statement."
                          : "The host will share the problem soon."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ──── CHAT PANEL ──── */}
            {activePanel === "chat" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-ink-tertiary text-[12px] text-center py-8">
                      No messages yet. Say hello.
                    </p>
                  )}
                  {messages.map(function (msg) {
                    var isMe = msg.username === user?.username;
                    return (
                      <div key={msg.id} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-surface-3 border border-hairline flex items-center justify-center text-[8px] font-medium uppercase text-ink-muted flex-shrink-0">
                            {msg.username.substring(0, 2)}
                          </div>
                          <span className="text-[12px] text-ink font-medium">
                            {isMe ? "you" : msg.username}
                          </span>
                          <span className="text-[10px] text-ink-tertiary ml-auto">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="ml-7 text-[13px] text-ink-muted leading-relaxed whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                <div className="p-3 border-t border-hairline flex-shrink-0">
                  <textarea
                    rows={2}
                    value={chatInput}
                    onChange={function (e) {
                      setChatInput(e.target.value);
                    }}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Type a message..."
                    className="w-full text-[13px] text-ink bg-surface-2 border border-hairline rounded-lg p-2.5 resize-none focus:outline-none focus:border-hairline-strong transition-colors duration-150 placeholder:text-ink-tertiary font-sans mb-2"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSendChat}
                      disabled={!chatInput.trim()}
                      className="bg-primary hover:bg-primary-hover text-white text-[12px] font-medium px-4 py-1.5 rounded-full transition-colors duration-150 disabled:opacity-40"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ──── PEOPLE PANEL ──── */}
            {activePanel === "people" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  {activeUsers.map(function (u, i) {
                    var isYou = u.username === user?.username;
                    return (
                      <div
                        key={i}
                        className={
                          "flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2 transition-colors duration-150 " +
                          (i !== activeUsers.length - 1
                            ? "border-b border-hairline"
                            : "")
                        }
                      >
                        <div className="w-7 h-7 rounded-full bg-surface-3 border border-hairline flex items-center justify-center text-[10px] font-medium uppercase text-ink-muted flex-shrink-0">
                          {u.username.substring(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] text-ink font-medium truncate">
                              {u.username}
                            </span>
                            {isYou && (
                              <span className="text-[10px] text-ink-tertiary font-medium">
                                (you)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-semantic-success flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      <HintModal
        isOpen={isHintOpen}
        isLoading={hintLoading}
        hint={hint}
        error={hintError}
        onClose={function () {
          setIsHintOpen(false);
        }}
        onRegenerate={handleHint}
      />

      <style>
        {
          "\n        @keyframes slideIn {\n          from { transform: translateX(20px); opacity: 0; }\n          to { transform: translateX(0); opacity: 1; }\n        }\n      "
        }
      </style>
    </div>
  );
}

function RailButton({ icon, label, active, onClick, badge, danger }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={
        "relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-150 " +
        (danger
          ? "text-red-400/80 hover:bg-red-500/10 hover:text-red-400"
          : active
            ? "bg-surface-2 text-ink"
            : "text-ink-subtle hover:bg-surface-1 hover:text-ink")
      }
    >
      {icon}
      {active && !danger && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full" />
      )}
      {badge !== null && badge !== undefined && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

function getProblemTitle(text) {
  var lines = text.trim().split("\n");
  return lines[0] || "Untitled";
}

function getProblemBody(text) {
  var lines = text.trim().split("\n");
  if (lines.length <= 1) return "";
  return lines.slice(1).join("\n").trim();
}

export default RoomPage;
